<?php

namespace App\Models;

use App\Models\User;
use App\Models\Inventory;
use App\Models\Transaction;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class LossDamage extends Model
{
    protected $table = 'loss_damages';
    protected $fillable = [
        'date',
        'incident_type',
        'category',
        'amount',
        'description',
        'staff_id',
        'inventory_id',
        'transaction_id',
        'status'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'staff_id', 'id');
    }

    public function inventory()
    {
        return $this->belongsTo(Inventory::class, 'inventory_id', 'id');
    }

    public function transaction()
    {
        return $this->belongsTo(Transaction::class, 'transaction_id', 'id');
    }
}
