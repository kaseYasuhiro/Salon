<?php

namespace App\Models;

use App\Models\WalkIn;
use App\Models\Inventory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalkInTransaction extends Model
{
    protected $table = 'walk_in_transactions';
    protected $fillable = [
        'walkin_id',
        'inventory_id',
        'quantity_change'
    ];

    public function walkIn()
    {
        return $this->belongsTo(WalkIn::class, 'walkin_id', 'id');
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id', 'id');
    }
}
