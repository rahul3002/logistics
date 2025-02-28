import { calculateDistance, calculateTravelTime } from "./geo-utils"

interface Vehicle {
  _id: string
  type: string
  capacity: number
}

interface Appointment {
  _id: string
  customerId: string
  location: {
    address: string
    coordinates?: {
      latitude: number
      longitude: number
    }
  }
  type: "pickup" | "delivery" | "both"
  scheduledTime?: string
  priority?: number
}

interface Location {
  latitude: number
  longitude: number
  address?: string
}

interface RouteConstraints {
  maxDistance?: number
  maxDuration?: number
  prioritizeUrgent?: boolean
  respectTimeWindows?: boolean
}

interface RouteStop {
  appointmentId: string
  location: Location
  estimatedArrivalTime: string
  type: "pickup" | "delivery" | "both"
  priority: number
  distance: number // Distance from previous stop
  duration: number // Duration from previous stop in minutes
}

interface RouteResult {
  vehicleId: string
  deliveries: RouteStop[]
  totalDistance: number
  totalDuration: number
  startTime: string
  endTime: string
}

/**
 * Calculate optimal route for deliveries
 * This is a simplified implementation - a real-world solution would use a more sophisticated algorithm
 */
export function calculateOptimalRoute(params: {
  vehicle: Vehicle
  deliveries: Appointment[]
  startLocation: Location
  endLocation: Location
  constraints: RouteConstraints
}): RouteResult {
  const { vehicle, deliveries, startLocation, endLocation, constraints } = params

  // Assign default priorities if not present
  const deliveriesWithPriority = deliveries.map((delivery) => ({
    ...delivery,
    priority: delivery.priority || 1,
  }))

  // Sort deliveries by priority (higher priority first)
  if (constraints.prioritizeUrgent) {
    deliveriesWithPriority.sort((a, b) => b.priority - a.priority)
  }

  // Initialize route
  const route: RouteStop[] = []
  let currentLocation = startLocation
  let totalDistance = 0
  let totalDuration = 0

  // Start time (now)
  const startTime = new Date()
  let currentTime = new Date(startTime)

  // Process each delivery
  for (const delivery of deliveriesWithPriority) {
    // Skip if delivery doesn't have coordinates
    if (!delivery.location.coordinates) {
      continue
    }

    // Calculate distance and duration from current location
    const distance = calculateDistance(
      currentLocation.latitude,
      currentLocation.longitude,
      delivery.location.coordinates.latitude,
      delivery.location.coordinates.longitude,
    )

    // Skip if adding this delivery would exceed max distance
    if (constraints.maxDistance && totalDistance + distance > constraints.maxDistance) {
      continue
    }

    // Calculate travel time
    const duration = calculateTravelTime(distance)

    // Skip if adding this delivery would exceed max duration
    if (constraints.maxDuration && totalDuration + duration > constraints.maxDuration) {
      continue
    }

    // Update current time
    currentTime = new Date(currentTime.getTime() + duration * 60 * 1000)

    // Add stop to route
    route.push({
      appointmentId: delivery._id.toString(),
      location: delivery.location.coordinates,
      estimatedArrivalTime: currentTime.toISOString(),
      type: delivery.type,
      priority: delivery.priority || 1,
      distance,
      duration,
    })

    // Update current location, total distance and duration
    currentLocation = delivery.location.coordinates
    totalDistance += distance
    totalDuration += duration
  }

  // Add return to end location
  const returnDistance = calculateDistance(
    currentLocation.latitude,
    currentLocation.longitude,
    endLocation.latitude,
    endLocation.longitude,
  )

  const returnDuration = calculateTravelTime(returnDistance)
  totalDistance += returnDistance
  totalDuration += returnDuration

  // Calculate end time
  const endTime = new Date(startTime.getTime() + totalDuration * 60 * 1000)

  return {
    vehicleId: vehicle._id.toString(),
    deliveries: route,
    totalDistance,
    totalDuration,
    startTime: startTime.toISOString(),
    endTime: endTime.toISOString(),
  }
}

