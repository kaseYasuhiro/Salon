<?php

namespace App\Http\Controllers;

use App\Models\Otps;
use App\Models\User;
use App\Mail\OTPMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class OTPController extends Controller
{
    // Generate and send OTP
    public function sendOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'purpose' => 'sometimes|in:verification,reset'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $user = User::where('email', $email)->first();
        
        // Debug: Log the email being used
        \Log::info('Sending OTP to email: ' . $email);
        \Log::info('User found: ' . ($user ? $user->email : 'No user found'));
        
        $purpose = $request->purpose ?? 'verification';

        // Generate 6-digit OTP
        $otpCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        // Delete old OTPs for this email
        Otps::where('email', $email)->delete();

        // Save new OTP
        $otp = Otps::create([
            'user_id' => $user->id,
            'email' => $email,
            'otp' => $otpCode,
            'expires_at' => now()->addMinutes(10),
            'is_used' => false
        ]);

        try {
            // Send OTP via email - using the correct recipient
            Mail::to($email)->send(new OTPMail($otpCode, $user->first_name, $purpose));

            // Debug: Log what was sent
            \Log::info('OTP sent successfully to: ' . $email);

            return response()->json([
                'message' => 'OTP sent successfully',
                'data' => [
                    'email' => $email,
                    'expires_at' => $otp->expires_at,
                    'purpose' => $purpose
                ]
            ], 200);

        } catch (\Exception $e) {
            // Delete the OTP if email fails
            $otp->delete();

            \Log::error('Failed to send OTP: ' . $e->getMessage());
            \Log::error('Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'message' => 'Failed to send OTP. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    // Verify OTP
    public function verifyOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'otp' => 'required|string|size:6'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $otp = Otps::where('email', $request->email)
            ->where('otp', $request->otp)
            ->first();

        if (!$otp) {
            return response()->json([
                'message' => 'Invalid OTP',
                'errors' => ['otp' => ['The OTP is invalid.']]
            ], 400);
        }

        if (!$otp->isValid()) {
            return response()->json([
                'message' => 'OTP has expired or already been used',
                'errors' => ['otp' => ['The OTP has expired or has already been used.']]
            ], 400);
        }

        // Mark OTP as used
        $otp->update(['is_used' => true]);

        // Mark user's email as verified
        $user = User::where('email', $request->email)->first();
        if ($user && !$user->email_verified_at) {
            $user->update([
                'email_verified_at' => now()
            ]);
            Log::info('Email verified for user: ' . $user->email);
        }

        return response()->json([
            'message' => 'Email verified successfully',
            'data' => [
                'email' => $otp->email,
                'user_id' => $otp->user_id,
                'email_verified' => true
            ]
        ], 200);
    }

    // Resend OTP
    public function resendOTP(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'email' => 'required|email|exists:users,email',
            'purpose' => 'sometimes|in:verification,reset'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $email = $request->email;
        $user = User::where('email', $email)->first();
        $purpose = $request->purpose ?? 'verification';

        // Delete old OTPs
        Otps::where('email', $email)->delete();

        // Generate new OTP
        $otpCode = str_pad(random_int(0, 999999), 6, '0', STR_PAD_LEFT);

        $otp = Otps::create([
            'user_id' => $user->id,
            'email' => $email,
            'otp' => $otpCode,
            'expires_at' => now()->addMinutes(10),
            'is_used' => false
        ]);

        try {
            Mail::to($email)->send(new OTPMail($otpCode, $user->first_name, $purpose));

            return response()->json([
                'message' => 'OTP resent successfully',
                'data' => [
                    'email' => $email,
                    'expires_at' => $otp->expires_at
                ]
            ], 200);

        } catch (\Exception $e) {
            $otp->delete();

            return response()->json([
                'message' => 'Failed to resend OTP. Please try again.',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}