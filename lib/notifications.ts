interface Customer {
  _id: string
  name: string
  email: string
  phoneNumber: string
}

interface Notification {
  _id: string
  customerId: string
  type: string
  title: string
  message: string
  appointmentId?: string
}

interface NotificationResult {
  success: boolean
  error?: string
  channels: {
    email?: boolean
    sms?: boolean
    push?: boolean
  }
}

/**
 * Send notification to customer via available channels
 */
export async function sendNotification(params: {
  customer: Customer
  notification: Notification
}): Promise<NotificationResult> {
  const { customer, notification } = params

  const result: NotificationResult = {
    success: false,
    channels: {},
  }

  try {
    // Send email notification
    if (customer.email) {
      try {
        await sendEmailNotification(customer, notification)
        result.channels.email = true
      } catch (error) {
        console.error("Failed to send email notification:", error)
        result.channels.email = false
      }
    }

    // Send SMS notification
    if (customer.phoneNumber) {
      try {
        await sendSmsNotification(customer, notification)
        result.channels.sms = true
      } catch (error) {
        console.error("Failed to send SMS notification:", error)
        result.channels.sms = false
      }
    }

    // Check if any channel was successful
    result.success = Object.values(result.channels).some(Boolean)

    return result
  } catch (error) {
    console.error("Error sending notification:", error)
    return {
      success: false,
      error: error.message,
      channels: {},
    }
  }
}

/**
 * Send email notification
 * This is a placeholder - in a real implementation, this would use an email service
 */
async function sendEmailNotification(customer: Customer, notification: Notification): Promise<void> {
  // Placeholder for email sending logic
  console.log(`[EMAIL] To: ${customer.email}, Subject: ${notification.title}, Message: ${notification.message}`)

  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(resolve, 100)
  })
}

/**
 * Send SMS notification
 * This is a placeholder - in a real implementation, this would use an SMS service
 */
async function sendSmsNotification(customer: Customer, notification: Notification): Promise<void> {
  // Placeholder for SMS sending logic
  console.log(`[SMS] To: ${customer.phoneNumber}, Message: ${notification.message}`)

  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(resolve, 100)
  })
}

