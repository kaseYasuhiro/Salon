<?php

namespace App\Http\Controllers;

use App\Models\StaffSpecialties;
use Illuminate\Http\Request;

class StaffSpecialtiesController extends Controller
{
    public function addStaffSpecialty(Request $request)
    {
        $request->validate([
            'staff_id' => ['required', 'numeric'],
            'specialty_id' => ['required', 'numeric'],
            'is_active' => ['required', 'boolean']
        ]);

        StaffSpecialties::create([
            'staff_id' => $request->staff_id,
            'specialty_id' => $request->specialty_id,
            'is_active' => $request->is_active
        ]);

        return response()->json([
            'message' => 'Staff Specialty Added Successfully'
        ], 200);
    }
}
