<?php

namespace App\Notifications;

use App\Models\Appointments;
use Carbon\Carbon;

class AppointmentRescheduled extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public string $oldDate,
        public string $oldTime
    ) {}

    public function toArray($notifiable): array
    {
        $newDate = $this->appointment->appointment_date ?? 'N/A';

        $newTimeRaw = $this->appointment->appointment_time;
        $newTime = $newTimeRaw
            ? Carbon::createFromFormat('H:i:s', $newTimeRaw)->format('g:i A')
            : 'N/A';

        $oldTimeFormatted = $this->oldTime
            ? Carbon::createFromFormat('H:i:s', $this->oldTime)->format('g:i A')
            : $this->oldTime;

        return [
            'type' => 'appointment_rescheduled',
            'appointment_id' => $this->appointment->id,
            'title' => 'Appointment Rescheduled',
            'message' => "Your appointment was moved from {$this->oldDate} {$oldTimeFormatted} to {$newDate} {$newTime}.",
            'old_date' => $this->oldDate,
            'old_time' => $oldTimeFormatted,
            'new_date' => $newDate,
            'new_time' => $newTime,
        ];
    }
}