import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validatePartner } from "@/lib/validators"

// GET all partners with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status")
    const serviceType = searchParams.get("serviceType")
    const location = searchParams.get("location")

    const skip = (page - 1) * limit

    logger.info("Fetching partners", { page, limit, status, serviceType, location })

    const { db } = await connectToDatabase()

    // Build query based on filters
    const query: any = {}
    if (status) query.status = status
    if (serviceType) query.serviceTypes = serviceType
    if (location) {
      // Simple location-based query (can be enhanced with geospatial queries)
      query["serviceAreas.name"] = location
    }

    const partners = await db
      .collection("partners")
      .find(query)
      .skip(skip)
      .limit(limit)
      .sort({ priority: -1, rating: -1 })
      .toArray()

    const total = await db.collection("partners").countDocuments(query)

    logger.info("Partners fetched successfully", { count: partners.length, total })

    return NextResponse.json({
      data: partners,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Error fetching partners", { error })
    return NextResponse.json({ error: "Failed to fetch partners" }, { status: 500 })
  }
}

// POST create a new partner
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new partner", { body })

    // Validate partner data
    const validationResult = validatePartner(body)
    if (!validationResult.success) {
      logger.warn("Partner validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid partner data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Create partner with default values and timestamps
    const partner = {
      ...body,
      status: body.status || "active",
      priority: body.priority || 1,
      rating: body.rating || 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("partners").insertOne(partner)

    logger.info("Partner created successfully", { id: result.insertedId })

    return NextResponse.json(
      {
        message: "Partner created successfully",
        id: result.insertedId,
        partner,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error creating partner", { error })
    return NextResponse.json({ error: "Failed to create partner" }, { status: 500 })
  }
}

