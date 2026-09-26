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
        Schema::create('walk_in_transactions', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('walkin_id');
            $table->unsignedBigInteger('inventory_id');
            $table->integer('quantity_change');
            $table->foreign('walkin_id')->references('id')->on('walk_ins')->cascadeOnDelete()->cascadeOnUpdate();
            $table->foreign('inventory_id')->references('id')->on('inventories')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('walk_in_transactions');
    }
};
