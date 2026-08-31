<?php

namespace App\Models;

use App\Models\Appointments;
use App\Models\Payments;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Refunds extends Model
{
    protected $table = 'refunds';
    protected $fillable = [
        'payment_id',
        'appointment_id',
        'refund_amount',
        'refund_method',
        'refund_reason',
        'status',
        'processed_at'
    ];

    public function appointments()
    {
        return $this->belongsTo(Appointments::class, 'appointment_id', 'id');
    }

    public function payments()
    {
        return $this->belongsTo(Payments::class, 'payment_id', 'id');
    }
}
