import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateAppointment } from "@/lib/validators"

// GET all appointments with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const date = searchParams.get("date")

    const skip = (page - 1) * limit

    logger.info("Fetching appointments", { page, limit, status, date })

    const { db } = await connectToDatabase()

    // Build query based on filters
    const query: any = {}
    if (status) query.status = status
    if (date) query.appointmentDate = { $gte: new Date(date) }

    const appointments = await db
      .collection("appointments")
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ appointmentDate: 1 })
      .toArray()

    const total = await db.collection("appointments").countDocuments(query)

    logger.info("Appointments fetched successfully", { count: appointments.length, total })

    return NextResponse.json({
      data: appointments,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Error fetching appointments", { error })
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 })
  }
}

// POST create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new appointment", { body })

    // Validate appointment data
    const validationResult = validateAppointment(body)
    if (!validationResult.success) {
      logger.warn("Appointment validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid appointment data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Create appointment with default status and timestamps
    const appointment = {
      ...body,
      status: "scheduled",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("appointments").insertOne(appointment)

    logger.info("Appointment created successfully", { id: result.insertedId })

    return NextResponse.json(
      {
        message: "Appointment created successfully",
        id: result.insertedId,
        appointment,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error creating appointment", { error })
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 })
  }
}

