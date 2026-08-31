<?php

namespace Database\Seeders;

use App\Models\HairColors;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class HairColorTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        HairColors::create([
            'color_name' => 'Red',
            'color_code' => '#ff0000',
            'is_active' => true
        ]);

        HairColors::create([
            'color_name' => 'Blue',
            'color_code' => '#0200ff',
            'is_active' => true
        ]);

        HairColors::create([
            'color_name' => 'Yellow',
            'color_code' => '#FAE843',
            'is_active' => true
        ]);

        
    }
}
