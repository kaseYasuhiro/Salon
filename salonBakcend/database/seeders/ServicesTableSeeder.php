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
            'service_name' => 'Haircut (Male)',
            'description' => 'test',
            'price' => 120.00,
            'duration_minutes' => 30,
            'is_multitaskable' => false,
        ]);

        Services::create([
            'service_name' => 'Haircut (Female)',
            'description' => 'test',
            'price' => 150.00,
            'duration_minutes' => 30,
            'is_multitaskable' => false,
        ]);

        Services::create([
            'service_name' => 'Brazillian Hair Rebond (Long Hair)',
            'description' => 'test',
            'price' => '2000',
            'duration_minutes' => 240,
            'is_multitaskable' => true
        ]);

        Services::create([
            'service_name' => 'Brazillian Hair Rebond (Short Hair)',
            'description' => 'test',
            'price' => '1500',
            'duration_minutes' => 240,
            'is_multitaskable' => true
        ]);

        Services::create([
            'service_name' => 'Hot Oil',
            'description' => 'test',
            'price' => 300.00,
            'duration_minutes' => 30,
            'is_multitaskable' => false,
        ]);

        Services::create([
            'service_name' => 'Hair Brazillian (Long Hair)',
            'description' => 'test',
            'price' => 1000.00,
            'duration_minutes' => 30,
            'is_multitaskable' => false,
        ]);

        Services::create([
            'service_name' => 'Hair Brazillian (Short Hair)',
            'description' => 'test',
            'price' => 800.00,
            'duration_minutes' => 30,
            'is_multitaskable' => false,
        ]);
        
    }
}
