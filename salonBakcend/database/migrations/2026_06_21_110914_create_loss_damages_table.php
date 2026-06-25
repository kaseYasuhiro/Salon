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
        Schema::create('loss_damages', function (Blueprint $table) {
            $table->id();
            $table->date('date');
            $table->enum('incident_type', ['damage', 'inventory_loss', 'theft']);
            $table->enum('category', ['product', 'service', 'other']);
            $table->decimal('amount', 10,2);
            $table->text('description');
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('transaction_id')->nullable();
            $table->unsignedBigInteger('inventory_id')->nullable();
            $table->enum('status', ['reported', 'written-off', 'resolved'])->default('reported');
            $table->foreign('staff_id')->references('id')->on('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('transaction_id')->references('id')->on('transactions')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('inventory_id')->references('id')->on('inventories')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('loss_damages');
    }
};
