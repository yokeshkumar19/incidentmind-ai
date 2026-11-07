import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
import httpx

from backend.app.core.config import settings

logger = logging.getLogger("incidentmind.email")


class EmailService:
    @staticmethod
    def _send_via_smtp(to_email: str, subject: str, html_content: str, text_content: str) -> bool:
        """Sends an email using configured SMTP server."""
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = settings.SMTP_FROM_EMAIL
            msg["To"] = to_email

            part1 = MIMEText(text_content, "plain")
            part2 = MIMEText(html_content, "html")
            msg.attach(part1)
            msg.attach(part2)

            ports_to_try = [465, 587] if settings.SMTP_PORT == 465 else [settings.SMTP_PORT, 465, 587]
            ports_to_try = list(dict.fromkeys(ports_to_try))

            for port in ports_to_try:
                try:
                    if port == 465:
                        server = smtplib.SMTP_SSL(settings.SMTP_HOST, 465, timeout=7)
                    else:
                        server = smtplib.SMTP(settings.SMTP_HOST, port, timeout=7)
                        if settings.SMTP_USE_TLS:
                            server.starttls()

                    if settings.SMTP_PASSWORD:
                        server.login(settings.SMTP_USER, settings.SMTP_PASSWORD.replace(" ", ""))

                    server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
                    server.quit()
                    logger.info(f"Email successfully delivered to {to_email} via SMTP on port {port}.")
                    return True
                except Exception as port_err:
                    logger.warning(f"SMTP attempt on port {port} failed: {port_err}")

            return False
        except Exception as e:
            logger.error(f"SMTP delivery failed to {to_email}: {e}")
            return False

    @staticmethod
    def _send_via_resend(to_email: str, subject: str, html_content: str) -> bool:
        """Sends an email using Resend API if RESEND_API_KEY is configured."""
        if not settings.RESEND_API_KEY:
            return False

        try:
            url = "https://api.resend.com/emails"
            headers = {
                "Authorization": f"Bearer {settings.RESEND_API_KEY.strip()}",
                "Content-Type": "application/json",
            }
            # Default to onboarding@resend.dev for test accounts without custom DNS domains
            from_sender = settings.RESEND_FROM_EMAIL or "IncidentMind AI <onboarding@resend.dev>"
            payload = {
                "from": from_sender,
                "to": [to_email],
                "subject": subject,
                "html": html_content,
            }
            with httpx.Client(timeout=10) as client:
                res = client.post(url, headers=headers, json=payload)
                if res.is_success:
                    logger.info(f"Email delivered to {to_email} via Resend.")
                    return True
                
                # If custom domain was rejected (e.g. unverified), retry with sandbox onboarding@resend.dev
                if res.status_code in (400, 403) and "onboarding@resend.dev" not in from_sender:
                    logger.warning(f"Resend rejected sender '{from_sender}'. Retrying with 'onboarding@resend.dev'...")
                    payload["from"] = "IncidentMind AI <onboarding@resend.dev>"
                    retry_res = client.post(url, headers=headers, json=payload)
                    if retry_res.is_success:
                        logger.info(f"Email delivered to {to_email} via Resend sandbox sender.")
                        return True
                    else:
                        logger.warning(f"Resend sandbox retry returned {retry_res.status_code}: {retry_res.text}")
                else:
                    logger.warning(f"Resend returned status {res.status_code}: {res.text}")
                return False
        except Exception as e:
            logger.error(f"Resend delivery failed to {to_email}: {e}")
            return False

    @classmethod
    def send_email(cls, to_email: str, subject: str, html_content: str, text_content: str) -> dict:
        """Dispatches an email via Resend, SMTP, or fallback to server console logger."""
        # 1. First try direct SMTP (e.g. Gmail) via SSL port 465 or TLS port 587
        if settings.SMTP_HOST and cls._send_via_smtp(to_email, subject, html_content, text_content):
            return {"status": "sent", "channel": "smtp", "recipient": to_email}

        # 2. Fall back to Resend HTTP API
        if settings.RESEND_API_KEY and cls._send_via_resend(to_email, subject, html_content):
            return {"status": "sent", "channel": "resend", "recipient": to_email}

        # 3. Development / Sandbox fallback logger
        logger.info(
            f"\n"
            f"==================== [OUTGOING EMAIL DISPATCH] ====================\n"
            f"TO:      {to_email}\n"
            f"FROM:    {settings.SMTP_FROM_EMAIL}\n"
            f"SUBJECT: {subject}\n"
            f"CONTENT:\n{text_content}\n"
            f"===================================================================\n"
        )
        return {"status": "dispatched_local", "channel": "console", "recipient": to_email}

    @classmethod
    def send_password_reset(cls, to_email: str, user_name: str, reset_token: str, reset_link: str) -> dict:
        """Sends a secure password reset link to the user."""
        subject = "Reset your IncidentMind AI password"
        text_content = (
            f"Hello {user_name},\n\n"
            f"We received a request to reset your IncidentMind AI password.\n\n"
            f"Click the link below to set a new password:\n"
            f"{reset_link}\n\n"
            f"Your reset code is: {reset_token}\n\n"
            f"This link expires in 15 minutes. If you did not request this, you can ignore this email.\n\n"
            f"— The IncidentMind AI Team"
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FFF7E8; margin: 0; padding: 30px; }}
            .card {{ max-width: 560px; margin: 0 auto; background: #ffffff; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0 #171717; overflow: hidden; }}
            .header {{ background: #FF5A1F; padding: 24px 30px; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; }}
            .body {{ padding: 32px 30px; color: #171717; font-size: 15px; line-height: 1.6; }}
            .btn {{ display: inline-block; background: #3155E7; color: #ffffff !important; padding: 14px 28px; font-size: 14px; font-weight: 900; text-decoration: none; border-radius: 14px; border: 2px solid #171717; box-shadow: 3px 3px 0 #171717; margin: 20px 0; }}
            .code-box {{ background: #F3F4F6; border: 2px dashed #171717; border-radius: 12px; padding: 12px 16px; font-family: monospace; font-size: 13px; word-break: break-all; margin: 15px 0; }}
            .footer {{ background: #FAFAFA; border-top: 1px solid #E5E7EB; padding: 16px 30px; font-size: 12px; color: #6B7280; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>IncidentMind AI</h1>
            </div>
            <div class="body">
              <h2 style="margin-top: 0; font-size: 20px; font-weight: 800;">Password Reset Request</h2>
              <p>Hi <strong>{user_name}</strong>,</p>
              <p>We received a request to reset your password. Click the button below to choose a new password for your account:</p>
              <div style="text-align: center;">
                <a href="{reset_link}" class="btn">Reset My Password &rarr;</a>
              </div>
              <p style="font-size: 13px; color: #4B5563; text-align: center; margin-bottom: 8px;">Or enter this 6-digit verification code directly on the reset screen:</p>
              <div style="background: #F8FAFC; border: 2px dashed #171717; border-radius: 14px; padding: 16px 20px; text-align: center; margin: 15px auto; max-width: 280px;">
                <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #64748B; margin-bottom: 4px;">6-Digit Reset Code</div>
                <div style="font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 900; letter-spacing: 8px; color: #0F172A;">{reset_token}</div>
              </div>
              <p style="font-size: 12px; color: #6B7280; text-align: center; margin-top: 15px;">This code expires in 15 minutes. If you did not initiate this request, you can safely disregard this email.</p>
            </div>
            <div class="footer">
              IncidentMind AI &middot; Reliability Command & Organizational Memory
            </div>
          </div>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content, text_content)

    @classmethod
    def send_team_invite(
        cls,
        to_email: str,
        inviter_name: str,
        team_name: str,
        invite_code: str,
        role: str,
        invite_link: str,
    ) -> dict:
        """Sends an invitation email to a colleague to join an incident command workspace."""
        subject = f"{inviter_name} invited you to join '{team_name}' on IncidentMind AI"
        text_content = (
            f"Hello,\n\n"
            f"{inviter_name} has invited you to collaborate in the '{team_name}' incident command workspace as a {role}.\n\n"
            f"Join using this link:\n{invite_link}\n\n"
            f"Workspace Invite Code: {invite_code}\n\n"
            f"— The IncidentMind AI Team"
        )

        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #FFF7E8; margin: 0; padding: 30px; }}
            .card {{ max-width: 560px; margin: 0 auto; background: #ffffff; border: 3px solid #171717; border-radius: 20px; box-shadow: 6px 6px 0 #171717; overflow: hidden; }}
            .header {{ background: #3155E7; padding: 24px 30px; color: #ffffff; }}
            .header h1 {{ margin: 0; font-size: 24px; font-weight: 900; }}
            .badge {{ display: inline-block; background: #D6FF45; color: #171717; font-weight: 900; font-size: 11px; padding: 4px 10px; border-radius: 20px; margin-top: 6px; text-transform: uppercase; letter-spacing: 0.5px; }}
            .body {{ padding: 32px 30px; color: #171717; font-size: 15px; line-height: 1.6; }}
            .btn {{ display: inline-block; background: #FF5A1F; color: #ffffff !important; padding: 14px 28px; font-size: 14px; font-weight: 900; text-decoration: none; border-radius: 14px; border: 2px solid #171717; box-shadow: 3px 3px 0 #171717; margin: 20px 0; }}
            .code-pill {{ display: inline-block; background: #171717; color: #D6FF45; font-family: monospace; font-size: 16px; font-weight: 900; padding: 8px 16px; border-radius: 10px; letter-spacing: 2px; margin: 10px 0; }}
            .footer {{ background: #FAFAFA; border-top: 1px solid #E5E7EB; padding: 16px 30px; font-size: 12px; color: #6B7280; text-align: center; }}
          </style>
        </head>
        <body>
          <div class="card">
            <div class="header">
              <h1>IncidentMind AI</h1>
              <span class="badge">Team Invitation</span>
            </div>
            <div class="body">
              <h2 style="margin-top: 0; font-size: 20px; font-weight: 800;">You're Invited to Collaborate</h2>
              <p><strong>{inviter_name}</strong> has invited you to join the <strong>{team_name}</strong> workspace as an <strong>{role}</strong>.</p>
              <p>Together you will diagnose live telemetry, analyze root causes with Groq AI, and build institutional memory with Hindsight.</p>
              <div style="text-align: center;">
                <div>Your Workspace Invite Code:</div>
                <div class="code-pill">{invite_code}</div>
                <br>
                <a href="{invite_link}" class="btn">Accept Invitation & Join &rarr;</a>
              </div>
              <p style="font-size: 12px; color: #6B7280; margin-top: 25px;">If you already have an account, navigate to Profile &rarr; Join Team and enter code <code>{invite_code}</code>.</p>
            </div>
            <div class="footer">
              IncidentMind AI &middot; Reliability Command & Organizational Memory
            </div>
          </div>
        </body>
        </html>
        """
        return cls.send_email(to_email, subject, html_content, text_content)


email_service = EmailService()

