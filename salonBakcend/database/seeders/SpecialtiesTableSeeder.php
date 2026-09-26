<?php

namespace Database\Seeders;

use App\Models\Specialties;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class SpecialtiesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Specialties::create([
            'specialty_name' => 'barber'
        ]);

        Specialties::create([
            'specialty_name' => 'stylist'
        ]);
    }
}
