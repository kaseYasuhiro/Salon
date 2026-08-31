<?php

namespace App\Models;

use App\Models\ServiceHairColors;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HairColors extends Model
{
    protected $table = 'hair_colors';
    protected $fillable = [
        'color_name',
        'color_code',
        'is_active'
    ];

    public function servicehairColors()
    {
        return $this->hasMany(ServiceHairColors::class, 'hair_color_id', 'id');
    }
}
