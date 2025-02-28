import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { calculateDynamicPrice } from "@/lib/pricing"

// POST calculate dynamic price for a delivery
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Calculating dynamic price", { body })

    // Validate required fields
    if (!body.origin || !body.destination || !body.packageSize) {
      logger.warn("Missing required fields", { body })
      return NextResponse.json({ error: "origin, destination, and packageSize are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Get base pricing rules
    const pricingRules = await db.collection("pricingRules").findOne({ status: "active" })

    if (!pricingRules) {
      logger.warn("No active pricing rules found")
      return NextResponse.json({ error: "No active pricing rules found" }, { status: 404 })
    }

    // Get current demand data for the regions
    const originDemand = await db.collection("regionDemand").findOne({ region: body.origin.region || "default" })

    const destinationDemand = await db
      .collection("regionDemand")
      .findOne({ region: body.destination.region || "default" })

    // Calculate dynamic price
    const price = calculateDynamicPrice({
      origin: body.origin,
      destination: body.destination,
      packageSize: body.packageSize,
      packageWeight: body.packageWeight,
      urgency: body.urgency || "normal",
      time: body.time || new Date(),
      pricingRules,
      originDemand: originDemand || { demandFactor: 1 },
      destinationDemand: destinationDemand || { demandFactor: 1 },
    })

    // Save price calculation for reference
    const priceRecord = {
      ...body,
      calculatedPrice: price.total,
      breakdown: price.breakdown,
      calculatedAt: new Date(),
    }

    await db.collection("priceCalculations").insertOne(priceRecord)

    logger.info("Price calculated successfully", {
      total: price.total,
      origin: body.origin.region,
      destination: body.destination.region,
    })

    return NextResponse.json({
      data: price,
    })
  } catch (error) {
    logger.error("Error calculating price", { error })
    return NextResponse.json({ error: "Failed to calculate price" }, { status: 500 })
  }
}

