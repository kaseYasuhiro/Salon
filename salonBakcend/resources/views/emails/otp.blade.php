<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Email Verification - Reshel Oco Hair Salon</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #f9fafb;
            margin: 0;
            padding: 20px;
        }
        
        .container {
            max-width: 560px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 24px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        }
        
        /* Header Section */
        .header {
            background: linear-gradient(135deg, #ec4899 0%, #f472b6 50%, #fbcfe8 100%);
            padding: 48px 32px;
            text-align: center;
        }
        
        .logo-icon {
            width: 64px;
            height: 64px;
            background-color: rgba(255, 255, 255, 0.2);
            border-radius: 20px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 24px;
        }
        
        .logo-icon svg {
            width: 32px;
            height: 32px;
            color: white;
        }
        
        .salon-name {
            color: white;
            font-size: 18px;
            font-weight: 500;
            margin-bottom: 8px;
            letter-spacing: 0.5px;
        }
        
        .welcome-title {
            color: white;
            font-size: 32px;
            font-weight: 700;
            margin-top: 16px;
            margin-bottom: 8px;
        }
        
        .subtitle {
            color: rgba(255, 255, 255, 0.9);
            font-size: 16px;
            margin-top: 8px;
        }
        
        /* Content Section */
        .content {
            padding: 40px 32px;
        }
        
        .greeting {
            font-size: 24px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
        }
        
        .message {
            color: #6b7280;
            line-height: 1.6;
            margin-bottom: 32px;
            font-size: 16px;
        }
        
        /* OTP Box */
        .otp-container {
            background: linear-gradient(135deg, #fdf2f8 0%, #fce7f3 100%);
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            margin-bottom: 32px;
            border: 1px solid #fbcfe8;
        }
        
        .otp-label {
            color: #9ca3af;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 16px;
        }
        
        .otp-code {
            font-size: 48px;
            font-weight: 800;
            letter-spacing: 12px;
            color: #ec4899;
            background-color: white;
            padding: 20px 24px;
            border-radius: 12px;
            display: inline-block;
            font-family: 'Courier New', monospace;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        /* Info Box */
        .info-box {
            background-color: #f9fafb;
            border-radius: 12px;
            padding: 20px;
            margin-bottom: 32px;
            border-left: 4px solid #ec4899;
        }
        
        .info-title {
            font-weight: 600;
            color: #374151;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .info-text {
            color: #6b7280;
            font-size: 14px;
            line-height: 1.5;
        }
        
        .info-text strong {
            color: #ec4899;
        }
        
        /* Button */
        .button-container {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .button {
            background: linear-gradient(135deg, #ec4899 0%, #f472b6 100%);
            color: white;
            padding: 14px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            display: inline-block;
            transition: transform 0.2s, box-shadow 0.2s;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }
        
        .button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }
        
        /* Divider */
        .divider {
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        
        /* Footer */
        .footer {
            background-color: #f9fafb;
            padding: 24px 32px;
            text-align: center;
        }
        
        .footer-text {
            color: #9ca3af;
            font-size: 12px;
            line-height: 1.5;
            margin-bottom: 8px;
        }
        
        .social-icons {
            margin-top: 16px;
            display: flex;
            justify-content: center;
            gap: 16px;
        }
        
        .social-icon {
            width: 32px;
            height: 32px;
            background-color: #f3f4f6;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
        }
        
        .social-icon:hover {
            background-color: #e5e7eb;
        }
        
        .tagline {
            color: #d1d5db;
            font-size: 11px;
            margin-top: 16px;
        }
        
        /* Responsive */
        @media (max-width: 480px) {
            .container {
                border-radius: 16px;
            }
            
            .header {
                padding: 32px 20px;
            }
            
            .content {
                padding: 32px 20px;
            }
            
            .otp-code {
                font-size: 32px;
                letter-spacing: 8px;
                padding: 16px 20px;
            }
            
            .welcome-title {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header Section -->
        <div class="header">
            <div class="logo-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-4.879 4.879M12 12L7.121 7.121m0 5.758l3.879-3.879m-4.94 4.94L5 19" />
                </svg>
            </div>
            <div class="salon-name">Reshel Oco Hair Salon</div>
            <h1 class="welcome-title">Verify Your Email</h1>
            <p class="subtitle">Complete your registration</p>
        </div>
        
        <!-- Content Section -->
        <div class="content">
            <h2 class="greeting">Hello!</h2>
            <p class="message">
                Thank you for choosing Reshel Oco Hair Salon. Please use the verification code below to complete your registration and start booking your appointments.
            </p>
            
            <!-- OTP Code Box -->
            <div class="otp-container">
                <div class="otp-label">Your Verification Code</div>
                <div class="otp-code">{{$otp}}</div>
                <p class="info-text" style="margin-top: 16px; font-size: 12px;">
                    This code will expire in <strong>10 minutes</strong>
                </p>
            </div>
            
            <!-- Info Box -->
            <div class="info-box">
                <div class="info-title">🔒 Why are we sending this?</div>
                <div class="info-text">
                    To ensure the security of your account and verify that this email address belongs to you.
                </div>
            </div>
            
            
            <div class="divider"></div>
            
            <div class="info-box" style="background-color: #fef2f2; border-left-color: #f97316;">
                <div class="info-title">⚠️ Didn't request this?</div>
                <div class="info-text">
                    If you didn't create an account with Reshel Oco Hair Salon, please ignore this email. No further action is required.
                </div>
            </div>
        </div>
        
        <!-- Footer Section -->
        <div class="footer">
            <p class="footer-text">
                This verification code will expire in 10 minutes for security purposes.
            </p>
            <p class="footer-text">
                If you're having trouble verifying your account, please contact our support team at <br>
                <a href="mailto:support@resheloco.com" style="color: #ec4899; text-decoration: none;">support@resheloco.com</a>
            </p>
            
            <div class="social-icons">
                <a href="#" class="social-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                        <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
                    </svg>
                </a>
                <a href="#" class="social-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                        <path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"/>
                    </svg>
                </a>
                <a href="#" class="social-icon">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6b7280" stroke-width="2">
                        <rect x="2" y="2" width="20" height="20" rx="4" ry="4"/>
                        <circle cx="8.5" cy="8.5" r="2.5"/>
                        <path d="M21 15l-5-4-3 3-4-4-5 5"/>
                    </svg>
                </a>
            </div>
            
            <div class="tagline">
                Reshel Oco Hair Salon — Your Beauty, Our Passion
            </div>
            <div class="tagline" style="margin-top: 8px;">
                © 2024 Reshel Oco Hair Salon. All rights reserved.
            </div>
        </div>
    </div>
</body>
</html>