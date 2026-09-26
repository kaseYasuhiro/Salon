<?php

namespace App\Http\Controllers;

use App\Models\StaffFeedback;
use Illuminate\Http\Request;

class StaffFeedbackController extends Controller
{
    public function submitStaffFeedback(Request $request)
    {
        $request->validate([
            'staff_id' => ['required', 'numeric'],
            'rating' => ['required', 'numeric']
        ]);

        StaffFeedback::create([
            'staff_id' => $request->staff_id,
            'rating' => $request->rating
        ]);

        return response()->json([
            'message' => 'Staff Rating Submitted Successfully'
        ], 200);
    }

}
