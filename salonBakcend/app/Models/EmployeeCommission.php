<?php

namespace App\Models;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class EmployeeCommission extends Model
{
    protected $table = 'employee_commissions';
    protected $fillable = [
        'employee_id',
        'commission_amount',
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'employee_id', 'id');
    }
}
