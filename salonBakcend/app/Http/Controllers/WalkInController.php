<?php

namespace App\Http\Controllers;

use App\Models\WalkIn;
use Illuminate\Http\Request;

class WalkInController extends Controller
{
    public function submitWalkIn(Request $request)
    {
        $request->validate([
            'customer_name' => ['required', 'string'],
            'service_id'    => ['required', 'numeric', 'exists:services,id'],
            'stylist_id'    => ['required', 'numeric', 'exists:users,id'],
            'is_finished'   => ['required', 'boolean'],
            'amount_paid'   => ['nullable', 'numeric'],
            'customer_id'   => ['nullable', 'numeric', 'exists:users,id'],
            'walkin_payment_method' => ['nullable', 'string']
        ]);

        WalkIn::create([
            'customer_id'   => $request->customer_id,
            'customer_name' => $request->customer_name,
            'service_id'    => $request->service_id,
            'stylist_id'    => $request->stylist_id,
            'is_finished'   => $request->is_finished,
            'amount_paid'   => $request->amount_paid,
            'walkin_payment_method' => $request->walkin_payment_method
        ]);

        return response()->json([
            'message' => 'Walk-in Service Submitted Successfully'
        ], 200);
    }

    public function updateWalkIn(Request $request, $id)
    {
        $request->validate([
            'customer_name' => ['required', 'string'],
            'service_id'    => ['required', 'numeric', 'exists:services,id'],
            'stylist_id'    => ['required', 'numeric', 'exists:users,id'],
            'is_finished'   => ['required', 'boolean'],
            'amount_paid'   => ['required', 'numeric'],
            'customer_id'   => ['nullable', 'numeric', 'exists:users,id'],
            'walkin_payment_method' => ['nullable', 'string']
        ]);

        $walkin = WalkIn::findOrFail($id);

        $walkin->update([
            'customer_id'   => $request->customer_id,
            'customer_name' => $request->customer_name,
            'service_id'    => $request->service_id,
            'stylist_id'    => $request->stylist_id,
            'is_finished'   => $request->is_finished,
            'amount_paid'   => $request->amount_paid,
            'walkin_payment_method' => $request->walkin_payment_method
        ]);

        return response()->json([
            'message' => 'Walk-in Service Updated Successfully'
        ], 200);
    }


    public function getCustomerWalkIns(Request $request)
    {
        $request->validate([
            'customer_id' => ['nullable', 'numeric', 'exists:users,id'],
        ]);

        // Default to the authenticated user so the customer's own app can
        // call this without passing an ID. Staff can pass ?customer_id=X to
        // preview another customer's history.
        $customerId = $request->input('customer_id', $request->user()?->id);

        if (!$customerId) {
            return response()->json([
                'message' => 'No customer specified.',
                'walk_ins' => [],
            ], 200);
        }

        $walkIns = WalkIn::query()
            ->where('customer_id', $customerId)
            ->with([
                'services:id,service_name,description,price,duration_minutes',
                'user:id,first_name,last_name,profile_image',
            ])
            ->orderByDesc('created_at')
            ->get();

        // Group the per-service rows into one entry per walk-in session.
        // Sessions are keyed by (stylist + minute the row was created) — good
        // enough because the staff "Add walk-in" flow creates all services
        // for one visit within the same minute.
        $grouped = $walkIns->groupBy(function ($walkIn) {
            $minute = optional($walkIn->created_at)->format('Y-m-d H:i') ?? 'unknown';
            return "{$walkIn->stylist_id}|{$minute}";
        });

        $sessions = $grouped->map(function ($rows) use ($customerId) {
            $first = $rows->first();

            $services = $rows->map(function ($w) {
                return [
                    'service_id'       => $w->service_id,
                    'service_name'     => $w->services?->service_name ?? 'Unknown Service',
                    'duration_minutes' => (int) ($w->services?->duration_minutes ?? 0),
                    'price'            => (float) ($w->services?->price ?? 0),
                ];
            })->values();

            $totalPrice    = $services->sum('price');
            $totalDuration = $services->sum('duration_minutes');

            // A session is "completed" only if every service in it is finished.
            $allFinished = $rows->every(fn ($w) => (int) $w->is_finished === 1);

            return [
                'session_id'      => $first->id,
                'walk_in_ids'     => $rows->pluck('id')->all(),
                'customer_id'     => $customerId,
                'customer_name'   => $first->customer_name,
                // `stylist` in the JSON keeps the same shape the frontend expects;
                // it's sourced from the WalkIn model's `user()` relation.
                'stylist'         => [
                    'id'            => $first->stylist_id,
                    'first_name'    => $first->user?->first_name,
                    'last_name'     => $first->user?->last_name,
                    'profile_image' => $first->user?->profile_image,
                ],
                'services'        => $services,
                'total_price'     => $totalPrice,
                'total_duration'  => $totalDuration,
                'amount_paid'     => (float) $rows->sum('amount_paid'),
                'status'          => $allFinished ? 'completed' : 'ongoing',
                'created_at'      => optional($first->created_at)->toIso8601String(),
                'updated_at'      => optional($rows->max('updated_at'))->toIso8601String(),
            ];
        })->values();

        return response()->json([
            'message'  => 'Walk-in history retrieved.',
            'walk_ins' => $sessions,
        ], 200);
    }
}
