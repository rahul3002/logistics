import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateVehicle } from "@/lib/validators"

// GET all vehicles with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const type = searchParams.get("type")
    const status = searchParams.get("status")

    const skip = (page - 1) * limit

    logger.info("Fetching vehicles", { page, limit, type, status })

    const { db } = await connectToDatabase()

    // Build query based on filters
    const query: any = {}
    if (type) query.type = type
    if (status) query.status = status

    const vehicles = await db
      .collection("vehicles")
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ registrationNumber: 1 })
      .toArray()

    const total = await db.collection("vehicles").countDocuments(query)

    logger.info("Vehicles fetched successfully", { count: vehicles.length, total })

    return NextResponse.json({
      data: vehicles,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Error fetching vehicles", { error })
    return NextResponse.json({ error: "Failed to fetch vehicles" }, { status: 500 })
  }
}

// POST create a new vehicle
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new vehicle", { body })

    // Validate vehicle data
    const validationResult = validateVehicle(body)
    if (!validationResult.success) {
      logger.warn("Vehicle validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid vehicle data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if vehicle with same registration number already exists
    const existingVehicle = await db.collection("vehicles").findOne({ registrationNumber: body.registrationNumber })

    if (existingVehicle) {
      logger.warn("Vehicle with registration number already exists", { registrationNumber: body.registrationNumber })
      return NextResponse.json({ error: "Vehicle with this registration number already exists" }, { status: 409 })
    }

    // Create vehicle with timestamps
    const vehicle = {
      ...body,
      status: body.status || "available",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("vehicles").insertOne(vehicle)

    logger.info("Vehicle created successfully", { id: result.insertedId })

    return NextResponse.json(
      {
        message: "Vehicle created successfully",
        id: result.insertedId,
        vehicle,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error creating vehicle", { error })
    return NextResponse.json({ error: "Failed to create vehicle" }, { status: 500 })
  }
}

