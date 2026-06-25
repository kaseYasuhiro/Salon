<?php

namespace App\Models;

use App\Models\BusinessSchedules;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Remittance extends Model
{
    protected $table = 'remittances';
    protected $fillable = [
        'business_date_id',
        'remittance_amount'
    ];

    public function businessSchedules()
    {
        return $this->belongsTo(BusinessSchedules::class, 'business_date_id', 'id');
    }
}
