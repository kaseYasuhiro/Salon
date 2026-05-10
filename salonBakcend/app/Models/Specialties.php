<?php

namespace App\Models;
use App\Models\ServiceSpecialties;
use App\Models\StaffSpecialties;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Specialties extends Model
{
    protected $table = 'specialties';
    protected $fillable = [
        'specialty_name'
    ];

    public function staffSpecialties()
    {
        return $this->hasMany(StaffSpecialties::class, 'id');
    }

    public function serviceSpecialties()
    {
        return $this->hasMany(ServiceSpecialties::class, 'specialty_id');
    }
}
