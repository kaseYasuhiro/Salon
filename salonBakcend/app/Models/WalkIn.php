<?php

namespace App\Models;

use App\Models\Services;
use App\Models\User;
use App\Models\WalkInTransaction;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalkIn extends Model
{
    protected $table = 'walk_ins';
    protected $fillable = [
        'customer_name',
        'service_id',
        'stylist_id',
        'is_finished',
        'amount_paid'
    ];

    public function services()
    {
        return $this->belongsTo(Services::class, 'service_id', 'id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'stylist_id', 'id');
    }

    public function walkInTransaction()
    {
        return $this->hasMany(WalkInTransaction::class, 'walkin_id', 'id');
    }
}
