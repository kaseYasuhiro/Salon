<?php

namespace App\Notifications;

use App\Models\Appointments;
use Carbon\Carbon;

class AppointmentConfirmed extends BaseNotification
{
    public function __construct(public Appointments $appointment) {}

    public function toArray($notifiable): array
    {
        $date = $this->appointment->appointment_date ?? 'N/A';

        $timeRaw = $this->appointment->appointment_time;
        $time = $timeRaw
            ? Carbon::createFromFormat('H:i:s', $timeRaw)->format('g:i A')
            : 'N/A';

        return [
            'type' => 'appointment_confirmed',
            'appointment_id' => $this->appointment->id,
            'title' => 'Appointment Confirmed',
            'message' => "Your appointment on {$date} at {$time} has been confirmed.",
            'appointment_date' => $date,
            'appointment_time' => $time,
        ];
    }
}