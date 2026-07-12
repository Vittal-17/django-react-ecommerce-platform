import resend
import os

resend.api_key = os.environ.get("RESEND_API_KEY")

def send_transactional_email(to_email, subject, text_content):
    try:
        params = {
            "from": "ShopEazy <onboarding@resend.dev>", # Use your verified domain here later
            "to": [to_email],
            "subject": subject,
            "text": text_content,
        }
        resend.Emails.send(params)
        print(f"[EMAIL LOG] ✅ Resend sent email to {to_email}")
    except Exception as e:
        print(f"[EMAIL ERROR] ❌ Resend failed: {str(e)}")