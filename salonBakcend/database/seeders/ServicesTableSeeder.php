<?php

namespace Database\Seeders;

use App\Models\Services;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ServicesTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Services::create([
            'service_name' => 'Haircut',
            'description' => 'Cuts Your Hair',
            'price' => 100.00,
            'duration_minutes' => 30,
            'is_multitaskable' => false,
        ]);

        Services::create([
            'service_name' => 'Rebond',
            'description' => 'a',
            'price' => '500',
            'duration_minutes' => 240,
            'is_multitaskable' => true
        ]);
    }
}
