<?php

namespace Database\Seeders;

// use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;


class DatabaseSeeder extends Seeder
{
    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(UsersTableSeeder::class);
        $this->call(SpecialtiesTableSeeder::class);
        $this->call(ServicesTableSeeder::class);
        $this->call(ServicePriceAdjustmentsTableSeeder::class);
        $this->call(ProductsTableSeeder::class);
        $this->call(HairColorTableSeeder::class);
    }
}
