<?php

namespace App\Http\Controllers;

use App\Models\WalkIn;
use Illuminate\Http\Request;

class WalkInController extends Controller
{
    public function submitWalkIn(Request $request)
    {
        $request->validate([
            'customer_name' => ['required', 'string'],
            'service_id' => ['required', 'numeric'],
            'stylist_id' => ['required', 'numeric'],
            'is_finished' => ['required', 'boolean'],
            'amount_paid' => ['nullable', 'numeric']
        ]);

        WalkIn::create([
            'customer_name' => $request->customer_name,
            'service_id' => $request->service_id,
            'stylist_id' => $request->stylist_id,
            'is_finished' => $request->is_finished,
            'amount_paid' => $request->amount_paid
        ]);

        return response()->json([
            'message' => 'Walk-in Service Submitted Successfully'
        ], 200);
    }

    public function updateWalkIn(Request $request, $id)
    {
        $request->validate([
            'customer_name' => ['required', 'string'],
            'service_id' => ['required', 'numeric'],
            'stylist_id' => ['required', 'numeric'],
            'is_finished' => ['required', 'boolean'],
            'amount_paid' => ['required', 'numeric']
        ]);

        $walkin = WalkIn::where('id', $id)->first();
        $walkin->update([
            'customer_name' => $request->customer_name,
            'service_id' => $request->service_id,
            'stylist_id' => $request->stylist_id,
            'is_finished' => $request->is_finished,
            'amount_paid' => $request->amount_paid
        ]);

        return response()->json([
            'message' => 'Walk-in Service Updated Successfully'
        ], 200);

    }
}
