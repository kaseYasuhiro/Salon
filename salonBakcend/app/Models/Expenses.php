<?php

namespace App\Models;
use App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Expenses extends Model
{
    protected $table = 'expenses';
    protected $fillable = [
        'expense_name',
        'stock_amount',
        'amount',
        'expense_date',
        'description',
        'recorded_by'
    ];

    public function user()
    {
        return $this->belongsTo(User::class, 'recorded_by', 'id');
    }
}
