<?php

namespace App\Models;

use App\Models\User;
use App\Model\Appointments;
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
        return $this->belongsTo(User::class, 'id');
    }
}
