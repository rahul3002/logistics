import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateAppointmentUpdate } from "@/lib/validators"
import { ObjectId } from "mongodb"

// GET a specific appointment by ID
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    logger.info("Fetching appointment by ID", { id })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid appointment ID format", { id })
      return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(id) })

    if (!appointment) {
      logger.warn("Appointment not found", { id })
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    logger.info("Appointment fetched successfully", { id })

    return NextResponse.json({ data: appointment })
  } catch (error) {
    logger.error("Error fetching appointment", { id: params.id, error })
    return NextResponse.json({ error: "Failed to fetch appointment" }, { status: 500 })
  }
}

// PUT update an appointment
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    logger.info("Updating appointment", { id, body })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid appointment ID format", { id })
      return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 })
    }

    // Validate update data
    const validationResult = validateAppointmentUpdate(body)
    if (!validationResult.success) {
      logger.warn("Appointment update validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid appointment data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if appointment exists
    const existingAppointment = await db.collection("appointments").findOne({ _id: new ObjectId(id) })

    if (!existingAppointment) {
      logger.warn("Appointment not found for update", { id })
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Update appointment with timestamp
    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    const result = await db.collection("appointments").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    logger.info("Appointment updated successfully", { id, modifiedCount: result.modifiedCount })

    return NextResponse.json({
      message: "Appointment updated successfully",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    logger.error("Error updating appointment", { id: params.id, error })
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }
}

// DELETE an appointment
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id

    logger.info("Deleting appointment", { id })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid appointment ID format", { id })
      return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if appointment exists
    const existingAppointment = await db.collection("appointments").findOne({ _id: new ObjectId(id) })

    if (!existingAppointment) {
      logger.warn("Appointment not found for deletion", { id })
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    const result = await db.collection("appointments").deleteOne({ _id: new ObjectId(id) })

    logger.info("Appointment deleted successfully", { id, deletedCount: result.deletedCount })

    return NextResponse.json({
      message: "Appointment deleted successfully",
      deletedCount: result.deletedCount,
    })
  } catch (error) {
    logger.error("Error deleting appointment", { id: params.id, error })
    return NextResponse.json({ error: "Failed to delete appointment" }, { status: 500 })
  }
}

// PATCH partially update an appointment (e.g., status change)
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = params.id
    const body = await request.json()

    logger.info("Partially updating appointment", { id, body })

    if (!ObjectId.isValid(id)) {
      logger.warn("Invalid appointment ID format", { id })
      return NextResponse.json({ error: "Invalid appointment ID format" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if appointment exists
    const existingAppointment = await db.collection("appointments").findOne({ _id: new ObjectId(id) })

    if (!existingAppointment) {
      logger.warn("Appointment not found for partial update", { id })
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Update appointment with timestamp
    const updateData = {
      ...body,
      updatedAt: new Date(),
    }

    const result = await db.collection("appointments").updateOne({ _id: new ObjectId(id) }, { $set: updateData })

    logger.info("Appointment partially updated successfully", { id, modifiedCount: result.modifiedCount })

    return NextResponse.json({
      message: "Appointment updated successfully",
      modifiedCount: result.modifiedCount,
    })
  } catch (error) {
    logger.error("Error partially updating appointment", { id: params.id, error })
    return NextResponse.json({ error: "Failed to update appointment" }, { status: 500 })
  }
}

