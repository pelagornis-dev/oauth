export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface IEmailService {
  sendVerificationEmail(to: string, token: string, userFirstName: string): Promise<void>;
  sendPasswordResetEmail(to: string, token: string, userFirstName: string): Promise<void>;
  sendWelcomeEmail(to: string, userFirstName: string): Promise<void>;
  sendEmail(to: string, template: EmailTemplate): Promise<void>;
}