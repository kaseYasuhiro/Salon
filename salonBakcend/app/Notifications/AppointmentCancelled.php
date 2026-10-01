<?php

namespace App\Notifications;

use App\Models\Appointments;
use Carbon\Carbon;

class AppointmentCancelled extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public ?string $reason = null
    ) {}

    public function toArray($notifiable): array
    {
        $date = $this->appointment->appointment_date ?? 'N/A';

        $timeRaw = $this->appointment->appointment_time;
        $time = $timeRaw
            ? Carbon::createFromFormat('H:i:s', $timeRaw)->format('g:i A')
            : 'N/A';

        $message = "Your appointment on {$date} at {$time} has been cancelled.";
        if ($this->reason) {
            $message .= " Reason: {$this->reason}";
        }

        return [
            'type' => 'appointment_cancelled',
            'appointment_id' => $this->appointment->id,
            'title' => 'Appointment Cancelled',
            'message' => $message,
            'reason' => $this->reason,
        ];
    }
}