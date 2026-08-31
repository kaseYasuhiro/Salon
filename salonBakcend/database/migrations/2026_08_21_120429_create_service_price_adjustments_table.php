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
        Schema::create('service_price_adjustments', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('service_id');
            $table->string('hair_length', 20);
            $table->string('hair_thickness', 20);
            $table->decimal('additional_price', 10,2);
            $table->foreign('service_id')->references('id')->on('services')->cascadeOnUpdate()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('service_price_adjustments');
    }
};
