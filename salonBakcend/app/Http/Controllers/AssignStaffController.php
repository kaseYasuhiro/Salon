<?php

namespace App\Http\Controllers;

use App\Models\AssignStaff;
use Illuminate\Http\Request;

class AssignStaffController extends Controller
{
    public function staffAssignment(Request $request)
    {
        $request->validate([
            'staff_id' => ['required', 'numeric'],
            'business_date_id' => ['required', 'numeric']
        ]);

        AssignStaff::create([
            'staff_id' => $request->staff_id,
            'business_date_id' => $request->business_date_id
        ]);

        return response()->json([
            'message' => 'Staff Assigned Succesfully'
        ], 200);
    }
}
