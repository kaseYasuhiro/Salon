<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffFeedback extends Model
{
    protected $table = 'staff_feedback';
    protected $fillable = [
        'staff_id',
        'rating'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'staff_id', 'id');
    }
}
