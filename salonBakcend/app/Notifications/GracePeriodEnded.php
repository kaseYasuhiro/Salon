<?php

namespace App\Notifications;

use App\Models\Appointments;

class GracePeriodEnded extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public string $recipient // 'customer' or 'staff'
    ) {}

    public function toArray($notifiable): array
    {
        $minutes = $this->appointment->grace_period_minutes ?? 30;

        if ($this->recipient === 'staff') {
            return [
                'type' => 'grace_period_ended',
                'appointment_id' => $this->appointment->id,
                'title' => 'Grace Period Ended',
                'message' => "The grace period for appointment #{$this->appointment->id} has ended. The customer has not arrived.",
                'appointment_date' => $this->appointment->appointment_date,
                'appointment_time' => $this->appointment->appointment_time,
                'grace_period_minutes' => $minutes,
            ];
        }

        return [
            'type' => 'grace_period_ended',
            'appointment_id' => $this->appointment->id,
            'title' => 'Grace Period Ended',
            'message' => "Your {$minutes}-minute grace period has ended. Please contact the salon if you are still on your way.",
            'appointment_date' => $this->appointment->appointment_date,
            'appointment_time' => $this->appointment->appointment_time,
            'grace_period_minutes' => $minutes,
        ];
    }
}