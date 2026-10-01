<?php

namespace App\Console\Commands;

use App\Models\Appointments;
use App\Models\User;
use App\Notifications\GracePeriodStarted;
use App\Notifications\GracePeriodEnded;
use Carbon\Carbon;
use Illuminate\Console\Command;

class SendGracePeriodNotifications extends Command
{
    protected $signature = 'appointments:grace-period-check';
    protected $description = 'Send grace period start and end notifications';

    public function handle(): void
    {
        $now = Carbon::now(config('app.timezone'));

        // ── 1. Grace period STARTED (appointment time has arrived) ──
        $starting = Appointments::whereIn('status', ['confirmed', 'pending'])
            ->whereNull('grace_started_notified_at')
            ->get()
            ->filter(function (Appointments $appointment) use ($now) {
                $start = $this->appointmentDateTime($appointment);
                return $start && $now->greaterThanOrEqualTo($start) && $now->lessThan($start->copy()->addMinute());
            });

        foreach ($starting as $appointment) {
            $customer = User::find($appointment->customer_id);
            if ($customer) {
                $customer->notify(new GracePeriodStarted($appointment));
            }
            $appointment->update(['grace_started_notified_at' => now()]);
        }

        // ── 2. Grace period ENDED (30 min after appointment time) ──
        $ending = Appointments::whereIn('status', ['confirmed', 'pending'])
            ->whereNull('grace_ended_notified_at')
            ->whereNotNull('grace_started_notified_at')
            ->get()
            ->filter(function (Appointments $appointment) use ($now) {
                $start = $this->appointmentDateTime($appointment);
                if (! $start) return false;

                $minutes = $appointment->grace_period_minutes ?? 30;
                $end = $start->copy()->addMinutes($minutes);

                return $now->greaterThanOrEqualTo($end) && $now->lessThan($end->copy()->addMinute());
            });

        foreach ($ending as $appointment) {
            // Notify customer
            $customer = User::find($appointment->customer_id);
            if ($customer) {
                $customer->notify(new GracePeriodEnded($appointment, 'customer'));
            }

            // Notify assigned staff
            $transaction = \App\Models\Transaction::where('appointment_id', $appointment->id)->first();
            if ($transaction && $transaction->assigned_employee_id) {
                $staff = User::find($transaction->assigned_employee_id);
                if ($staff) {
                    $staff->notify(new GracePeriodEnded($appointment, 'staff'));
                }
            }

            $appointment->update(['grace_ended_notified_at' => now()]);
        }

        $this->info("Grace start sent: {$starting->count()}, grace end sent: {$ending->count()}");
    }

    /**
     * Combine appointment_date + appointment_time into a Carbon instance.
     */
    private function appointmentDateTime(Appointments $appointment): ?Carbon
    {
        if (! $appointment->appointment_date || ! $appointment->appointment_time) {
            return null;
        }

        try {
            return Carbon::createFromFormat(
                'Y-m-d H:i',
                $appointment->appointment_date . ' ' . substr($appointment->appointment_time, 0, 5),
                config('app.timezone')
            );
        } catch (\Exception $e) {
            \Log::warning('Grace period: failed to parse appointment time', [
                'appointment_id' => $appointment->id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }
}