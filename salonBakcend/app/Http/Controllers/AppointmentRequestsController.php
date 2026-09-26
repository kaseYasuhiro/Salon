<?php

namespace App\Http\Controllers;

use App\Models\AppointmentRequests;
use App\Models\Appointments;
use Illuminate\Http\Request;

class AppointmentRequestsController extends Controller
{
    public function submitAppointmentRequest(Request $request)
    {
        $request->validate([
            'appointment_id' => ['required', 'numeric'],
            'request_type'   => ['required', 'in:cancel,reschedule'],
            'reason'         => ['nullable', 'string', 'required_if:request_type,cancel'],
            'preferred_date' => ['nullable', 'date', 'required_if:request_type,reschedule'],
            'preferred_time' => ['nullable', 'date_format:H:i', 'required_if:request_type,reschedule'],
        ]);

        $appointment = Appointments::findOrFail($request->appointment_id);

        if ($appointment->customer_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $exists = AppointmentRequests::where('appointment_id', $appointment->id)
            ->where('request_status', 'pending')
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'You already have a pending request for this appointment'
            ], 409);
        }

        $req = AppointmentRequests::create([
            'customer_id'    => auth()->id(),
            'appointment_id' => $appointment->id,
            'request_type'   => $request->request_type,
            'reason'         => $request->reason,
            'preferred_date' => $request->preferred_date,
            'preferred_time' => $request->preferred_time,
            'request_status' => 'pending',
        ]);

        return response()->json(['message' => 'Request submitted', 'request' => $req], 201);
    }

    public function approveRequest($id)
    {
        $req = AppointmentRequests::findOrFail($id);

        if ($req->request_status !== 'pending') {
            return response()->json(['message' => 'Request already reviewed'], 409);
        }

        $req->update([
            'request_status' => 'approved',
            'reviewed_at'    => now(),
        ]);

        return response()->json(['message' => 'Request approved']);
    }

    public function rejectRequest($id)
    {
        $req = AppointmentRequests::findOrFail($id);

        if ($req->request_status !== 'pending') {
            return response()->json(['message' => 'Request already reviewed'], 409);
        }

        $req->update([
            'request_status' => 'rejected',
            'reviewed_at'    => now(),
        ]);

        return response()->json(['message' => 'Request rejected']);
    }


    public function cancelRequest($id)
    {
        $req = AppointmentRequests::findOrFail($id);

        if ($req->customer_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        if ($req->request_status !== 'pending') {
            return response()->json(['message' => 'Only pending requests can be withdrawn'], 409);
        }

        $req->delete();

        return response()->json(['message' => 'Request withdrawn']);
    }



}
