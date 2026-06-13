<?php

namespace App\Models;

use App\Models\AssignStaff;
use App\Models\Appointments;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BusinessSchedules extends Model
{
    protected $table = 'business_schedules';
    protected $fillable = [
        'business_date',
        'open_time',
        'close_time',
        'is_open'
    ];

    public function assignStaff()
    {
        return $this->hasMany(AssignStaff::class, 'business_date_id', 'id');
    }

}
