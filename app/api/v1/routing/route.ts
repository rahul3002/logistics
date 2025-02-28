import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { calculateOptimalRoute } from "@/lib/routing"
import { ObjectId } from "mongodb"

// POST calculate optimal route for deliveries
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Calculating optimal route", { body })

    // Validate required fields
    if (!body.vehicleId || !body.deliveries || !body.startLocation) {
      logger.warn("Missing required fields", { body })
      return NextResponse.json({ error: "vehicleId, deliveries, and startLocation are required" }, { status: 400 })
    }

    if (!Array.isArray(body.deliveries) || body.deliveries.length === 0) {
      logger.warn("Deliveries must be a non-empty array", { deliveries: body.deliveries })
      return NextResponse.json({ error: "Deliveries must be a non-empty array" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if vehicle exists
    const vehicle = await db.collection("vehicles").findOne({ _id: new ObjectId(body.vehicleId) })

    if (!vehicle) {
      logger.warn("Vehicle not found", { vehicleId: body.vehicleId })
      return NextResponse.json({ error: "Vehicle not found" }, { status: 404 })
    }

    // Get delivery details
    const deliveryIds = body.deliveries.map((d) => d.appointmentId)
    const appointments = await db
      .collection("appointments")
      .find({ _id: { $in: deliveryIds.map((id) => new ObjectId(id)) } })
      .toArray()

    if (appointments.length !== deliveryIds.length) {
      logger.warn("Some appointments not found", {
        requested: deliveryIds.length,
        found: appointments.length,
      })
      return NextResponse.json({ error: "Some appointments not found" }, { status: 404 })
    }

    // Calculate optimal route
    const route = calculateOptimalRoute({
      vehicle,
      deliveries: appointments,
      startLocation: body.startLocation,
      endLocation: body.endLocation || body.startLocation,
      constraints: body.constraints || {},
    })

    // Save route for reference
    const routeRecord = {
      vehicleId: body.vehicleId,
      startLocation: body.startLocation,
      endLocation: body.endLocation || body.startLocation,
      deliveries: route.deliveries,
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      createdAt: new Date(),
    }

    await db.collection("routes").insertOne(routeRecord)

    logger.info("Route calculated successfully", {
      vehicleId: body.vehicleId,
      deliveryCount: route.deliveries.length,
      totalDistance: route.totalDistance,
    })

    return NextResponse.json({
      data: route,
    })
  } catch (error) {
    logger.error("Error calculating route", { error })
    return NextResponse.json({ error: "Failed to calculate route" }, { status: 500 })
  }
}

