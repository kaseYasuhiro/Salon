<?php

namespace App\Notifications;

use App\Models\Appointments;

class AppointmentRequestReceived extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public string $requestType // 'cancel' or 'reschedule'
    ) {}

    public function toArray($notifiable): array
    {
        $action = $this->requestType === 'cancel' ? 'cancellation' : 'reschedule';

        return [
            'type' => 'appointment_request',
            'appointment_id' => $this->appointment->id,
            'request_type' => $this->requestType,
            'title' => 'Appointment Request',
            'message' => "{$this->appointment->customer->name} requested a {$action} for appointment #{$this->appointment->id}.",
            'customer_name' => $this->appointment->customer->name,
        ];
    }
}