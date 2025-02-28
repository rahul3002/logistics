import { NextResponse } from "next/server"
import { connectToDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    // Check database connection
    const { client } = await connectToDatabase()
    const isConnected = client.isConnected ? client.isConnected() : client.topology?.isConnected()

    if (!isConnected) {
      console.error("Health check failed: Database connection failed")
      return NextResponse.json({ status: "error", message: "Database connection failed" }, { status: 503 })
    }

    console.info("Health check passed")
    return NextResponse.json(
      {
        status: "ok",
        timestamp: new Date().toISOString(),
        services: {
          database: "connected",
        },
      },
      { status: 200 },
    )
  } catch (error) {
    console.error("Health check failed:", error)
    return NextResponse.json({ status: "error", message: "Service unavailable" }, { status: 503 })
  }
}

