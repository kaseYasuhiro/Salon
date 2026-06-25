<?php

namespace App\Models;

use App\Models\Services;
use App\Models\User;
use App\Models\InventoryTransaction;
use App\Models\Appointments;
use App\Models\LossDamage;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaction extends Model
{
    protected $table = 'transactions';
    protected $fillable = [
        'appointment_id',
        'service_id',
        'assigned_employee_id',
        'notes',
        'service_status',
        'completed_at'
    ];

    public function services()
    {
        return $this->belongsTo(Services::class, 'service_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'assigned_employee_id', 'id');
    }

    public function inventoryTransaction()
    {
        return $this->hasMany(InventoryTransaction::class, 'transaction_id');
    }

    public function appointments()
    {
        return $this->belongsTo(Appointments::class, 'appointment_id', 'id');
    }

    public function lossDamage()
    {
        return $this->belongsTo(LossDamage::class, 'transaction_id', 'id');
    }
}
