import os
import requests

def send_transactional_email(to_email, subject, text_content):
    """
    Sends an email using Brevo's extremely fast REST API.
    """
    api_key = os.environ.get("BREVO_API_KEY")
    
    # 🚨 CRITICAL: This MUST be the email address you used to sign up for Brevo, 
    # or an email address you have explicitly verified in their dashboard.
    sender_email = "updates.eazyshop@gmail.com" 
    
    url = "https://api.brevo.com/v3/smtp/email"
    
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    
    payload = {
        "sender": {"name": "ShopEazy Team", "email": sender_email},
        "to": [{"email": to_email}],
        "subject": subject,
        "textContent": text_content
    }
    
    try:
        # Fire the request to Brevo
        response = requests.post(url, json=payload, headers=headers)
        
        # This checks if Brevo rejected the email (e.g., 401 Unauthorized, 400 Bad Request)
        response.raise_for_status() 
        
        print(f"[EMAIL LOG] ✅ Brevo sent successfully to {to_email}")
        return True
        
    except requests.exceptions.RequestException as e:
        # If it fails, print the exact reason Brevo rejected it
        error_details = e.response.text if e.response else str(e)
        print(f"[EMAIL ERROR] ❌ Brevo API failed: {error_details}")
        return False