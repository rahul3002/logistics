import { type NextRequest, NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"
import { logger } from "@/lib/logger"
import { sendNotification } from "@/lib/notifications"
import { ObjectId } from "mongodb"

// POST send notification to customer
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    logger.info("Sending notification", { body })

    // Validate required fields
    if (!body.customerId || !body.type || !body.message) {
      logger.warn("Missing required fields", { body })
      return NextResponse.json({ error: "customerId, type, and message are required" }, { status: 400 })
    }

    const { db } = await connectToDatabase()

    // Check if customer exists
    const customer = await db.collection("customers").findOne({ _id: new ObjectId(body.customerId) })

    if (!customer) {
      logger.warn("Customer not found", { customerId: body.customerId })
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Create notification record
    const notification = {
      customerId: body.customerId,
      type: body.type,
      message: body.message,
      title: body.title || "Notification",
      appointmentId: body.appointmentId,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    const result = await db.collection("notifications").insertOne(notification)

    // Send notification
    const sendResult = await sendNotification({
      customer,
      notification: {
        ...notification,
        _id: result.insertedId,
      },
    })

    // Update notification status
    await db.collection("notifications").updateOne(
      { _id: result.insertedId },
      {
        $set: {
          status: sendResult.success ? "sent" : "failed",
          sentAt: sendResult.success ? new Date() : undefined,
          error: sendResult.error,
          updatedAt: new Date(),
        },
      },
    )

    logger.info("Notification processed", {
      id: result.insertedId,
      success: sendResult.success,
    })

    return NextResponse.json({
      message: sendResult.success ? "Notification sent successfully" : "Failed to send notification",
      data: {
        notificationId: result.insertedId,
        status: sendResult.success ? "sent" : "failed",
        error: sendResult.error,
      },
    })
  } catch (error) {
    logger.error("Error sending notification", { error })
    return NextResponse.json({ error: "Failed to send notification" }, { status: 500 })
  }
}

