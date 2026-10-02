export async function sendEmail(opts: {
   to: string;
   subject: string;
   html: string;
}) {
   if (process.env.EMAIL_DISABLED === 'true') {
      console.log(`[mailer] skipped email to ${opts.to}: ${opts.subject}`);
      return;
   }

   const auth = Buffer.from(
      `${process.env.MAILJET_API_KEY}:${process.env.MAILJET_SECRET_KEY}`,
   ).toString('base64');

   const res = await fetch('https://api.mailjet.com/v3.1/send', {
      method: 'POST',
      headers: {
         Authorization: `Basic ${auth}`,
         'Content-Type': 'application/json',
      },
      body: JSON.stringify({
         Messages: [
            {
               From: { Email: process.env.MAIL_FROM!, Name: 'Artfolio' },
               To: [{ Email: opts.to }],
               Subject: opts.subject,
               HTMLPart: opts.html,
            },
         ],
      }),
   });

   if (!res.ok) throw new Error(`Mailjet ${res.status}: ${await res.text()}`);
}
