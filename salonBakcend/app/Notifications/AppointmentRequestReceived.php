<?php

namespace App\Notifications;

use App\Models\Appointments;
use App\Models\User;

class AppointmentRequestReceived extends BaseNotification
{
    public function __construct(
        public Appointments $appointment,
        public string $requestType
    ) {}

    public function toArray($notifiable): array
    {
        $customer = User::find($this->appointment->customer_id);

        $customerName = $customer
            ? trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''))
            : "Customer #{$this->appointment->customer_id}";

        if (empty($customerName)) {
            $customerName = "Customer #{$this->appointment->customer_id}";
        }

        $action = $this->requestType === 'cancel' ? 'cancellation' : 'reschedule';

        return [
            'type' => 'appointment_request',
            'appointment_id' => $this->appointment->id,
            'request_type' => $this->requestType,
            'title' => 'Appointment Request',
            'message' => "{$customerName} requested a {$action} for appointment #{$this->appointment->id}.",
            'customer_name' => $customerName,
        ];
    }
}