<?php

namespace App\Models;

use App\Models\Services;
use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceProductUsage extends Model
{
    protected $table = 'service_product_usages';
    protected $fillable = [
        'service_id',
        'product_id',
        'estimated_usage'
    ];

    public function Services()
    {
        return $this->belongsTo(Services::class, 'id');
    }

    public function Products()
    {
        return $this->hasMany(Products::class, 'id');
    }
}
