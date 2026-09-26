<?php

namespace App\Models;

use App\Models\User;
use App\Models\Specialties;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class StaffSpecialties extends Model
{
    protected $table = 'staff_specialties';
    protected $fillable = [
        'staff_id',
        'specialty_id',
        'is_active'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'staff_id');
    }

    public function specialties()
    {
        return $this->belongsTo(Specialties::class, 'specialty_id');
    }
}
