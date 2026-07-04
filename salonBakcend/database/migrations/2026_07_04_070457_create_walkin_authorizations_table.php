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
        Schema::create('walkin_authorizations', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('staff_id');
            $table->boolean('isAuthorizedForWalkIn')->default(false);
            $table->foreign('staff_id')->references('id')->on('users')->cascadeOnDelete()->cascadeOnUpdate();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('walkin_authorizations');
    }
};
