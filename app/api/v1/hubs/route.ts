import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateHub } from "@/lib/validators"

// GET all hubs with filtering
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const location = searchParams.get("location")

    const skip = (page - 1) * limit

    logger.info("Fetching hubs", { page, limit, location })

    const { db } = await connectToDatabase()

    // Build query based on filters
    const query: any = {}
    if (location) {
      query.$or = [
        { "address.city": { $regex: location, $options: "i" } },
        { "address.state": { $regex: location, $options: "i" } },
        { "address.zipCode": { $regex: location, $options: "i" } },
      ]
    }

    const hubs = await db.collection("hubs").find(query).skip(skip).limit(limit).sort({ name: 1 }).toArray()

    const total = await db.collection("hubs").countDocuments(query)

    logger.info("Hubs fetched successfully", { count: hubs.length, total })

    return NextResponse.json({
      data: hubs,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Error fetching hubs", { error })
    return NextResponse.json({ error: "Failed to fetch hubs" }, { status: 500 })
  }
}

// POST create a new hub
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new hub", { body })

    // Validate hub data
    const validationResult = validateHub(body)
    if (!validationResult.success) {
      logger.warn("Hub validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid hub data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Create hub with timestamps
    const hub = {
      ...body,
      status: body.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("hubs").insertOne(hub)

    logger.info("Hub created successfully", { id: result.insertedId })

    return NextResponse.json(
      {
        message: "Hub created successfully",
        id: result.insertedId,
        hub,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error creating hub", { error })
    return NextResponse.json({ error: "Failed to create hub" }, { status: 500 })
  }
}

