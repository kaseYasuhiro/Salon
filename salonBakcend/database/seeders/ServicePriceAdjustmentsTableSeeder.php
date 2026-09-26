<?php

namespace Database\Seeders;

use App\Models\ServicePriceAdjustments;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServicePriceAdjustmentsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        ServicePriceAdjustments::create([
            'service_id' => 3,
            'hair_length' => 'short',
            'hair_thickness' => 'thin',
            'additional_price' => 0 
        ]);

        ServicePriceAdjustments::create([
            'service_id' => 3,
            'hair_length' => 'long',
            'hair_thickness' => 'thick',
            'additional_price' => 100 
        ]);

        ServicePriceAdjustments::create([
            'service_id' => 4,
            'hair_length' => 'short',
            'hair_thickness' => 'thin',
            'additional_price' => 0 
        ]);

        ServicePriceAdjustments::create([
            'service_id' => 4,
            'hair_length' => 'long',
            'hair_thickness' => 'thick',
            'additional_price' => 100 
        ]);
    }
}
