<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UsersTableSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        User::create([
            'first_name' => 'Richel',
            'last_name' => 'Crampatanta',
            'email' => 'richel@gmail.com',
            'password' => Hash::make('titacramps'),
            'phone_number' => '09123456789',
            'role' => 'owner'
        ]);
    }
}
