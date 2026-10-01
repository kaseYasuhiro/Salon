<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->timestamp('grace_started_notified_at')->nullable()->after('status');
            $table->timestamp('grace_ended_notified_at')->nullable()->after('grace_started_notified_at');
            $table->timestamp('reminder_sent_at')->nullable()->after('grace_ended_notified_at');
        });
    }

    public function down(): void
    {
        Schema::table('appointments', function (Blueprint $table) {
            $table->dropColumn([
                'grace_started_notified_at',
                'grace_ended_notified_at',
                'reminder_sent_at',
            ]);
        });
    }
};