<?php

namespace App\Models;
use App\Models\Services;
use App\Models\ServiceSpecialties;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceSpecialties extends Model
{
    protected $table = 'service_specialties';
    protected $fillable = [
        'service_id',
        'specialty_id'
    ];

    public function services()
    {
        return $this->belongsTo(Services::class, 'service_id');
    }

    public function specialties()
    {
        return $this->belongsTo(Specialties::class, 'specialty_id');
    }
}
