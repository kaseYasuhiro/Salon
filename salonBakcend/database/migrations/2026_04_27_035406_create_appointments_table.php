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
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('customer_id');
            $table->date('appointment_date');
            $table->time('appointment_time')->nullable();
            $table->enum('status', ['pending', 'confirmed', 'cancelled', 'no-show', 'completed'])->default('pending');
            $table->string('cancellation_reason', 255)->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->date('cancelled_at')->nullable();
            $table->foreign('customer_id')->references('id')->on('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
