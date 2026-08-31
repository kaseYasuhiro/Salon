<?php

namespace App\Http\Controllers;

use App\Models\Refunds;
use Illuminate\Http\Request;

class RefundsController extends Controller
{

    public function submitRefund(Request $request)
    {
        $request->validate([
            'payment_id' => ['required', 'numeric'],
            'appointment_id' => ['required', 'numeric'],
            'refund_amount' => ['required', 'numeric'],
            'refund_method' => ['required', 'string'],
            'refund_reason' => ['required', 'string'],
            'status' => ['required', 'string'],
            'processed_at' => ['required', 'date', 'date_format:Y-m-d']
        ]);

        Refunds::create([
            'payment_id' => $request->payment_id,
            'appointment_id' => $request->appointment_id,
            'refund_amount' => $request->refund_amount,
            'refund_method' => $request->refund_method,
            'refund_reason' => $request->refund_reason,
            'status' => $request->status,
            'processed_at' => $request->processed_at
        ]);

        return response()->json([
            'message' => 'Refund Submitted Successfully'
        ], 200);
    }

    public function updateRefund(Request $request, $id)
    {
        $request->validate([
            'payment_id' => ['required', 'numeric'],
            'appointment_id' => ['required', 'numeric'],
            'refund_amount' => ['required', 'numeric'],
            'refund_method' => ['required', 'string'],
            'refund_reason' => ['required', 'string'],
            'status' => ['required', 'string'],
            'processed_at' => ['required', 'date', 'date_format:Y-m-d']
        ]);

        $refund = Refunds::where('id', $id)->first();

        $refund->update([
            'payment_id' => $request->payment_id,
            'appointment_id' => $request->appointment_id,
            'refund_amount' => $request->refund_amount,
            'refund_method' => $request->refund_method,
            'refund_reason' => $request->refund_reason,
            'status' => $request->status,
            'processed_at' => $request->processed_at
        ]);

        return response()->json([
            'message' => 'Refund Status Updated Successfully'
        ], 200);

    }
}
