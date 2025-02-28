import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateSlot } from "@/lib/validators"
import { ObjectId } from "mongodb"

// GET available slots with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const hubId = searchParams.get("hubId")
    const date = searchParams.get("date")
    const type = searchParams.get("type") || "all" // pickup, delivery, all

    logger.info("Fetching available slots", { hubId, date, type })

    if (!hubId) {
      logger.warn("Missing hubId parameter")
      return NextResponse.json({ error: "hubId parameter is required" }, { status: 400 })
    }

    if (!date) {
      logger.warn("Missing date parameter")
      return NextResponse.json({ error: "date parameter is required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if hub exists
    const hub = await db.collection("hubs").findOne({ _id: new ObjectId(hubId) })

    if (!hub) {
      logger.warn("Hub not found", { hubId })
      return NextResponse.json({ error: "Hub not found" }, { status: 404 })
    }

    // Build query for slots
    const query: any = {
      hubId,
      date: new Date(date).toISOString().split("T")[0],
    }

    if (type !== "all") {
      query.type = type
    }

    // Get slots for the specified date and hub
    const slots = await db.collection("slots").find(query).sort({ startTime: 1 }).toArray()

    logger.info("Slots fetched successfully", { count: slots.length })

    return NextResponse.json({ data: slots })
  } catch (error) {
    logger.error("Error fetching slots", { error })
    return NextResponse.json({ error: "Failed to fetch slots" }, { status: 500 })
  }
}

// POST create or update slots for a hub and date
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating/updating slots", { body })

    // Validate required fields
    if (!body.hubId || !body.date || !body.slots) {
      logger.warn("Missing required fields", { body })
      return NextResponse.json({ error: "hubId, date, and slots are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if hub exists
    const hub = await db.collection("hubs").findOne({ _id: new ObjectId(body.hubId) })

    if (!hub) {
      logger.warn("Hub not found", { hubId: body.hubId })
      return NextResponse.json({ error: "Hub not found" }, { status: 404 })
    }

    // Format date to YYYY-MM-DD
    const formattedDate = new Date(body.date).toISOString().split("T")[0]

    // Validate each slot
    const validSlots = []
    const invalidSlots = []

    for (const slot of body.slots) {
      const validationResult = validateSlot({
        ...slot,
        hubId: body.hubId,
        date: formattedDate,
      })

      if (validationResult.success) {
        validSlots.push({
          ...slot,
          hubId: body.hubId,
          date: formattedDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      } else {
        invalidSlots.push({
          slot,
          errors: validationResult.errors,
        })
      }
    }

    if (validSlots.length === 0) {
      logger.warn("No valid slots provided", { invalidSlots })
      return NextResponse.json({ error: "No valid slots provided", details: invalidSlots }, { status: 400 })
    }

    // Delete existing slots for the hub and date
    await db.collection("slots").deleteMany({
      hubId: body.hubId,
      date: formattedDate,
    })

    // Insert new slots
    const result = await db.collection("slots").insertMany(validSlots)

    logger.info("Slots created/updated successfully", {
      hubId: body.hubId,
      date: formattedDate,
      count: validSlots.length,
      invalidCount: invalidSlots.length,
    })

    return NextResponse.json({
      message: "Slots created/updated successfully",
      data: {
        validSlots: validSlots.length,
        invalidSlots: invalidSlots.length > 0 ? invalidSlots : undefined,
      },
    })
  } catch (error) {
    logger.error("Error creating/updating slots", { error })
    return NextResponse.json({ error: "Failed to create/update slots" }, { status: 500 })
  }
}

