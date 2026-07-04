<?php

namespace App\Models;

use App\Models\ServiceProductUsage;
use App\Models\Transaction;
use App\Models\ServiceSpecialties;
use App\Models\WalkIn;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Services extends Model
{
    protected $table = 'services';
    protected $fillable = [
        'service_name',
        'description',
        'price',
        'duration_minutes',
        'is_multitaskable',
        'service_status'
    ];

    public function ServiceProductUsage()
    {
        return $this->hasMany(ServiceProductUsage::class, 'service_id');
    }

    public function transaction()
    {
        return $this->hasMany(Transaction::class, 'service_id', 'id');
    }

    public function serviceSpecialties()
    {
        return $this->hasMany(ServiceSpecialties::class, 'service_id');
    }

    public function walkIn()
    {
        return $this->hasMany(WalkIn::class, 'service_id', 'id');
    }
}
