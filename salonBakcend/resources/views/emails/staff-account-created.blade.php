<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Staff Account Created</title>
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
        .credentials-container {
            background: #faf5ff;
            border: 2px dashed #ec4899;
            border-radius: 12px;
            padding: 24px 20px;
            margin: 20px 0 28px 0;
        }
        .credentials-title {
            font-size: 14px;
            color: #6b7280;
            text-align: center;
            margin-bottom: 16px;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .credential-row {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid rgba(236, 72, 153, 0.15);
        }
        .credential-row:last-child {
            border-bottom: none;
        }
        .credential-label {
            font-size: 14px;
            color: #6b7280;
        }
        .credential-value {
            font-size: 15px;
            font-weight: 700;
            color: #ec4899;
            font-family: 'Courier New', monospace;
            letter-spacing: 1px;
            word-break: break-all;
            text-align: right;
            max-width: 60%;
        }
        .credential-value.email-value {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            letter-spacing: 0;
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
        .cta {
            text-align: center;
            margin: 28px 0 8px 0;
        }
        .cta span {
            display: inline-block;
            background: linear-gradient(135deg, #ec4899 0%, #db2777 100%);
            color: #ffffff;
            padding: 12px 28px;
            border-radius: 9999px;
            font-size: 14px;
            font-weight: 700;
            letter-spacing: 0.3px;
        }
        @media (max-width: 480px) {
            .header { padding: 24px 20px; }
            .content { padding: 24px 20px; }
            .credential-value { font-size: 14px; }
            .credentials-container { padding: 18px 16px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- Header -->
        <div class="header">
            <h1>👋 Welcome Aboard</h1>
            <p>Your Staff Account Details</p>
        </div>

        <!-- Content -->
        <div class="content">
            <div class="greeting">Hello, {{ $staffData['first_name'] }} {{ $staffData['last_name'] }}! 👋</div>

            <p class="message">
                An account has been created for you on the <strong>Reshel Oco Hair Salon Management System</strong>.
                Please find your login credentials below. We recommend changing your password after your first login.
            </p>

            <!-- Credentials Box -->
            <div class="credentials-container">
                <div class="credentials-title">Your Login Credentials</div>

                <div class="credential-row">
                    <span class="credential-label">📧 Email</span>
                    <span class="credential-value email-value">{{ $staffData['email'] }}</span>
                </div>

                <div class="credential-row">
                    <span class="credential-label">🔑 Password</span>
                    <span class="credential-value">{{ $staffData['password'] }}</span>
                </div>
            </div>

            <!-- Info Box -->
            <div class="info-box">
                <div class="row">
                    <span class="label">👤 Role</span>
                    <span class="value">{{ ucfirst($staffData['role']) }}</span>
                </div>
                <div class="row">
                    <span class="label">📱 Phone</span>
                    <span class="value">{{ $staffData['phone_number'] }}</span>
                </div>
                <div class="row">
                    <span class="label">📅 Created On</span>
                    <span class="value">{{ now()->format('F j, Y') }}</span>
                </div>
            </div>

            <hr class="divider">

            <!-- Note -->
            <div class="note">
                <span class="icon">⚠️</span>
                <strong>Security Note:</strong> Please change your password after your first login.
                Never share your credentials with anyone. If you did not expect this email, please contact the salon owner immediately.
            </div>

            <hr class="divider">

            <!-- CTA -->
            <div class="cta">
                <span>Welcome to the team!</span>
            </div>

            <hr class="divider">

            <!-- Footer -->
            <div class="footer-text">
                <p>If you have questions about your account, please contact the salon owner.</p>
                <p style="margin-top: 8px;">
                    <strong>Reshel Oco Hair Salon</strong><br>
                    <span style="color: #9ca3af;">This is an automated message, please do not reply.</span>
                </p>
            </div>
        </div>
    </div>
</body>
</html>