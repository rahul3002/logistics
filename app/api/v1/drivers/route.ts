import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateDriver } from "@/lib/validators"

// GET all drivers with pagination and filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")

    const skip = (page - 1) * limit

    logger.info("Fetching drivers", { page, limit, status })

    const { db } = await connectToDatabase()

    // Build query based on filters
    const query: any = {}
    if (status) query.status = status

    const drivers = await db.collection("drivers").find(query).skip(skip).limit(limit).sort({ name: 1 }).toArray()

    const total = await db.collection("drivers").countDocuments(query)

    logger.info("Drivers fetched successfully", { count: drivers.length, total })

    return NextResponse.json({
      data: drivers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Error fetching drivers", { error })
    return NextResponse.json({ error: "Failed to fetch drivers" }, { status: 500 })
  }
}

// POST create a new driver
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new driver", { body })

    // Validate driver data
    const validationResult = validateDriver(body)
    if (!validationResult.success) {
      logger.warn("Driver validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid driver data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if driver with same phone number already exists
    const existingDriver = await db.collection("drivers").findOne({ phoneNumber: body.phoneNumber })

    if (existingDriver) {
      logger.warn("Driver with phone number already exists", { phoneNumber: body.phoneNumber })
      return NextResponse.json({ error: "Driver with this phone number already exists" }, { status: 409 })
    }

    // Create driver with timestamps
    const driver = {
      ...body,
      status: body.status || "available",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("drivers").insertOne(driver)

    logger.info("Driver created successfully", { id: result.insertedId })

    return NextResponse.json(
      {
        message: "Driver created successfully",
        id: result.insertedId,
        driver,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error creating driver", { error })
    return NextResponse.json({ error: "Failed to create driver" }, { status: 500 })
  }
}

