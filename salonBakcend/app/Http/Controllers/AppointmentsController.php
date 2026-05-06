<?php

namespace App\Http\Controllers;

use App\Models\Appointments;
use Illuminate\Http\Request;

class AppointmentsController extends Controller
{
    // public function bookAppointment(Request $request)
    // {
    //     $request->validate([
    //         'customer_id' => ['required', 'numeric'],
    //         'appointment_date' => ['required', 'date', 'date_format:Y-m-d'],
    //         'appointment_time' => ['required', 'date_format:h:i'],
    //         'status' => ['required', 'string'],
    //     ]);

    //     Appointments::create([
    //         'customer_id' => $request->customer_id,
    //         'appointment_date' => $request->appointment_date,
    //         'appointment_time' => $request->appointment_time,
    //         'status' => $request->status,
    //     ]);

    //     return response()->json([
    //         'message' => 'Appointment Booked Successfully'
    //     ], 200);

    // }
}
