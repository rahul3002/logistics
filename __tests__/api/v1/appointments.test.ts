import { NextRequest } from "next/server"
import { GET, POST } from "@/app/api/v1/appointments/route"
import { connectToDatabase } from "@/lib/mongodb"
import { validateAppointment } from "@/lib/validators"
import { describe, beforeEach, it, expect, jest } from "@jest/globals"

// Mock the MongoDB connection and validators
jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}))

jest.mock("@/lib/validators", () => ({
  validateAppointment: jest.fn(),
}))

jest.mock("@/lib/logger", () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}))

describe("Appointments API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe("GET /api/v1/appointments", () => {
    it("should return appointments with pagination", async () => {
      // Mock appointments data
      const mockAppointments = [
        { _id: "1", customerId: "123", appointmentDate: new Date() },
        { _id: "2", customerId: "456", appointmentDate: new Date() },
      ]

      // Mock database connection and find method
      const mockCollection = {
        find: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        toArray: jest.fn().mockResolvedValue(mockAppointments),
        countDocuments: jest.fn().mockResolvedValue(2),
      }
      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        db: {
          collection: jest.fn().mockReturnValue(mockCollection),
        },
      })

      // Create mock request with URL
      const request = new NextRequest("http://localhost:3000/api/v1/appointments?page=1&limit=10")

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toEqual(mockAppointments)
      expect(data.pagination.total).toBe(2)
      expect(data.pagination.page).toBe(1)
    })

    it("should handle database errors", async () => {
      // Mock database error
      ;(connectToDatabase as jest.Mock).mockRejectedValue(new Error("Database error"))

      const request = new NextRequest("http://localhost:3000/api/v1/appointments")

      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe("Failed to fetch appointments")
    })
  })

  describe("POST /api/v1/appointments", () => {
    it("should create a new appointment", async () => {
      // Mock validation success
      ;(validateAppointment as jest.Mock).mockReturnValue({ success: true })

      // Mock appointment data
      const appointmentData = {
        customerId: "123",
        appointmentDate: "2023-05-01T10:00:00Z",
        location: { address: "123 Main St" },
        type: "pickup",
      }

      // Mock database connection and insertOne method
      const mockInsertResult = { insertedId: "new-id" }
      const mockCollection = {
        insertOne: jest.fn().mockResolvedValue(mockInsertResult),
      }
      ;(connectToDatabase as jest.Mock).mockResolvedValue({
        db: {
          collection: jest.fn().mockReturnValue(mockCollection),
        },
      })

      // Create mock request with body
      const request = new NextRequest("http://localhost:3000/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify(appointmentData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toBe("Appointment created successfully")
      expect(data.id).toBe("new-id")
    })

    it("should return 400 for invalid appointment data", async () => {
      // Mock validation failure
      ;(validateAppointment as jest.Mock).mockReturnValue({
        success: false,
        errors: ["Customer ID is required"],
      })

      const appointmentData = {
        // Missing required fields
        appointmentDate: "2023-05-01T10:00:00Z",
      }

      const request = new NextRequest("http://localhost:3000/api/v1/appointments", {
        method: "POST",
        body: JSON.stringify(appointmentData),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toBe("Invalid appointment data")
      expect(data.details).toContain("Customer ID is required")
    })
  })
})

