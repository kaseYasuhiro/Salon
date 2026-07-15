<?php

namespace App\Models;

use App\Models\ServiceProductUsage;
use App\Models\Inventory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Products extends Model
{
    protected $table = 'products';
    protected $fillable = [
        'product_name',
        'description',
        'unit',
        'unit_size',
        'estimated_usages_per_unit',
        'product_image',
        'is_active'
    ];

    public function ServiceProductUsages()
    {
        return $this->hasMany(ServiceProductUsage::class, 'product_id', 'id');
    }

    public function Inventory()
    {
        return $this->belongsTo(Inventory::class, 'product_id', 'id');
    }


}
