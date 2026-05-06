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
        Schema::create('transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('appointment_id');
            $table->unsignedBigInteger('service_id');
            $table->unsignedBigInteger('assigned_employee_id')->nullable();
            $table->string('notes')->nullable();
            $table->enum('service_status', ['pending', 'completed', 'cancelled']);
            $table->date('completed_at')->nullable();
            $table->foreign('appointment_id')->references('id')->on('appointments')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('service_id')->references('id')->on('services')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('assigned_employee_id')->references('id')->on('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('transactions');
    }
};
