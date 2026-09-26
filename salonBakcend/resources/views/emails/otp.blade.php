<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OTP Verification</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f8f9fa;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            border-radius: 16px;
            box-shadow: 0 4px 24px rgba(0, 0, 0, 0.08);
            overflow: hidden;
        }
        .header {
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            padding: 30px 40px;
            text-align: center;
        }
        .header h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 700;
            margin: 0;
            letter-spacing: -0.5px;
        }
        .header p {
            color: rgba(255, 255, 255, 0.85);
            margin: 8px 0 0 0;
            font-size: 16px;
        }
        .content {
            padding: 40px;
        }
        .greeting {
            font-size: 20px;
            font-weight: 600;
            color: #1f2937;
            margin-bottom: 12px;
        }
        .message {
            color: #4b5563;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 28px;
        }
        .otp-container {
            background: #faf5ff;
            border: 2px dashed #ec4899;
            border-radius: 12px;
            padding: 20px;
            text-align: center;
            margin: 20px 0 28px 0;
        }
        .otp-code {
            font-size: 48px;
            font-weight: 700;
            letter-spacing: 12px;
            color: #ec4899;
            font-family: 'Courier New', monospace;
        }
        .otp-label {
            font-size: 14px;
            color: #6b7280;
            margin-top: 6px;
        }
        .info-box {
            background: #f3f4f6;
            border-radius: 10px;
            padding: 16px 20px;
            margin: 20px 0 28px 0;
        }
        .info-box .row {
            display: flex;
            justify-content: space-between;
            padding: 6px 0;
            font-size: 14px;
        }
        .info-box .label {
            color: #6b7280;
        }
        .info-box .value {
            color: #1f2937;
            font-weight: 500;
        }
        .divider {
            border: none;
            border-top: 1px solid #e5e7eb;
            margin: 24px 0;
        }
        .footer-text {
            color: #9ca3af;
            font-size: 13px;
            text-align: center;
            line-height: 1.6;
        }
        .footer-text strong {
            color: #6b7280;
        }
        .note {
            background: #fefce8;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 12px 16px;
            margin-top: 16px;
            font-size: 14px;
            color: #92400e;
        }
        .note .icon {
            margin-right: 8px;
        }
        @media (max-width: 480px) {
            .header { padding: 24px 20px; }
            .content { padding: 24px 20px; }
            .otp-code { font-size: 36px; letter-spacing: 8px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>🔐 {{ $purpose === 'verification' ? 'Email Verification' : 'Password Reset' }}</h1>
            <p>Your One-Time Password</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">Hello, {{ $name }}! 👋</div>
            
            <p class="message">
                {{ $purpose === 'verification' 
                    ? 'Thank you for verifying your email address. Please use the OTP below to complete your verification process.' 
                    : 'We received a request to reset your password. Use the OTP below to proceed.' 
                }}
            </p>

            <!-- OTP Code -->
            <div class="otp-container">
                <div class="otp-code">{{ $otp }}</div>
                <div class="otp-label">Your One-Time Password</div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <div class="row">
                    <span class="label">⏱️ Valid For</span>
                    <span class="value">{{ $expiry_minutes }} minutes</span>
                </div>
                <div class="row">
                    <span class="label">📋 Purpose</span>
                    <span class="value">{{ ucfirst($purpose) }}</span>
                </div>
            </div>

            <hr class="divider">

            <!-- Note -->
            <div class="note">
                <span class="icon">⚠️</span>
                <strong>Security Note:</strong> Never share this OTP with anyone. This code is valid for 
                <strong>{{ $expiry_minutes }} minutes</strong> and can only be used once.
            </div>

            <hr class="divider">

            <!-- Footer -->
            <div class="footer-text">
                <p>If you didn't request this, please ignore this email or contact support.</p>
                <p style="margin-top: 8px;">
                    <strong>Salon Management System</strong><br>
                    <span style="color: #9ca3af;">This is an automated message, please do not reply.</span>
                </p>
            </div>
        </div>
    </div>
</body>
</html>