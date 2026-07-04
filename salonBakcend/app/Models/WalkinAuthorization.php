<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class WalkinAuthorization extends Model
{
    protected $table = 'walkin_authorizations';
    protected $fillable = [
        'staff_id',
        'isAuthorizedForWalkin'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'staff_id', 'id');
    }
}
