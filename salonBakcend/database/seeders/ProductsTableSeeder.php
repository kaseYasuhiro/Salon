<?php

namespace Database\Seeders;

use App\Models\Products;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class ProductsTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        Products::create([
            'product_name' => 'Tri & 1 Conditioner (Lemon)',
            'description' => 'test',
            'unit' => 'ml',
            'unit_size' => '1500',
            'estimated_usages_per_unit' => '30',
            'is_active' => true
        ]);

        Products::create([
            'product_name' => 'Bremod Hair Brightener',
            'description' => 'test',
            'unit' => 'gr',
            'unit_size' => '1',
            'estimated_usages_per_unit' => '500',
            'is_active' => true
        ]);

        Products::create([
            'product_name' => 'Tri & 1 Keratin Cellophane Treatment',
            'description' => 'test',
            'unit' => 'ml',
            'unit_size' => '1000',
            'estimated_usages_per_unit' => '20',
            'is_active' => true
        ]);

        Products::create([
            'product_name' => 'Special Nursing Oxidizer (6%)',
            'description' => 'test',
            'unit' => 'ml',
            'unit_size' => '1000',
            'estimated_usages_per_unit' => '30',
            'is_active' => true
        ]);

        Products::create([
            'product_name' => 'Special Nursing Oxidizer (12%)',
            'description' => 'test',
            'unit' => 'ml',
            'unit_size' => '1000',
            'estimated_usages_per_unit' => '30',
            'is_active' => true
        ]);
    }

}
