<?php

namespace App\Models;

use App\Models\Products;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Inventory extends Model
{
    protected $table = 'inventories';
    protected $fillable = [
        'product_id',
        'product_quantity',
        'current_usages',
        'reorder_level',
        'expiration_date'
    ];

    public function Products()
    {
        return $this->belongsTo(Products::class, 'product_id');
    }
}
