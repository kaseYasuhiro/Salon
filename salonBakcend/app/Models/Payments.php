<?php

namespace App\Models;

use App\Models\Billing;
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
        return $this->belongsTo(Billing::class, 'id');
    }
}
