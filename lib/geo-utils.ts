/**
 * Calculate distance between two points using the Haversine formula
 * @param lat1 Latitude of point 1 in degrees
 * @param lon1 Longitude of point 1 in degrees
 * @param lat2 Latitude of point 2 in degrees
 * @param lon2 Longitude of point 2 in degrees
 * @returns Distance in kilometers
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1)
  const dLon = deg2rad(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c // Distance in km

  return distance
}

/**
 * Convert degrees to radians
 */
function deg2rad(deg: number): number {
  return deg * (Math.PI / 180)
}

/**
 * Calculate estimated travel time between two points
 * @param distance Distance in kilometers
 * @param speedKmh Average speed in km/h
 * @returns Travel time in minutes
 */
export function calculateTravelTime(distance: number, speedKmh = 30): number {
  // Time = distance / speed (in hours)
  // Convert to minutes
  return (distance / speedKmh) * 60
}

/**
 * Check if a location is within a service area
 */
export function isLocationInServiceArea(
  location: { latitude: number; longitude: number },
  serviceArea: { coordinates: { latitude: number; longitude: number }; radius: number },
): boolean {
  const distance = calculateDistance(
    location.latitude,
    location.longitude,
    serviceArea.coordinates.latitude,
    serviceArea.coordinates.longitude,
  )

  return distance <= serviceArea.radius
}

