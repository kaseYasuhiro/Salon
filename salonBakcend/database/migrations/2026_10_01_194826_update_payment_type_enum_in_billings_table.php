<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Modify the enum to include 'full'
        DB::statement("ALTER TABLE billings MODIFY COLUMN payment_type ENUM('downpayment', 'remaining', 'full') NOT NULL");
    }

    public function down(): void
    {
        // Revert back to the original enum
        DB::statement("ALTER TABLE billings MODIFY COLUMN payment_type ENUM('downpayment', 'remaining') NOT NULL");
    }
};