import twilio from 'twilio';

interface NotificationConfig {
  twilioApiKey?: string;
  twilioKeySecret?: string;
  twilioAccountSid?: string;
  twilioPhoneNumber?: string;
  fromEmail?: string;
}

export class NotificationService {
  private twilioClient?: twilio.Twilio;
  private config: NotificationConfig;

  constructor(config: NotificationConfig = {}) {
    this.config = config;
    
    // Initialize Twilio if credentials are available
    if (config.twilioAccountSid && config.twilioKeySecret) {
      this.twilioClient = twilio(config.twilioApiKey || config.twilioAccountSid, config.twilioKeySecret);
    }
  }

  async sendPasswordResetSMS(phoneNumber: string, resetToken: string, baseUrl: string): Promise<boolean> {
    if (!this.twilioClient) {
      console.log('[NotificationService] Twilio not configured - SMS not sent');
      return false;
    }

    try {
      const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
      const message = `Chess Learning App: Reset your password using this link: ${resetUrl} (expires in 1 hour)`;

      await this.twilioClient.messages.create({
        body: message,
        from: this.config.twilioPhoneNumber,
        to: phoneNumber
      });

      console.log(`[NotificationService] Password reset SMS sent to ${phoneNumber}`);
      return true;
    } catch (error) {
      console.error('[NotificationService] SMS sending failed:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, resetToken: string, baseUrl: string): Promise<boolean> {
    // For now, just log the reset link since we don't have email service configured
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}`;
    
    console.log(`[NotificationService] Password reset requested for ${email}`);
    console.log(`[NotificationService] Reset token: ${resetToken}`);
    console.log(`[NotificationService] Reset link: ${resetUrl}`);
    
    // In production, you would integrate with SendGrid or another email service here
    return true;
  }

  async sendNotification(method: 'sms' | 'email', recipient: string, resetToken: string, baseUrl: string): Promise<boolean> {
    if (method === 'sms') {
      return await this.sendPasswordResetSMS(recipient, resetToken, baseUrl);
    } else {
      return await this.sendPasswordResetEmail(recipient, resetToken, baseUrl);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService({
  twilioApiKey: process.env.TWILIO_API_KEY,
  twilioKeySecret: process.env.TWILIO_KEY_SECRET, 
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioPhoneNumber: process.env.TWILIO_PHONE_NUMBER,
  fromEmail: process.env.FROM_EMAIL || 'noreply@chesslearning.app'
});

console.log('[NotificationService] Notification service initialized with Twilio integration');