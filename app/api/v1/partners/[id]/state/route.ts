import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { ObjectId } from "mongodb"

// GET partner service state
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    logger.info("Fetching partner service state", { id })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid partner ID format", { id })
      return NextResponse.json({ error: "Invalid partner ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const partner = await db.collection("partners").findOne({ _id: new ObjectId(id) })

    if (!partner) {
      logger.warn("Partner not found", { id })
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    // Get current service state
    const serviceState = await db.collection("partnerServiceStates").findOne({ partnerId: id })

    if (!serviceState) {
      logger.warn("Partner service state not found", { id })
      return NextResponse.json({
        partnerId: id,
        status: "unknown",
        availability: "unknown",
        lastUpdated: null,
      })
    }

    logger.info("Partner service state fetched successfully", { id })

    return NextResponse.json({ data: serviceState })
  } catch (error) {
    logger.error("Error fetching partner service state", { id: params.id, error })
    return NextResponse.json({ error: "Failed to fetch partner service state" }, { status: 500 })
  }
}

// PUT update partner service state
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    logger.info("Updating partner service state", { id, body })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid partner ID format", { id })
      return NextResponse.json({ error: "Invalid partner ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if partner exists
    const partner = await db.collection("partners").findOne({ _id: new ObjectId(id) })

    if (!partner) {
      logger.warn("Partner not found", { id })
      return NextResponse.json({ error: "Partner not found" }, { status: 404 })
    }

    // Validate state data
    if (!body.status || !["active", "inactive", "busy", "maintenance"].includes(body.status)) {
      logger.warn("Invalid status value", { status: body.status })
      return NextResponse.json(
        { error: "Invalid status value. Must be one of: active, inactive, busy, maintenance" },
        { status: 400 },
      )
    }

    if (!body.availability || !["available", "unavailable", "limited"].includes(body.availability)) {
      logger.warn("Invalid availability value", { availability: body.availability })
      return NextResponse.json(
        { error: "Invalid availability value. Must be one of: available, unavailable, limited" },
        { status: 400 },
      )
    }

    // Update or create service state
    const serviceState = {
      partnerId: id,
      status: body.status,
      availability: body.availability,
      capacity: body.capacity || 100, // Percentage of capacity available
      currentLoad: body.currentLoad || 0,
      lastUpdated: new Date(),
      notes: body.notes || "",
    }

    const result = await db
      .collection("partnerServiceStates")
      .updateOne({ partnerId: id }, { $set: serviceState }, { upsert: true })

    logger.info("Partner service state updated successfully", {
      id,
      upserted: result.upsertedCount > 0,
      modified: result.modifiedCount > 0,
    })

    return NextResponse.json({
      message: "Partner service state updated successfully",
      data: serviceState,
    })
  } catch (error) {
    logger.error("Error updating partner service state", { id: params.id, error })
    return NextResponse.json({ error: "Failed to update partner service state" }, { status: 500 })
  }
}

