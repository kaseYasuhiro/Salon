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
            'role' => 'owner',
            'email_verified_at' => '2026-09-10 07:34:58'
        ]);

        User::create([
            'first_name' => 'Jerwin',
            'last_name' => 'Buray',
            'email' => 'jerwin@gmail.com',
            'password' => Hash::make('jerwin123'),
            'phone_number' => '09123456789',
            'role' => 'staff',
            'email_verified_at' => '2026-09-10 07:34:58'
        ]);

        User::create([
            'first_name' => 'Lorievel Anne',
            'last_name' => 'Anadon',
            'email' => 'lorievel@gmail.com',
            'password' => Hash::make('lorievel'),
            'phone_number' => '09123456789',
            'role' => 'staff',
            'email_verified_at' => '2026-09-10 07:34:58'
        ]);

        User::create([
            'first_name' => 'Nestor',
            'last_name' => 'Cagas',
            'email' => 'nestor@gmail.com',
            'password' => Hash::make('nestor123'),
            'phone_number' => '09123456789',
            'role' => 'customer',
            'email_verified_at' => '2026-09-10 07:34:58'
        ]);
    }
}
