interface ValidationResult {
  success: boolean
  errors?: string[]
}

// Appointment validator
export function validateAppointment(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.customerId) {
    errors.push("Customer ID is required")
  }

  if (!data.appointmentDate) {
    errors.push("Appointment date is required")
  } else {
    const date = new Date(data.appointmentDate)
    if (isNaN(date.getTime())) {
      errors.push("Invalid appointment date format")
    }
  }

  if (!data.location || !data.location.address) {
    errors.push("Location address is required")
  }

  if (!data.type || !["pickup", "delivery", "both"].includes(data.type)) {
    errors.push("Type must be one of: pickup, delivery, both")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Appointment update validator
export function validateAppointmentUpdate(data: any): ValidationResult {
  const errors: string[] = []

  if (data.appointmentDate) {
    const date = new Date(data.appointmentDate)
    if (isNaN(date.getTime())) {
      errors.push("Invalid appointment date format")
    }
  }

  if (data.status && !["scheduled", "in-progress", "completed", "cancelled"].includes(data.status)) {
    errors.push("Status must be one of: scheduled, in-progress, completed, cancelled")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Vehicle validator
export function validateVehicle(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.registrationNumber) {
    errors.push("Registration number is required")
  }

  if (!data.type || !["truck", "van", "bike"].includes(data.type)) {
    errors.push("Type must be one of: truck, van, bike")
  }

  if (!data.capacity) {
    errors.push("Capacity is required")
  }

  if (data.status && !["available", "in-use", "maintenance"].includes(data.status)) {
    errors.push("Status must be one of: available, in-use, maintenance")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Driver validator
export function validateDriver(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name) {
    errors.push("Name is required")
  }

  if (!data.phoneNumber) {
    errors.push("Phone number is required")
  }

  if (!data.licenseNumber) {
    errors.push("License number is required")
  }

  if (data.status && !["available", "on-duty", "off-duty"].includes(data.status)) {
    errors.push("Status must be one of: available, on-duty, off-duty")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Customer validator
export function validateCustomer(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name) {
    errors.push("Name is required")
  }

  if (!data.email) {
    errors.push("Email is required")
  } else if (!/^\S+@\S+\.\S+$/.test(data.email)) {
    errors.push("Invalid email format")
  }

  if (!data.phoneNumber) {
    errors.push("Phone number is required")
  }

  if (!data.address) {
    errors.push("Address is required")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Partner validator
export function validatePartner(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name) {
    errors.push("Name is required")
  }

  if (!data.serviceTypes || !Array.isArray(data.serviceTypes) || data.serviceTypes.length === 0) {
    errors.push("At least one service type is required")
  }

  if (!data.serviceAreas || !Array.isArray(data.serviceAreas) || data.serviceAreas.length === 0) {
    errors.push("At least one service area is required")
  } else {
    // Validate each service area
    data.serviceAreas.forEach((area: any, index: number) => {
      if (!area.name) {
        errors.push(`Service area #${index + 1}: Name is required`)
      }

      if (!area.coordinates || !area.coordinates.latitude || !area.coordinates.longitude) {
        errors.push(`Service area #${index + 1}: Valid coordinates are required`)
      }

      if (!area.radius || area.radius <= 0) {
        errors.push(`Service area #${index + 1}: Valid radius is required`)
      }
    })
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Hub validator
export function validateHub(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.name) {
    errors.push("Name is required")
  }

  if (!data.address) {
    errors.push("Address is required")
  } else {
    if (!data.address.street) {
      errors.push("Street address is required")
    }

    if (!data.address.city) {
      errors.push("City is required")
    }

    if (!data.address.state) {
      errors.push("State is required")
    }

    if (!data.address.zipCode) {
      errors.push("Zip code is required")
    }
  }

  if (!data.coordinates || !data.coordinates.latitude || !data.coordinates.longitude) {
    errors.push("Valid coordinates are required")
  }

  if (!data.totalCapacity || data.totalCapacity <= 0) {
    errors.push("Valid total capacity is required")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

// Slot validator
export function validateSlot(data: any): ValidationResult {
  const errors: string[] = []

  if (!data.hubId) {
    errors.push("Hub ID is required")
  }

  if (!data.date) {
    errors.push("Date is required")
  }

  if (!data.startTime) {
    errors.push("Start time is required")
  } else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.startTime)) {
    errors.push("Start time must be in HH:MM format")
  }

  if (!data.endTime) {
    errors.push("End time is required")
  } else if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(data.endTime)) {
    errors.push("End time must be in HH:MM format")
  }

  if (data.startTime && data.endTime) {
    const start = data.startTime.split(":").map(Number)
    const end = data.endTime.split(":").map(Number)

    if (start[0] > end[0] || (start[0] === end[0] && start[1] >= end[1])) {
      errors.push("End time must be after start time")
    }
  }

  if (!data.type || !["pickup", "delivery", "both"].includes(data.type)) {
    errors.push("Type must be one of: pickup, delivery, both")
  }

  if (data.totalCapacity === undefined || data.totalCapacity <= 0) {
    errors.push("Valid total capacity is required")
  }

  if (data.availableCapacity === undefined) {
    // If not provided, it will default to totalCapacity
  } else if (data.availableCapacity < 0 || (data.totalCapacity && data.availableCapacity > data.totalCapacity)) {
    errors.push("Available capacity must be between 0 and total capacity")
  }

  return {
    success: errors.length === 0,
    errors: errors.length > 0 ? errors : undefined,
  }
}

