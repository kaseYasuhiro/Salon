<?php

namespace App\Notifications;

use App\Models\Appointments;

class AppointmentConfirmed extends BaseNotification
{
    public function __construct(public Appointments $appointment) {}

    public function toArray($notifiable): array
    {
        return [
            'type' => 'appointment_confirmed',
            'appointment_id' => $this->appointment->id,
            'title' => 'Appointment Confirmed',
            'message' => "Your appointment on {$this->appointment->scheduled_at->format('M d, Y g:i A')} has been confirmed.",
            'scheduled_at' => $this->appointment->scheduled_at->toIso8601String(),
        ];
    }
}