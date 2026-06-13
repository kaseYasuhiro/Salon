<?php

namespace App\Models;

use App\Models\User;
use App\Models\Appointments;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Feedback extends Model
{
    protected $table = 'feedback';
    protected $fillable = [
        'customer_id',
        'appointment_id',
        'rating',
        'comments'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'customer_id', 'id');
    }

    public function appointment()
    {
        return $this->belongsTo(Appointments::class, 'appointment_id', 'id');
    }
}
