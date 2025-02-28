import { ObjectId } from "mongodb"

interface Exception {
  _id: string
  appointmentId: string
  type: string
  description: string
  severity: "low" | "medium" | "high" | "critical"
  status: "open" | "in_progress" | "resolved" | "closed"
}

interface Appointment {
  _id: string
  customerId: string
  status: string
}

interface ExceptionHandlingResult {
  status: "in_progress" | "resolved" | "closed"
  resolution?: string
  handledAt: Date
}

/**
 * Handle exceptions based on type and severity
 */
export async function handleException(params: {
  exception: Exception
  appointment: Appointment
  db: any
}): Promise<ExceptionHandlingResult> {
  const { exception, appointment, db } = params

  // Default result
  const result: ExceptionHandlingResult = {
    status: "in_progress",
    handledAt: new Date(),
  }

  try {
    // Handle different exception types
    switch (exception.type) {
      case "delivery_delay":
        await handleDeliveryDelay(exception, appointment, db)
        result.resolution = "Customer notified of delay"
        break

      case "package_damaged":
        await handlePackageDamaged(exception, appointment, db)
        result.resolution = "Replacement scheduled"
        break

      case "address_not_found":
        await handleAddressNotFound(exception, appointment, db)
        result.resolution = "Customer contacted for address verification"
        break

      case "customer_unavailable":
        await handleCustomerUnavailable(exception, appointment, db)
        result.resolution = "Delivery rescheduled"
        break

      case "vehicle_breakdown":
        await handleVehicleBreakdown(exception, appointment, db)
        result.resolution = "Alternate vehicle assigned"
        break

      default:
        // Generic handling for unknown exception types
        await createNotification(db, appointment.customerId, {
          title: "Delivery Exception",
          message: `There is an issue with your delivery: ${exception.description}. Our team is working to resolve it.`,
          appointmentId: exception.appointmentId,
        })
        result.resolution = "Generic exception handling applied"
    }

    // For critical severity, escalate to operations team
    if (exception.severity === "critical") {
      await createEscalation(db, exception)
      result.resolution = `${result.resolution} and escalated to operations team`
    }

    // Mark as resolved for low severity exceptions
    if (exception.severity === "low") {
      result.status = "resolved"
    }

    return result
  } catch (error) {
    console.error("Error handling exception:", error)
    return {
      status: "in_progress",
      resolution: `Error during handling: ${error.message}`,
      handledAt: new Date(),
    }
  }
}

/**
 * Handle delivery delay exception
 */
async function handleDeliveryDelay(exception: Exception, appointment: Appointment, db: any): Promise<void> {
  // Notify customer about delay
  await createNotification(db, appointment.customerId, {
    title: "Delivery Delay",
    message: `Your delivery is delayed: ${exception.description}. We apologize for the inconvenience.`,
    appointmentId: exception.appointmentId,
  })

  // Update appointment status
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(appointment._id) },
    {
      $set: {
        status: "delayed",
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Handle package damaged exception
 */
async function handlePackageDamaged(exception: Exception, appointment: Appointment, db: any): Promise<void> {
  // Notify customer about damaged package
  await createNotification(db, appointment.customerId, {
    title: "Package Damaged",
    message: `We regret to inform you that your package was damaged: ${exception.description}. We are arranging a replacement.`,
    appointmentId: exception.appointmentId,
  })

  // Update appointment status
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(appointment._id) },
    {
      $set: {
        status: "damaged",
        updatedAt: new Date(),
      },
    },
  )

  // Create replacement appointment
  const replacementAppointment = {
    customerId: appointment.customerId,
    type: "delivery",
    status: "scheduled",
    notes: `Replacement for damaged package in appointment ${appointment._id}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  await db.collection("appointments").insertOne(replacementAppointment)
}

/**
 * Handle address not found exception
 */
async function handleAddressNotFound(exception: Exception, appointment: Appointment, db: any): Promise<void> {
  // Notify customer about address issue
  await createNotification(db, appointment.customerId, {
    title: "Address Not Found",
    message: `We couldn't locate your address: ${exception.description}. Please contact our support team to verify your address.`,
    appointmentId: exception.appointmentId,
  })

  // Update appointment status
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(appointment._id) },
    {
      $set: {
        status: "address_issue",
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Handle customer unavailable exception
 */
async function handleCustomerUnavailable(exception: Exception, appointment: Appointment, db: any): Promise<void> {
  // Notify customer about missed delivery
  await createNotification(db, appointment.customerId, {
    title: "Delivery Attempted",
    message: `We attempted to deliver your package but you were unavailable: ${exception.description}. We will reschedule your delivery.`,
    appointmentId: exception.appointmentId,
  })

  // Update appointment status
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(appointment._id) },
    {
      $set: {
        status: "delivery_attempted",
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Handle vehicle breakdown exception
 */
async function handleVehicleBreakdown(exception: Exception, appointment: Appointment, db: any): Promise<void> {
  // Notify customer about delay due to vehicle issue
  await createNotification(db, appointment.customerId, {
    title: "Delivery Delay",
    message: `Your delivery is delayed due to a vehicle issue: ${exception.description}. We are assigning an alternate vehicle.`,
    appointmentId: exception.appointmentId,
  })

  // Update appointment status
  await db.collection("appointments").updateOne(
    { _id: new ObjectId(appointment._id) },
    {
      $set: {
        status: "delayed",
        updatedAt: new Date(),
      },
    },
  )
}

/**
 * Create notification
 */
async function createNotification(db: any, customerId: string, notification: any): Promise<void> {
  await db.collection("notifications").insertOne({
    customerId,
    type: "exception",
    title: notification.title,
    message: notification.message,
    appointmentId: notification.appointmentId,
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

/**
 * Create escalation
 */
async function createEscalation(db: any, exception: Exception): Promise<void> {
  await db.collection("escalations").insertOne({
    exceptionId: exception._id,
    appointmentId: exception.appointmentId,
    type: exception.type,
    severity: exception.severity,
    description: exception.description,
    status: "open",
    createdAt: new Date(),
    updatedAt: new Date(),
  })
}

