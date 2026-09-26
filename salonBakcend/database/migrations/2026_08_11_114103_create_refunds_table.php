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
        Schema::create('refunds', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('payment_id');
            $table->unsignedBigInteger('appointment_id');
            $table->decimal('refund_amount', 10,2);
            $table->enum('refund_method', ['Cash', 'GCash']);
            $table->string('refund_reason', 150);
            $table->enum('status', ['pending', 'completed', 'rejected']);
            $table->date('processed_at');
            $table->foreign('payment_id')->references('id')->on('payments')->cascadeOnUpdate()->cascadeOnDelete();
            $table->foreign('appointment_id')->references('id')->on('appointments')->cascadeOnUpdate()->cascadeOnDelete();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('refunds');
    }
};
