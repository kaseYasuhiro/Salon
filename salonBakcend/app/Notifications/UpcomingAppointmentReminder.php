<?php

namespace App\Notifications;

use App\Models\Appointments;

class UpcomingAppointmentReminder extends BaseNotification
{
    public function __construct(public Appointments $appointment) {}

    public function toArray($notifiable): array
    {
        return [
            'type' => 'upcoming_appointment',
            'appointment_id' => $this->appointment->id,
            'title' => 'Upcoming Appointment',
            'message' => "You have an appointment with {$this->appointment->customer->name} at {$this->appointment->scheduled_at->format('g:i A')} today.",
            'scheduled_at' => $this->appointment->scheduled_at->toIso8601String(),
            'customer_name' => $this->appointment->customer->name,
        ];
    }
}