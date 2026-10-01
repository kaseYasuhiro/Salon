<?php

namespace App\Notifications;

use App\Models\Appointments;
use App\Models\User;
use Carbon\Carbon;

class UpcomingAppointmentReminder extends BaseNotification
{
    public function __construct(public Appointments $appointment) {}

    public function toArray($notifiable): array
    {
        $customer = User::find($this->appointment->customer_id);

        $customerName = $customer
            ? trim(($customer->first_name ?? '') . ' ' . ($customer->last_name ?? ''))
            : "Customer #{$this->appointment->customer_id}";

        if (empty($customerName)) {
            $customerName = "Customer #{$this->appointment->customer_id}";
        }

        $date = $this->appointment->appointment_date ?? 'N/A';

        $timeRaw = $this->appointment->appointment_time;
        $time = $timeRaw
            ? Carbon::createFromFormat('H:i:s', $timeRaw)->format('g:i A')
            : 'N/A';

        return [
            'type' => 'upcoming_appointment',
            'appointment_id' => $this->appointment->id,
            'title' => 'Upcoming Appointment',
            'message' => "You have an appointment with {$customerName} at {$time} on {$date}.",
            'appointment_date' => $date,
            'appointment_time' => $time,
            'customer_name' => $customerName,
        ];
    }
}