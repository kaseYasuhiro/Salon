<?php

namespace App\Models;

use App\Models\User;
use App\Models\BusinessSchedules;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AssignStaff extends Model
{
    protected $table = 'assign_staff';
    protected $fillable = [
        'staff_id',
        'business_date_id'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'staff_id', 'id');
    }

    public function businessSchedules()
    {
        return $this->belongsTo(BusinessSchedules::class, 'business_date_id', 'id');
    }
}
