<?php

namespace App\Http\Controllers;

use App\Models\Remittance;
use Illuminate\Http\Request;

class RemittanceController extends Controller
{
    public function submitRemittance(Request $request)
    {
        $request->validate([
            'business_date_id' => ['required', 'numeric'],
            'remittance_amount' => ['required', 'numeric']
        ]);

        Remittance::create([
            'business_date_id' => $request->business_date_id,
            'remittance_amount' => $request->remittance_amount
        ]);

        return response()->json([
            'message' => 'Profit Remitted Successfully'
        ], 200);
    }
}
