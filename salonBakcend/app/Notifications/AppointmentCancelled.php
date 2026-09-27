<?php

namespace App\Notifications;

use App\Models\Appointments;

class AppointmentCancelled extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public ?string $reason = null
    ) {}

    public function toArray($notifiable): array
    {
        return [
            'type' => 'appointment_cancelled',
            'appointment_id' => $this->appointment->id,
            'title' => 'Appointment Cancelled',
            'message' => "Your appointment on {$this->appointment->scheduled_at->format('M d, Y g:i A')} has been cancelled."
                . ($this->reason ? " Reason: {$this->reason}" : ''),
            'reason' => $this->reason,
        ];
    }
}