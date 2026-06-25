<?php

namespace App\Http\Controllers;

use App\Models\LossDamage;
use Illuminate\Http\Request;

class LossDamageController extends Controller
{
    public function submitIncidentReport(Request $request)
    {
        $request->validate([
            'date' => ['required', 'date', 'date_format:Y-m-d'],
            'incident_type' => ['required', 'string', 'in:damage,inventory_loss,theft'],
            'category' => ['required', 'string', 'in:product,service,other'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['required', 'string'],
            'staff_id' => ['required', 'numeric', 'exists:users,id'],
            'inventory_id' => ['nullable', 'numeric', 'exists:inventories,id'],
            'transaction_id' => ['nullable', 'numeric', 'exists:transactions,id'],
            // Status is optional since it has a default value in migration
            'status' => ['sometimes', 'string', 'in:reported,written-off,resolved']
        ]);

        LossDamage::create([
            'date' => $request->date,
            'incident_type' => $request->incident_type,
            'category' => $request->category,
            'amount' => $request->amount,
            'description' => $request->description,
            'staff_id' => $request->staff_id,
            'inventory_id' => $request->inventory_id,
            'transaction_id' => $request->transaction_id,
            'status' => $request->status ?? 'reported' // Fixed: was 'string' instead of 'status'
        ]);

        return response()->json([
            'message' => 'Report Submitted Successfully' // Fixed spelling
        ], 200);
    }

    public function updateIncidentReport(Request $request, $id)
    {
        $report = LossDamage::where('id', $id)->first();

        $request->validate([
            'date' => ['required', 'date', 'date_format:Y-m-d'],
            'incident_type' => ['required', 'string', 'in:damage,inventory_loss,theft'],
            'category' => ['required', 'string', 'in:product,service,other'],
            'amount' => ['required', 'numeric', 'min:0'],
            'description' => ['required', 'string'],
            'staff_id' => ['required', 'numeric', 'exists:users,id'],
            'inventory_id' => ['nullable', 'numeric', 'exists:inventories,id'],
            'transaction_id' => ['nullable', 'numeric', 'exists:transactions,id'],
            'status' => ['required', 'string', 'in:reported,written-off,resolved'] // Added enum validation
        ]);

        
        if (!$report) {
            return response()->json(['message' => 'Report Not Found'], 404);
        }

        $report->update([
            'date' => $request->date,
            'incident_type' => $request->incident_type,
            'category' => $request->category,
            'amount' => $request->amount,
            'description' => $request->description,
            'staff_id' => $request->staff_id,
            'inventory_id' => $request->inventory_id,
            'transaction_id' => $request->transaction_id,
            'status' => $request->status
        ]);

        return response()->json([
            'message' => 'Report Updated Successfully'
        ], 200);
    }

}
