import { GET } from "@/app/api/v1/healthcheck/route"
import { connectToDatabase } from "@/lib/mongodb"

// Mock the MongoDB connection
jest.mock("@/lib/mongodb", () => ({
  connectToDatabase: jest.fn(),
}))

describe("Healthcheck API", () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it("should return 200 when database is connected", async () => {
    // Mock successful database connection
    ;(connectToDatabase as jest.Mock).mockResolvedValue({
      client: {
        isConnected: () => true,
      },
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.status).toBe("ok")
    expect(data.services.database).toBe("connected")
  })

  it("should return 503 when database connection fails", async () => {
    // Mock failed database connection
    ;(connectToDatabase as jest.Mock).mockResolvedValue({
      client: {
        isConnected: () => false,
      },
    })

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe("error")
  })

  it("should return 503 when an error is thrown", async () => {
    // Mock error during database connection
    ;(connectToDatabase as jest.Mock).mockRejectedValue(new Error("Connection error"))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(503)
    expect(data.status).toBe("error")
  })
})

