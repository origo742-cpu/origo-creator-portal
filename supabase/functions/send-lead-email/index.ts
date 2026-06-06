import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ORIGO_NOTIFY_EMAIL = "leads@origoabroad.com";
const FROM_EMAIL = "noreply@origoabroad.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const lead = await req.json();

    const emailHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: Arial, sans-serif; color: #1a1a2e; margin: 0; padding: 0; background: #f3f4f6; }
    .wrapper { max-width: 600px; margin: 32px auto; background: white; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0A1357, #1E1E8C); padding: 28px 32px; }
    .header h1 { color: white; margin: 0; font-size: 20px; }
    .header p { color: #a5b4fc; margin: 4px 0 0; font-size: 14px; }
    .body { padding: 32px; }
    .section-title { font-size: 12px; font-weight: bold; color: #8988AF; text-transform: uppercase; letter-spacing: 1px; margin: 24px 0 8px; }
    .field { margin-bottom: 12px; }
    .field label { font-size: 12px; color: #6b7280; display: block; margin-bottom: 2px; }
    .pill { display: inline-block; background: #f3f4f6; border: 1px solid #DEDFED; border-radius: 6px; padding: 4px 12px; font-size: 13px; color: #0A1357; margin-right: 8px; }
    .footer { background: #f9fafb; border-top: 1px solid #DEDFED; padding: 20px 32px; font-size: 12px; color: #8988AF; }
    .cta { display: inline-block; background: #2B5BD7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; margin-top: 20px; }
    hr { border: none; border-top: 1px solid #DEDFED; margin: 24px 0; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <h1>New Student Lead</h1>
      <p>Via Creator: <strong style="color:white">${lead.creator_name}</strong> (@${lead.creator_username})</p>
    </div>
    <div class="body">
      <div class="section-title">Student Details</div>
      <div class="field"><label>Full Name</label>${lead.student_name}</div>
      <div class="field"><label>Email</label>${lead.student_email}</div>
      <div class="field"><label>Phone</label>${lead.student_phone}</div>
      ${lead.city ? `<div class="field"><label>City</label>${lead.city}</div>` : ""}
      <hr>
      <div class="section-title">Study Preferences</div>
      ${lead.country_of_interest ? `<span class="pill">${lead.country_of_interest}</span>` : ""}
      ${lead.course_interest ? `<span class="pill">${lead.course_interest}</span>` : ""}
      ${lead.budget ? `<span class="pill">${lead.budget}</span>` : ""}
      ${lead.intake_year ? `<span class="pill">Intake ${lead.intake_year}</span>` : ""}
      ${lead.message ? `<hr><div class="section-title">Message</div><p style="background:#f9fafb;border-left:3px solid #2B5BD7;padding:12px 16px;border-radius:4px;color:#374151;">${lead.message}</p>` : ""}
      <a href="mailto:${lead.student_email}?subject=Your Study Abroad Enquiry&cc=${lead.creator_email}" class="cta">Reply to Student</a>
    </div>
    <div class="footer">Lead submitted via creators.origoabroad.com &copy; ${new Date().getFullYear()} Origo Abroad</div>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `Origo Abroad Leads <${FROM_EMAIL}>`,
        to: [ORIGO_NOTIFY_EMAIL],
        cc: [lead.creator_email],
        subject: `New Lead: ${lead.student_name} via ${lead.creator_name}`,
        html: emailHtml,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Resend error: ${err}`);
    }

    const data = await res.json();
    return new Response(JSON.stringify({ success: true, id: data.id }), {
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});
