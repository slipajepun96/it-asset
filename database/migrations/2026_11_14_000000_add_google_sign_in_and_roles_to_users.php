<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Sign in with Google, with admin approval and roles.
// People who could already sign in keep full access: they become active admins.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('google_id')->nullable()->unique()->after('email');
            $table->string('avatar', 1000)->nullable()->after('google_id');
            $table->string('role', 20)->default('user')->after('avatar');
            $table->string('status', 20)->default('pending')->index()->after('role');
            $table->timestamp('approved_at')->nullable()->after('status');
            $table->foreignId('approved_by')->nullable()->after('approved_at')->constrained('users')->nullOnDelete();
            $table->timestamp('last_login_at')->nullable()->after('approved_by');
            $table->string('password')->nullable()->change();
        });

        DB::table('users')->update(['role' => 'admin', 'status' => 'active', 'approved_at' => now()]);
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('approved_by');
            $table->dropUnique(['google_id']);
            $table->dropColumn(['google_id', 'avatar', 'role', 'status', 'approved_at', 'last_login_at']);
        });
    }
};
