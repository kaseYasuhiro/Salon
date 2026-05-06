<?php

namespace App\Models;

use App\Models\Inventory;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    protected $table = 'inventory_transactions';
    protected $fillable = [
        'inventory_id',
        'transaction_id',
        'quantity_change',
        'transaction_type'
    ];

    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'id');
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class, 'id');
    }
}


