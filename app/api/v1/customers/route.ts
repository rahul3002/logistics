import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { validateCustomer } from "@/lib/validators"

// GET all customers with pagination and search
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""

    const skip = (page - 1) * limit

    logger.info("Fetching customers", { page, limit, search })

    const { db } = await connectToDatabase()

    // Build query based on search
    const query: any = {}
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { phoneNumber: { $regex: search, $options: "i" } },
      ]
    }

    const customers = await db.collection("customers").find(query).skip(skip).limit(limit).sort({ name: 1 }).toArray()

    const total = await db.collection("customers").countDocuments(query)

    logger.info("Customers fetched successfully", { count: customers.length, total })

    return NextResponse.json({
      data: customers,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (error) {
    logger.error("Error fetching customers", { error })
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

// POST create a new customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Creating new customer", { body })

    // Validate customer data
    const validationResult = validateCustomer(body)
    if (!validationResult.success) {
      logger.warn("Customer validation failed", { errors: validationResult.errors })
      return NextResponse.json({ error: "Invalid customer data", details: validationResult.errors }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if customer with same email already exists
    const existingCustomer = await db.collection("customers").findOne({ email: body.email })

    if (existingCustomer) {
      logger.warn("Customer with email already exists", { email: body.email })
      return NextResponse.json({ error: "Customer with this email already exists" }, { status: 409 })
    }

    // Create customer with timestamps
    const customer = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("customers").insertOne(customer)

    logger.info("Customer created successfully", { id: result.insertedId })

    return NextResponse.json(
      {
        message: "Customer created successfully",
        id: result.insertedId,
        customer,
      },
      { status: 201 },
    )
  } catch (error) {
    logger.error("Error creating customer", { error })
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}

