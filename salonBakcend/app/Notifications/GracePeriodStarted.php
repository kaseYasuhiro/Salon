<?php

namespace App\Notifications;

use App\Models\Appointments;

class GracePeriodStarted extends BaseNotification
{
    public function __construct(public Appointments $appointment) {}

    public function toArray($notifiable): array
    {
        $minutes = $this->appointment->grace_period_minutes ?? 30;

        return [
            'type' => 'grace_period_started',
            'appointment_id' => $this->appointment->id,
            'title' => 'Your Appointment Is Now',
            'message' => "Your appointment is scheduled for now ({$this->appointment->appointment_time}). You have a {$minutes}-minute grace period. Please arrive soon.",
            'appointment_date' => $this->appointment->appointment_date,
            'appointment_time' => $this->appointment->appointment_time,
            'grace_period_minutes' => $minutes,
        ];
    }
}