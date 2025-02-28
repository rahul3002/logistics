import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { ObjectId } from "mongodb"

// GET hub capacity information
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    logger.info("Fetching hub capacity", { id })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid hub ID format", { id })
      return NextResponse.json({ error: "Invalid hub ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const hub = await db.collection("hubs").findOne({ _id: new ObjectId(id) })

    if (!hub) {
      logger.warn("Hub not found", { id })
      return NextResponse.json({ error: "Hub not found" }, { status: 404 })
    }

    // Get current capacity information
    const capacityInfo = await db.collection("hubCapacity").findOne({ hubId: id })

    if (!capacityInfo) {
      logger.warn("Hub capacity information not found", { id })
      return NextResponse.json({
        data: {
          hubId: id,
          totalCapacity: hub.totalCapacity || 0,
          currentUtilization: 0,
          utilizationPercentage: 0,
          availableSlots: hub.totalCapacity || 0,
          lastUpdated: new Date(),
        },
      })
    }

    logger.info("Hub capacity fetched successfully", { id })

    return NextResponse.json({ data: capacityInfo })
  } catch (error) {
    logger.error("Error fetching hub capacity", { id: params.id, error })
    return NextResponse.json({ error: "Failed to fetch hub capacity" }, { status: 500 })
  }
}

// PUT update hub capacity
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    logger.info("Updating hub capacity", { id, body })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid hub ID format", { id })
      return NextResponse.json({ error: "Invalid hub ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if hub exists
    const hub = await db.collection("hubs").findOne({ _id: new ObjectId(id) })

    if (!hub) {
      logger.warn("Hub not found", { id })
      return NextResponse.json({ error: "Hub not found" }, { status: 404 })
    }

    // Validate capacity data
    if (body.currentUtilization < 0) {
      logger.warn("Invalid currentUtilization value", { currentUtilization: body.currentUtilization })
      return NextResponse.json({ error: "Current utilization cannot be negative" }, { status: 400 })
    }

    const totalCapacity = hub.totalCapacity || body.totalCapacity || 0
    const currentUtilization = body.currentUtilization || 0

    if (currentUtilization > totalCapacity) {
      logger.warn("Current utilization exceeds total capacity", {
        currentUtilization,
        totalCapacity,
      })
      return NextResponse.json({ error: "Current utilization cannot exceed total capacity" }, { status: 400 })
    }

    // Calculate utilization percentage and available slots
    const utilizationPercentage = totalCapacity > 0 ? (currentUtilization / totalCapacity) * 100 : 0

    const availableSlots = totalCapacity - currentUtilization

    // Update capacity information
    const capacityInfo = {
      hubId: id,
      totalCapacity,
      currentUtilization,
      utilizationPercentage,
      availableSlots,
      lastUpdated: new Date(),
    }

    const result = await db.collection("hubCapacity").updateOne({ hubId: id }, { $set: capacityInfo }, { upsert: true })

    logger.info("Hub capacity updated successfully", {
      id,
      upserted: result.upsertedCount > 0,
      modified: result.modifiedCount > 0,
    })

    return NextResponse.json({
      message: "Hub capacity updated successfully",
      data: capacityInfo,
    })
  } catch (error) {
    logger.error("Error updating hub capacity", { id: params.id, error })
    return NextResponse.json({ error: "Failed to update hub capacity" }, { status: 500 })
  }
}

