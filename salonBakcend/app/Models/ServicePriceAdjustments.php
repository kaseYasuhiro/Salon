<?php

namespace App\Models;

use App\Models\Services;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServicePriceAdjustments extends Model
{
    protected $table = 'service_price_adjustments';
    protected $fillable = [
        'service_id',
        'hair_length',
        'hair_thickness',
        'additional_price'
    ];

    public function services()
    {
        return $this->belongsTo(Services::class, 'service_id', 'id');
    }
}
