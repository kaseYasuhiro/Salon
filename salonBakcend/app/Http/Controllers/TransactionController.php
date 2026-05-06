<?php

namespace App\Http\Controllers;

use App\Models\Transaction;
use Illuminate\Http\Request;

class TransactionController extends Controller
{
    // public function createTransaction(Request $request)
    // {
    //     $request->validate([
    //         'appointment_id' => ['required', 'numeric'],
    //         'service_id' => ['required', 'numeric'],
    //         'assigned_employee_id' => ['required', 'numeric'],
    //         'notes' => ['required', 'string'],
    //         'service_status' => ['required', 'string'],
    //         'completed_at' => ['required', 'date', 'date_format:Y-m-d'],
    //     ]);

    //     Transaction::create([
    //         'appointment_id' => $request->qppointment_id,
    //         'service_id' => $request->service_id,
    //         'assigned_employee_id' => $request->assigned_employee_id,
    //         'notes' => $request_notes,
    //         'service_status' => $request->service_status,
    //         'completed_at' => $request->completed_at
    //     ]);

    //     return response()->json([
    //         'message' => 'Transaction Created Successfully'
    //     ], 200);

    // }
}
