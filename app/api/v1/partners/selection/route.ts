import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { calculatePartnerScore } from "@/lib/partner-selection"

// POST select best partner for an appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Selecting partner for appointment", { body })

    // Validate required fields
    if (!body.appointmentId || !body.pickupLocation || !body.serviceType) {
      logger.warn("Missing required fields for partner selection", { body })
      return NextResponse.json(
        { error: "Missing required fields. appointmentId, pickupLocation, and serviceType are required" },
        { status: 400 },
      )
    }

    const { db } = await connectToDatabase()

    // Get all active partners that provide the required service
    const partners = await db
      .collection("partners")
      .find({
        status: "active",
        serviceTypes: body.serviceType,
      })
      .toArray()

    if (partners.length === 0) {
      logger.warn("No active partners found for service type", { serviceType: body.serviceType })
      return NextResponse.json({ error: "No active partners found for the specified service type" }, { status: 404 })
    }

    // Get service states for all partners
    const partnerIds = partners.map((p) => p._id.toString())
    const serviceStates = await db
      .collection("partnerServiceStates")
      .find({ partnerId: { $in: partnerIds } })
      .toArray()

    // Create a map of partner ID to service state for quick lookup
    const serviceStateMap = serviceStates.reduce((map, state) => {
      map[state.partnerId] = state
      return map
    }, {})

    // Calculate scores for each partner
    const partnersWithScores = partners.map((partner) => {
      const serviceState = serviceStateMap[partner._id.toString()] || {
        status: "active",
        availability: "available",
        capacity: 100,
        currentLoad: 0,
      }

      const score = calculatePartnerScore(partner, serviceState, body.pickupLocation, body.urgency || "normal")

      return {
        partner,
        serviceState,
        score,
      }
    })

    // Sort partners by score (descending)
    partnersWithScores.sort((a, b) => b.score - a.score)

    // Select top 3 partners as primary and fallbacks
    const selectedPartners = partnersWithScores.slice(0, 3)

    // Record the selection in the database
    const selection = {
      appointmentId: body.appointmentId,
      serviceType: body.serviceType,
      pickupLocation: body.pickupLocation,
      urgency: body.urgency || "normal",
      primaryPartnerId: selectedPartners[0]?.partner._id,
      fallbackPartnerIds: selectedPartners.slice(1).map((p) => p.partner._id),
      selectionTime: new Date(),
      status: "pending_acceptance",
    }

    await db.collection("partnerSelections").insertOne(selection)

    logger.info("Partner selection completed successfully", {
      appointmentId: body.appointmentId,
      primaryPartnerId: selection.primaryPartnerId,
    })

    return NextResponse.json({
      message: "Partner selection completed successfully",
      data: {
        primaryPartner: selectedPartners[0]?.partner,
        fallbackPartners: selectedPartners.slice(1).map((p) => p.partner),
        selectionId: selection._id,
      },
    })
  } catch (error) {
    logger.error("Error selecting partner", { error })
    return NextResponse.json({ error: "Failed to select partner" }, { status: 500 })
  }
}

