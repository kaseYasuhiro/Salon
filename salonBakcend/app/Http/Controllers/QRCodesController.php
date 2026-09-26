<?php

namespace App\Http\Controllers;

use App\Models\QRCodes;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class QRCodesController extends Controller
{


    public function getQRCode()
    {
        $qr = QRCodes::latest()->first();

        if (!$qr) {
            return response()->json([
                'message' => 'No QR code configured yet.',
                'qr_image' => null,
                'gcash_number' => null,
            ], 200);
        }

        return response()->json([
            'id' => $qr->id,
            'qr_image' => $qr->qr_image
                ? asset('storage/' . $qr->qr_image)
                : null,
            // also return the raw path so the frontend can build its own URL if needed
            'qr_image_path' => $qr->qr_image,
            'gcash_number' => $qr->gcash_number,
            'updated_at' => $qr->updated_at,
        ], 200);
    }


    public function addQRCode(Request $request)
    {
        $request->validate([
            'qr_image' => ['required', 'image', 'mimes:png,jpg,jpeg', 'max:4096'],
            'gcash_number' => ['required', 'string', 'regex:/^09\d{9}$/'],
        ], [
            'gcash_number.regex' => 'GCash number must be 11 digits starting with 09 (e.g. 09171234567).',
        ]);

        // Store the new file
        $newPath = $request->file('qr_image')->store('qr', 'public');

        // Replace the old row (if any), and delete the old file
        $existing = QRCodes::latest()->first();

        try {
            $qr = QRCodes::create([
                'qr_image' => $newPath,
                'gcash_number' => $request->gcash_number,
            ]);

            // Only delete the old file AFTER the DB write succeeds
            if ($existing && $existing->qr_image && $existing->qr_image !== $newPath) {
                if (Storage::disk('public')->exists($existing->qr_image)) {
                    Storage::disk('public')->delete($existing->qr_image);
                }
                $existing->delete();
            }
        } catch (\Throwable $e) {
            // Roll back the uploaded file if the DB write failed
            if (Storage::disk('public')->exists($newPath)) {
                Storage::disk('public')->delete($newPath);
            }
            throw $e;
        }

        return response()->json([
            'message' => 'QR code and GCash number saved successfully.',
            'id' => $qr->id,
            'qr_image' => asset('storage/' . $qr->qr_image),
            'qr_image_path' => $qr->qr_image,
            'gcash_number' => $qr->gcash_number,
        ], 200);
    }

    public function updateGcashNumber(Request $request)
    {
        $request->validate([
            'qr_image' => ['nullable', 'image', 'mimes:png,jpg,jpeg', 'max:4096'],
            'gcash_number' => ['nullable', 'string', 'regex:/^09\d{9}$/'],
        ], [
            'gcash_number.regex' => 'GCash number must be 11 digits starting with 09 (e.g. 09171234567).',
        ]);

        // Make sure at least one field is being updated
        if (!$request->hasFile('qr_image') && !$request->filled('gcash_number')) {
            return response()->json([
                'message' => 'Nothing to update. Provide a QR image, a GCash number, or both.',
            ], 422);
        }

        $qr = QRCodes::latest()->first();

        if (!$qr) {
            return response()->json([
                'message' => 'No QR code configured yet. Please upload one first.',
            ], 404);
        }

        $oldPath = $qr->qr_image;
        $newPath = null;

        // ── Handle new QR image (optional) ──
        if ($request->hasFile('qr_image')) {
            $newPath = $request->file('qr_image')->store('qr', 'public');
            $qr->qr_image = $newPath;
        }

        // ── Handle GCash number (optional) ──
        if ($request->filled('gcash_number')) {
            $qr->gcash_number = $request->gcash_number;
        }

        try {
            $qr->save();
        } catch (\Throwable $e) {
            // If the DB write failed and we just uploaded a new file, clean it up
            if ($newPath && Storage::disk('public')->exists($newPath)) {
                Storage::disk('public')->delete($newPath);
            }
            throw $e;
        }

        // Delete the old image file only after a successful save, and only if it changed
        if ($newPath && $oldPath && $oldPath !== $newPath) {
            if (Storage::disk('public')->exists($oldPath)) {
                Storage::disk('public')->delete($oldPath);
            }
        }

        return response()->json([
            'message' => 'QR code settings updated successfully.',
            'id' => $qr->id,
            'qr_image' => asset('storage/' . $qr->qr_image),
            'qr_image_path' => $qr->qr_image,
            'gcash_number' => $qr->gcash_number,
        ], 200);
    }
}
