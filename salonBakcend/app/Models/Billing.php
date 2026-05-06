<?php

namespace App\Models;

use App\Models\Appointments;
use App\Models\Payments;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Billing extends Model
{
    protected $table = 'billings';
    protected $fillable = [
        'appointment_id',
        'total_amount',
        'payment_type',
    ];

    public function appointments()
    {
        return $this->belongsTo(Appointments::class, 'id');
    }

    public function payments()
    {
        return $this->hasMany(Payments::class, 'billing_id');
    }
}
