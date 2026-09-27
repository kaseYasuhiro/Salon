<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('remittances', function (Blueprint $table) {
            // ✅ Add user_id right after business_date_id
            $table->unsignedBigInteger('user_id')->after('business_date_id');

            // Foreign key to users table
            $table->foreign('user_id')
                  ->references('id')
                  ->on('users')
                  ->cascadeOnDelete()
                  ->cascadeOnUpdate();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('remittances', function (Blueprint $table) {
            // Drop foreign key first, then the column
            $table->dropForeign(['user_id']);
            $table->dropColumn('user_id');
        });
    }
};