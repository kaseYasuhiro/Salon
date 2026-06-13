<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\User;
use App\Models\Billing;
use App\Models\Transaction;
use App\Models\Feedback;
use Illuminate\Database\Eloquent\Model;

class Appointments extends Model
{
    protected $table = 'appointments';
    protected $fillable = [
        'customer_id',
        'appointment_date',
        'appointment_time',
        'status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'customer_id');
    }

    public function billing()
    {
        return $this->hasMany(Billing::class, 'appointment_id', 'id');
    }

    public function transaction()
    {
        return $this->hasMany(Transaction::class, 'appointment_id');
    }

    public function feedback()
    {
        return $this->hasMany(Feedback::class, 'appointment_id', 'id');
    }

}
