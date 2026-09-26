<?php

namespace App\Models;

use App\Models\User;
use App\Models\Appointments;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentRequests extends Model
{
    protected $table = 'appointment_requests';
    protected $fillable = [
        'customer_id',
        'appointment_id',
        'request_type',
        'reason',
        'preferred_date',
        'preferred_time',
        'request_status',
        'reviewed_at'
    ];

    public function customer()
    {
        return $this->belongsTo(User::class, 'customer_id', 'id');
    }

    public function appointments()
    {
        return $this->belongsTo(Appointments::class, 'appointment_id', 'id');
    }
}
