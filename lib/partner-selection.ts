import { calculateDistance } from "./geo-utils"

interface Partner {
  _id: string
  name: string
  priority: number
  rating: number
  serviceAreas: Array<{
    name: string
    coordinates: {
      latitude: number
      longitude: number
    }
    radius: number
  }>
  serviceTypes: string[]
  status: string
}

interface ServiceState {
  status: string
  availability: string
  capacity: number
  currentLoad: number
}

interface Location {
  latitude: number
  longitude: number
  address?: string
  region?: string
}

type Urgency = "low" | "normal" | "high" | "critical"

/**
 * Calculate a score for a partner based on various factors
 */
export function calculatePartnerScore(
  partner: Partner,
  serviceState: ServiceState,
  pickupLocation: Location,
  urgency: Urgency,
): number {
  // Base score starts with partner priority (1-10)
  let score = partner.priority * 10

  // Add rating factor (0-5 stars)
  score += partner.rating * 5

  // Check service state
  if (serviceState.status !== "active") {
    return 0 // Partner not active
  }

  // Availability factor
  switch (serviceState.availability) {
    case "available":
      score += 50
      break
    case "limited":
      score += 20
      break
    case "unavailable":
      return 0 // Partner unavailable
  }

  // Capacity factor (0-100%)
  const capacityFactor = (serviceState.capacity - serviceState.currentLoad) / serviceState.capacity
  score += capacityFactor * 30

  // Distance factor - find closest service area
  let minDistance = Number.MAX_VALUE

  for (const area of partner.serviceAreas) {
    const distance = calculateDistance(
      pickupLocation.latitude,
      pickupLocation.longitude,
      area.coordinates.latitude,
      area.coordinates.longitude,
    )

    if (distance < minDistance) {
      minDistance = distance
    }
  }

  // Distance score (inverse relationship - closer is better)
  // Max score of 50 at 0km, decreasing as distance increases
  const distanceScore = Math.max(0, 50 - minDistance * 2)
  score += distanceScore

  // Urgency factor
  switch (urgency) {
    case "critical":
      // For critical urgency, prioritize availability over other factors
      score = serviceState.availability === "available" ? score * 1.5 : score
      break
    case "high":
      score = serviceState.availability === "available" ? score * 1.2 : score
      break
    case "normal":
      // No adjustment for normal urgency
      break
    case "low":
      // For low urgency, prioritize capacity and cost efficiency
      score = capacityFactor > 0.7 ? score * 1.1 : score
      break
  }

  return Math.round(score)
}

