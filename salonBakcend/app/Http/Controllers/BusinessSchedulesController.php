<?php

namespace App\Http\Controllers;

use App\Models\BusinessSchedules;
use Illuminate\Http\Request;

class BusinessSchedulesController extends Controller
{
    public function addDateSchedule(Request $request)
    {
        $request->validate([
            'business_date' => ['required', 'date', 'date_format:Y-m-d'],
            'open_time' => ['required', 'date_format:H:i'],
            'close_time' => ['required', 'date_format:H:i'],
            'is_open' => ['required', 'boolean']
        ]);

        BusinessSchedules::create([
            'business_date' => $request->business_date,
            'open_time' => $request->open_time,
            'close_time' => $request->close_time,
            'is_open' => $request->is_open
        ]);

        return response()->json([
            'message' => 'Schedule Addeed Succesfully'
        ], 200);
    }

    public function displayBusinessSchedules()
    {
        $schedule = BusinessSchedules::get();
        return response()->json($schedule);
    }
}
