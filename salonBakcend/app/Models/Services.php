<?php

namespace App\Models;

use App\Models\ServiceProductUsage;
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
        'service_status'
    ];

    public function ServiceProductUsage()
    {
        return $this->belongsTo(ServiceProductUsage::class, 'id');
    }
}
