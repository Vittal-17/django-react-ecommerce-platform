import os
import requests
from dotenv import load_dotenv

load_dotenv()

def _send_brevo_email(to_email, subject, html_content):
    """Core function to talk to Brevo API"""
    api_key = os.environ.get("BREVO_API_KEY")
    if not api_key:
        print("[EMAIL ERROR] ❌ BREVO_API_KEY is missing!")
        return False

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": "EazyShop Team", "email": "updates.eazyshop@gmail.com"},
        "to": [{"email": to_email}],
        "subject": subject,
        "htmlContent": html_content
    }
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        print(f"[EMAIL LOG] ✅ Sent to {to_email} | Subject: {subject}")
        return True
    except requests.exceptions.RequestException as e:
        error_details = e.response.text if e.response else str(e)
        print(f"[EMAIL ERROR] ❌ Brevo API failed: {error_details}")
        return False

def get_base_template(header_color, header_title, icon, body_html):
    """The Premium Master Layout with dynamic theme colors and prominent branding."""
    # Your official site theme color
    BRAND_GREEN = "#16a34a" 
    
    return f"""
    <div style="background-color: #f4f5f7; padding: 40px 10px; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 15px 35px rgba(0,0,0,0.05); border: 1px solid #eaeaea;">
            
            <div style="padding: 30px 20px; text-align: center; border-bottom: 2px solid #f8fafc;">
                <h1 style="margin: 0; font-size: 32px; font-weight: 900; color: {BRAND_GREEN}; letter-spacing: -1.5px;">
                    EazyShop<span style="color: #0f172a;">.</span>
                </h1>
            </div>

            <div style="background-color: {header_color}; padding: 30px 20px; text-align: center;">
                <h2 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">
                    <span style="font-size: 26px; vertical-align: middle; margin-right: 8px;">{icon}</span> 
                    <span style="vertical-align: middle;">{header_title}</span>
                </h2>
            </div>
            
            <div style="padding: 40px 35px; color: #374151;">
                {body_html}
            </div>
            
            <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e2e8f0;">
                <p style="margin: 0; color: #64748b; font-size: 13px;">Premium Quality, Delivered Fast.</p>
                <p style="margin: 15px 0 0 0; color: #94a3b8; font-size: 12px;">© 2026 EazyShop Inc. All rights reserved.</p>
            </div>
        </div>
    </div>
    """

def send_welcome_email(to_email, username):
    theme_color = "#4F46E5" # Deep Royal Indigo
    subject = "Welcome to EazyShop! 🎉"
    
    body = f"""
    <h2 style="margin-top: 0; color: #0f172a; font-size: 22px; font-weight: 700;">Welcome aboard, {username}!</h2>
    <p style="font-size: 16px; color: #475569;">We are thrilled to have you join the EazyShop family. Get ready to discover amazing products, unbeatable prices, and lightning-fast delivery.</p>
    
    <div style="text-align: center; margin: 45px 0;">
        <a href="http://localhost:3000/products" style="background-color: {theme_color}; color: #ffffff; text-decoration: none; padding: 16px 36px; border-radius: 50px; font-size: 16px; font-weight: 700; display: inline-block; box-shadow: 0 10px 20px rgba(79, 70, 229, 0.25); text-transform: uppercase; letter-spacing: 1px;">Start Shopping Now</a>
    </div>
    
    <p style="font-size: 15px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 20px; text-align: center;">If you ever need help, just reply to this email. Our support team has your back.</p>
    """
    html = get_base_template(theme_color, "Account Created", "👋", body)
    return _send_brevo_email(to_email, subject, html)

def send_otp_email(to_email, username, otp):
    theme_color = "#0F172A" # Midnight Slate
    subject = "Your EazyShop Security Code 🔐"
    
    body = f"""
    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hello {username},</h2>
    <p style="font-size: 16px; color: #475569;">A request was made to verify your identity. Please use the secure authorization code below:</p>
    
    <div style="text-align: center; margin: 40px 0;">
        <div style="background-color: #f1f5f9; border: 2px dashed #94a3b8; border-radius: 12px; padding: 25px 40px; display: inline-block; box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);">
            <span style="font-size: 42px; font-weight: 900; color: #0f172a; letter-spacing: 12px; margin-right: -12px;">{otp}</span>
        </div>
    </div>
    
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; border-radius: 0 8px 8px 0;">
        <p style="font-size: 14px; color: #b91c1c; margin: 0; font-weight: 600;">⚠️ Security Notice</p>
        <p style="font-size: 13px; color: #991b1b; margin: 5px 0 0 0;">This code expires in 5 minutes. If you didn't request this, you can safely ignore this message.</p>
    </div>
    """
    html = get_base_template(theme_color, "Security Verification", "🛡️", body)
    return _send_brevo_email(to_email, subject, html)

