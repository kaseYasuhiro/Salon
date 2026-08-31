<?php

namespace App\Models;

use App\Models\Services;
use App\Models\HairColors;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ServiceHairColors extends Model
{
    protected $table = 'service_hair_colors';
    protected $fillable = [
        'service_id',
        'hair_color_id'
    ];

    public function services()
    {
        return $this->belongsTo(Services::class, 'service_id', 'id');
    }

    public function hairColors()
    {
        return $this->belongsTo(HairColors::class, 'hair_color_id', 'id');
    }
}
