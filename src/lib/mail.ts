import "server-only";
import nodemailer from "nodemailer";
import { config } from "./config";

let transport: nodemailer.Transporter | null = null;

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function layout(title: string, paragraphs: string[], cta?: { label: string; url: string }) {
  return `<!doctype html><html><body style="margin:0;background:#f5ede0;font-family:Georgia,serif;color:#12100d">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#fbf6ec;border:1px solid #e8cf96">
<tr><td style="background:#12100d;padding:22px 28px;color:#e8cf96;font-size:22px">AyurKesha</td></tr>
<tr><td style="padding:28px">
<h1 style="font-weight:400;font-size:24px;margin:0 0 16px">${esc(title)}</h1>
${paragraphs.map((p) => `<p style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;margin:0 0 14px">${esc(p)}</p>`).join("")}
${cta ? `<p style="margin:24px 0 8px"><a href="${cta.url}" style="background:#c9a45c;color:#12100d;padding:12px 22px;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:.1em;text-transform:uppercase">${esc(cta.label)}</a></p>` : ""}
</td></tr>
<tr><td style="padding:16px 28px;font-family:Arial,sans-serif;font-size:12px;color:#5b6427;border-top:1px solid #ece1cf">
Questions? Reply to this email or WhatsApp ${esc(config.seller.phone)}.</td></tr>
</table></td></tr></table></body></html>`;
}

export async function sendMail(to: string, subject: string, paragraphs: string[], cta?: { label: string; url: string }) {
  const html = layout(subject, paragraphs, cta);
  if (!config.smtp.host) {
    console.log(`\n[mail] to=${to} subject="${subject}"\n  ${paragraphs.join("\n  ")}${cta ? `\n  -> ${cta.url}` : ""}\n`);
    return;
  }
  transport ??= nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.port === 465,
    auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
  });
  try {
    await transport.sendMail({ from: config.smtp.from, to, subject, html, replyTo: config.seller.email });
  } catch (e) {
    console.error("[mail] failed", to, subject, e);
  }
}
