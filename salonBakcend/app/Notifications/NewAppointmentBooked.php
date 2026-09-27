<?php

namespace App\Notifications;

use App\Models\Appointments;

class NewAppointmentBooked extends BaseNotification
{
    public function __construct(public Appointments $appointment) {}

    public function toArray($notifiable): array
    {
        return [
            'type' => 'new_appointment',
            'appointment_id' => $this->appointment->id,
            'title' => 'New Appointment',
            'message' => "{$this->appointment->customer->name} booked an appointment for {$this->appointment->scheduled_at->format('M d, g:i A')}.",
            'customer_name' => $this->appointment->customer->name,
            'scheduled_at' => $this->appointment->scheduled_at->toIso8601String(),
        ];
    }
}