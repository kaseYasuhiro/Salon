<?php

namespace App\Models;

use App\Models\Billing;
use App\Models\Refunds;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Payments extends Model
{
    protected $table = 'payments';
    protected $fillable = [
        'payment_id',
        'billing_id',
        'payment_method',
        'payment_proof'
    ];

    public function billing()
    {
        return $this->belongsTo(Billing::class, 'billing_id', 'id');
    }

    public function refunds()
    {
        return $this->hasMany(Refunds::class, 'payment_id', 'id');
    }
}
