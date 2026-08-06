import { Resend } from 'resend';

export const resend = new Resend(
   process.env.RESEND_API_KEY ?? 're_placeholder',
);

export async function sendWelcomeEmail(to: string, username: string) {
   return resend.emails.send({
      from: 'Artfolio <noreply@yourdomain.com>',
      to,
      subject: 'Welcome to Artfolio',
      html: `<p>Welcome, ${username}! Your account is ready.</p>`,
   });
}

export async function sendPasswordResetEmail(to: string, resetUrl: string) {
   return resend.emails.send({
      from: 'Artfolio <noreply@yourdomain.com>',
      to,
      subject: 'Reset your password',
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link expires in 1 hour.</p>`,
   });
}
