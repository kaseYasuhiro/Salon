<?php

namespace App\Http\Controllers;

use App\Models\EmployeeCommission;
use Illuminate\Http\Request;

class EmployeeCommissionController extends Controller
{
    public function addCommission(Request $request)
    {
        $request->validate([
            'employee_id' => ['required', 'numeric'],
            'commission_amount' => ['required', 'numeric']
        ]);

        EmployeeCommission::create([
            'employee_id' => $request->employee_id,
            'commission_amount' => $request->commission_amount
        ]);

        return response()->json([
            'message' => 'Employee Commission Applied Successfully'
        ], 200);
    }
}
