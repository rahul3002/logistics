import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { logger } from "./lib/logger"

export function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID()
  const startTime = Date.now()

  // Add request ID to response headers for tracking
  const response = NextResponse.next({
    headers: {
      "X-Request-ID": requestId,
    },
  })

  // Log request details
  const method = request.method
  const url = request.url
  const userAgent = request.headers.get("user-agent") || "unknown"

  logger.info(`API Request started`, {
    requestId,
    method,
    url,
    userAgent,
  })

  // Add response event listener to log completion
  response.on("finish", () => {
    const duration = Date.now() - startTime
    const status = response.status

    logger.info(`API Request completed`, {
      requestId,
      method,
      url,
      status,
      duration: `${duration}ms`,
    })
  })

  return response
}

// Only run middleware on API routes
export const config = {
  matcher: "/api/:path*",
}

