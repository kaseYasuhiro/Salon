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
        'estimated_usages_per_unit'
    ];

    public function ServiceProductUsage()
    {
        return $this->belongsTo(ServiceProductUsage::class, 'id');
    }

    public function Inventory()
    {
        return $this->belongsTo(Inventory::class, 'id');
    }


}
