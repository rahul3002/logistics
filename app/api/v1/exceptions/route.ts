import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { handleException } from "@/lib/exceptions"
import { ObjectId } from "mongodb"

// POST create and handle an exception
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating exception", { body })

    // Validate required fields
    if (!body.appointmentId || !body.type || !body.description) {
      logger.warn("Missing required fields", { body })
      return NextResponse.json({ error: "appointmentId, type, and description are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if appointment exists
    const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(body.appointmentId) })

    if (!appointment) {
      logger.warn("Appointment not found", { appointmentId: body.appointmentId })
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Create exception record
    const exception = {
      appointmentId: body.appointmentId,
      type: body.type,
      description: body.description,
      severity: body.severity || "medium",
      status: "open",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("exceptions").insertOne(exception)

    // Handle exception based on type
    const handlingResult = await handleException({
      exception: {
        ...exception,
        _id: result.insertedId,
      },
      appointment,
      db,
    })

    // Update exception with handling result
    await db.collection("exceptions").updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: handlingResult.status,
          resolution: handlingResult.resolution,
          handledAt: handlingResult.handledAt,
          updatedAt: new Date(),
        },
      },
    )

    logger.info("Exception processed", {
      id: result.insertedId,
      status: handlingResult.status,
    })

    return NextResponse.json({
      message: "Exception processed",
      data: {
        exceptionId: result.insertedId,
        status: handlingResult.status,
        resolution: handlingResult.resolution,
      },
    })
  } catch (error) {
    logger.error("Error processing exception", { error })
    return NextResponse.json({ error: "Failed to process exception" }, { status: 500 })
  }
}

