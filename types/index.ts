// Appointment types
export interface Location {
  address: string
  city?: string
  state?: string
  zipCode?: string
  coordinates?: {
    latitude: number
    longitude: number
  }
}

export interface Appointment {
  _id?: string
  customerId: string
  appointmentDate: Date | string
  location: Location
  type: "pickup" | "delivery" | "both"
  status: "scheduled" | "in-progress" | "completed" | "cancelled"
  notes?: string
  vehicleId?: string
  driverId?: string
  createdAt?: Date
  updatedAt?: Date
}

// Vehicle types
export interface Vehicle {
  _id?: string
  registrationNumber: string
  type: "truck" | "van" | "bike"
  capacity: number
  status: "available" | "in-use" | "maintenance"
  lastMaintenanceDate?: Date | string
  createdAt?: Date
  updatedAt?: Date
}

// Driver types
export interface Driver {
  _id?: string
  name: string
  phoneNumber: string
  email?: string
  licenseNumber: string
  status: "available" | "on-duty" | "off-duty"
  currentVehicleId?: string
  createdAt?: Date
  updatedAt?: Date
}

// Customer types
export interface Customer {
  _id?: string
  name: string
  email: string
  phoneNumber: string
  address: string
  city?: string
  state?: string
  zipCode?: string
  createdAt?: Date
  updatedAt?: Date
}

// Pagination response
export interface PaginationResponse<T> {
  data: T[]
  pagination: {
    total: number
    page: number
    limit: number
    pages: number
  }
}

