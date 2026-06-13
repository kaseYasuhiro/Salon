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
        Schema::create('business_schedules', function (Blueprint $table) {
            $table->id();
            $table->date('business_date');
            $table->time('open_time');
            $table->time('close_time');
            $table->boolean('is_open');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('business_schedules');
    }
};
