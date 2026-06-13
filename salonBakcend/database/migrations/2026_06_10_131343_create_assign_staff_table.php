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
        Schema::create('assign_staff', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('business_date_id');
            $table->foreign('staff_id')->references('id')->on('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('business_date_id')->references('id')->on('business_schedules')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('assign_staff');
    }
};
