import { calculateDistance } from "./geo-utils"

interface Location {
  latitude: number
  longitude: number
  address?: string
  region?: string
}

interface PricingRules {
  basePrice: number
  pricePerKm: number
  packageSizeFactor: {
    small: number
    medium: number
    large: number
    extraLarge: number
  }
  weightFactor: number // Price per kg
  urgencyFactor: {
    low: number
    normal: number
    high: number
    critical: number
  }
  timeOfDayFactor: {
    morning: number // 6-12
    afternoon: number // 12-18
    evening: number // 18-22
    night: number // 22-6
  }
  weekendFactor: number
  holidayFactor: number
}

interface RegionDemand {
  region: string
  demandFactor: number
}

interface PriceCalculationParams {
  origin: Location
  destination: Location
  packageSize: "small" | "medium" | "large" | "extraLarge"
  packageWeight?: number
  urgency: "low" | "normal" | "high" | "critical"
  time: Date
  pricingRules: PricingRules
  originDemand: RegionDemand
  destinationDemand: RegionDemand
}

interface PriceBreakdown {
  basePrice: number
  distancePrice: number
  sizePrice: number
  weightPrice: number
  urgencyPrice: number
  timeOfDayPrice: number
  weekendPrice: number
  holidayPrice: number
  demandPrice: number
}

interface PriceResult {
  total: number
  breakdown: PriceBreakdown
  currency: string
}

/**
 * Calculate dynamic price based on various factors
 */
export function calculateDynamicPrice(params: PriceCalculationParams): PriceResult {
  const {
    origin,
    destination,
    packageSize,
    packageWeight = 0,
    urgency,
    time,
    pricingRules,
    originDemand,
    destinationDemand,
  } = params

  // Calculate distance
  const distance = calculateDistance(origin.latitude, origin.longitude, destination.latitude, destination.longitude)

  // Base price
  const basePrice = pricingRules.basePrice

  // Distance price
  const distancePrice = distance * pricingRules.pricePerKm

  // Package size price
  const sizePrice = basePrice * pricingRules.packageSizeFactor[packageSize]

  // Weight price
  const weightPrice = packageWeight * pricingRules.weightFactor

  // Urgency price
  const urgencyPrice = basePrice * pricingRules.urgencyFactor[urgency]

  // Time of day price
  const hour = time.getHours()
  let timeOfDayFactor

  if (hour >= 6 && hour < 12) {
    timeOfDayFactor = pricingRules.timeOfDayFactor.morning
  } else if (hour >= 12 && hour < 18) {
    timeOfDayFactor = pricingRules.timeOfDayFactor.afternoon
  } else if (hour >= 18 && hour < 22) {
    timeOfDayFactor = pricingRules.timeOfDayFactor.evening
  } else {
    timeOfDayFactor = pricingRules.timeOfDayFactor.night
  }

  const timeOfDayPrice = basePrice * timeOfDayFactor

  // Weekend price
  const day = time.getDay()
  const isWeekend = day === 0 || day === 6 // Sunday or Saturday
  const weekendPrice = isWeekend ? basePrice * pricingRules.weekendFactor : 0

  // Holiday price (simplified - would need a holiday calendar in production)
  const isHoliday = false // Placeholder for holiday check
  const holidayPrice = isHoliday ? basePrice * pricingRules.holidayFactor : 0

  // Demand price
  const avgDemandFactor = (originDemand.demandFactor + destinationDemand.demandFactor) / 2
  const demandPrice = basePrice * (avgDemandFactor - 1) // Only apply if demand factor > 1

  // Calculate total price
  const breakdown: PriceBreakdown = {
    basePrice,
    distancePrice,
    sizePrice,
    weightPrice,
    urgencyPrice,
    timeOfDayPrice,
    weekendPrice,
    holidayPrice,
    demandPrice,
  }

  const total = Object.values(breakdown).reduce((sum, price) => sum + price, 0)

  return {
    total: Math.round(total * 100) / 100, // Round to 2 decimal places
    breakdown,
    currency: "USD", // Default currency
  }
}

