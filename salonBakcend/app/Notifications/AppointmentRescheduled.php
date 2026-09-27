<?php

namespace App\Notifications;

use App\Models\Appointments;
use Carbon\Carbon;

class AppointmentRescheduled extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public Carbon $oldDate
    ) {}

    public function toArray($notifiable): array
    {
        return [
            'type' => 'appointment_rescheduled',
            'appointment_id' => $this->appointment->id,
            'title' => 'Appointment Rescheduled',
            'message' => "Your appointment was moved from {$this->oldDate->format('M d, Y g:i A')} to {$this->appointment->scheduled_at->format('M d, Y g:i A')}.",
            'old_scheduled_at' => $this->oldDate->toIso8601String(),
            'new_scheduled_at' => $this->appointment->scheduled_at->toIso8601String(),
        ];
    }
}