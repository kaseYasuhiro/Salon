<?php

namespace App\Http\Controllers;

use App\Models\Feedback;
use Illuminate\Http\Request;

class FeedbackController extends Controller
{
    public function submitFeedback(Request $request)
    {
        $request->validate([
            'customer_id' => ['required', 'numeric'],
            'appointment_id' => ['required', 'numeric'],
            'rating' => ['required', 'numeric'],
            'comments' => ['required', 'string']
        ]);

        Feedback::create([
            'customer_id' => $request->customer_id,
            'appointment_id' => $request->appointment_id,
            'rating' => $request->rating,
            'comments' => $request->comments
        ]);

        return response()->json([
            'message' => 'Feedback Submitted Successfully'
        ], 200);
    }
}
