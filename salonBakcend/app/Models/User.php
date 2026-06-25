<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use App\Models\Appointments;
use App\Models\EmployeeCommission;
use App\Models\Feedback;
use App\Models\StaffSpecialties;
use App\Models\StaffSchedules;
use App\Models\AssignStaff;
use App\Models\StaffFeedback;
use App\Models\LossDamage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'first_name',
        'last_name',
        'profile_image',
        'email',
        'password',
        'phone_number',
        'role',

    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];

    public function appointments()
    {
        return $this->hasMany(Appointments::class, 'customer_id');
    }

    public function transaction()
    {
        return $this->hasMany(Transaction::class, 'assigned_employee_id', 'id');
    }

    public function employeeCommission()
    {
        return $this->hasMany(EmployeeCommission::class, 'employee_id', 'id');
    }

    public function feedback()
    {
        return $this->hasMany(Feedback::class, 'customer_id', 'id');
    }

    public function staffSpecialties()
    {
        return $this->hasMany(StaffSpecialties::class, 'staff_id');
    }

    public function staffSchedules()
    {
        return $this->hasMany(StaffSchedules::class, 'staff_id', 'id');
    }

    public function assignStaff()
    {
        return $this->hasMany(AssignStaff::class, 'staff_id', 'id');
    }

    public function staffFeedack()
    {
        return $this->hasMany(staffFeedback::class, 'staff_id', 'id');
    }

    public function lossDamage()
    {
        return $this->hasMany(LossDamage::class, 'staff_id', 'id');
    }

}
