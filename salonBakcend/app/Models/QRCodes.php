<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QRCodes extends Model
{
    protected $table = 'q_r_codes';
    protected $fillable = [
        'qr_image',
        'gcash_number'
    ];
}