def send_order_email(to_email, username, order_id, status, total, payment_method, txn_id, address):
    status = status.lower()
    
    if status == 'pending':
        theme_color = "#2563EB"
        icon = "🧾"
        header_title = "Order Confirmed"
        subject = f"Order Confirmation: #{order_id} has been placed!"
        intro = "Great news! We have received your payment and your order is currently being prepared for shipment."
    elif status == 'shipped':
        theme_color = "#EA580C"
        icon = "🚚"
        header_title = "Order Shipped"
        subject = f"Update: Order #{order_id} is on its way!"
        intro = "Pack your bags (or just wait by the door)—your order has left our facility and is en route to your address!"
    elif status == 'delivered':
        theme_color = "#10B981"
        icon = "📦"
        header_title = "Order Delivered"
        subject = f"Delivered: Order #{order_id} has arrived!"
        intro = "Success! Your package has been safely delivered. We hope you love your new items."
    elif status == 'cancelled':
        theme_color = "#E11D48"
        icon = "❌"
        header_title = "Order Cancelled"
        subject = f"Cancelled: Order #{order_id}"
        intro = "Your order has been cancelled. If a charge was made, it will be refunded to your original payment method within 3-5 business days."
    else:
        theme_color = "#475569"
        icon = "📋"
        header_title = f"Order {status.capitalize()}"
        subject = f"Update on Order #{order_id}"
        intro = f"There is an update on your order. The new status is: {status.upper()}"

    body = f"""
    <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hi {username},</h2>
    <p style="font-size: 16px; color: #475569;">{intro}</p>
    
    <div style="background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; margin: 35px 0; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <div style="background-color: {theme_color}15; padding: 15px 25px; border-bottom: 1px solid #e2e8f0;">
            <h3 style="margin: 0; color: {theme_color}; font-size: 13px; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 800;">Receipt Details</h3>
        </div>
        <div style="padding: 25px;">
            <table style="width: 100%; font-size: 15px; color: #334155; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; color: #64748b;">Order ID</td>
                    <td style="padding: 12px 0; text-align: right; border-bottom: 1px dashed #cbd5e1; font-weight: 600; color: #0f172a;">#{order_id}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; color: #64748b;">Current Status</td>
                    <td style="padding: 12px 0; text-align: right; border-bottom: 1px dashed #cbd5e1; font-weight: 800; color: {theme_color};">{status.upper()}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 1px dashed #cbd5e1; color: #64748b;">Payment Method</td>
                    <td style="padding: 12px 0; text-align: right; border-bottom: 1px dashed #cbd5e1; font-weight: 500;">{payment_method}</td>
                </tr>
                <tr>
                    <td style="padding: 12px 0; border-bottom: 2px solid #e2e8f0; color: #64748b;">Delivery To</td>
                    <td style="padding: 12px 0; text-align: right; border-bottom: 2px solid #e2e8f0; font-size: 14px; line-height: 1.4;">{address}</td>
                </tr>
                <tr>
                    <td style="padding: 18px 0 0 0; color: #0f172a; font-weight: 700; font-size: 16px;">Total Amount</td>
                    <td style="padding: 18px 0 0 0; text-align: right; font-weight: 900; font-size: 22px; color: #0f172a;">${total}</td>
                </tr>
            </table>
        </div>
    </div>
    
    <p style="font-size: 14px; text-align: center; color: #64748b; margin-top: 30px;">
        Track your full order history anytime in your <a href="http://localhost:3000/dashboard" style="color: {theme_color}; text-decoration: none; font-weight: 600;">EazyShop Dashboard</a>.
    </p>
    """
    html = get_base_template(theme_color, header_title, icon, body)
    return _send_brevo_email(to_email, subject, html)