<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->unsignedBigInteger('deactivated_by_product')
                  ->nullable()
                  ->after('service_status');

            $table->foreign('deactivated_by_product')
                  ->references('id')
                  ->on('products')
                  ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('services', function (Blueprint $table) {
            $table->dropForeign(['deactivated_by_product']);
            $table->dropColumn('deactivated_by_product');
        });
    }
};