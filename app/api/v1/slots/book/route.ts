import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { ObjectId } from "mongodb"

// POST book a slot
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Booking slot", { body })

    // Validate required fields
    if (!body.slotId || !body.appointmentId) {
      logger.warn("Missing required fields", { body })
      return NextResponse.json({ error: "slotId and appointmentId are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if slot exists and is available
    const slot = await db.collection("slots").findOne({ _id: new ObjectId(body.slotId) })

    if (!slot) {
      logger.warn("Slot not found", { slotId: body.slotId })
      return NextResponse.json({ error: "Slot not found" }, { status: 404 })
    }

    if (slot.availableCapacity <= 0) {
      logger.warn("Slot is fully booked", { slotId: body.slotId })
      return NextResponse.json({ error: "Slot is fully booked" }, { status: 409 })
    }

    // Check if appointment exists
    const appointment = await db.collection("appointments").findOne({ _id: new ObjectId(body.appointmentId) })

    if (!appointment) {
      logger.warn("Appointment not found", { appointmentId: body.appointmentId })
      return NextResponse.json({ error: "Appointment not found" }, { status: 404 })
    }

    // Check if appointment already has a booked slot
    const existingBooking = await db.collection("slotBookings").findOne({ appointmentId: body.appointmentId })

    if (existingBooking) {
      logger.warn("Appointment already has a booked slot", {
        appointmentId: body.appointmentId,
        existingSlotId: existingBooking.slotId,
      })
      return NextResponse.json({ error: "Appointment already has a booked slot" }, { status: 409 })
    }

    // Create booking
    const booking = {
      slotId: body.slotId,
      appointmentId: body.appointmentId,
      hubId: slot.hubId,
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      type: slot.type,
      status: "confirmed",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const bookingResult = await db.collection("slotBookings").insertOne(booking)

    // Update slot availability
    await db.collection("slots").updateOne(
      { _id: new ObjectId(body.slotId) },
      {
        $inc: { availableCapacity: -1 },
        $set: { updatedAt: new Date() },
      },
    )

    // Update hub capacity
    await db.collection("hubCapacity").updateOne(
      { hubId: slot.hubId },
      {
        $inc: { currentUtilization: 1 },
        $set: { lastUpdated: new Date() },
      },
    )

    // Update appointment with slot information
    await db.collection("appointments").updateOne(
      { _id: new ObjectId(body.appointmentId) },
      {
        $set: {
          slotId: body.slotId,
          scheduledTime: `${slot.date}T${slot.startTime}`,
          updatedAt: new Date(),
        },
      },
    )

    logger.info("Slot booked successfully", {
      slotId: body.slotId,
      appointmentId: body.appointmentId,
    })

    return NextResponse.json({
      message: "Slot booked successfully",
      data: {
        bookingId: bookingResult.insertedId,
        booking,
      },
    })
  } catch (error) {
    logger.error("Error booking slot", { error })
    return NextResponse.json({ error: "Failed to book slot" }, { status: 500 })
  }
}

