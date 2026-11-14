<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Photostat machine usage log (moved in from Buku Rekod).
return new class extends Migration
{
    public function up(): void
    {
        // bw_counter / color_counter: the app's count, i.e. the last meter reading plus everything recorded since.
        // qr_token: the secret in the machine's QR poster link; recording through it needs no sign-in.
        Schema::create('photostat_machines', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('location')->default('');
            $table->foreignUuid('asset_id')->nullable()->unique()->constrained('assets')->nullOnDelete();
            $table->unsignedInteger('bw_counter')->default(0);
            $table->unsignedInteger('color_counter')->default(0);
            $table->boolean('active')->default(true);
            $table->char('qr_token', 32)->unique();
            $table->timestamps();
        });

        // Keeps the meter numbers before each record and the person's name, so history survives renames and removals.
        Schema::create('photostat_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('machine_id')->constrained('photostat_machines')->restrictOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('user_name');
            $table->unsignedInteger('bw')->default(0);
            $table->unsignedInteger('color')->default(0);
            $table->unsignedInteger('bw_before');
            $table->unsignedInteger('color_before');
            $table->string('purpose', 200)->default('');
            $table->string('source', 10)->default('app'); // 'app' (signed in) or 'qr' (QR poster)
            // Milliseconds, so a record and a meter reading in the same second still have an order.
            $table->timestamp('created_at', 3)->useCurrent()->index();
            $table->index(['machine_id', 'created_at']);
            $table->index(['user_id', 'created_at']);
        });

        // An admin's reading of the real meter. *_expected is what the app had counted then; the difference is
        // pages nobody recorded (or, if negative, recorded but not printed).
        Schema::create('photostat_meter_readings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('machine_id')->constrained('photostat_machines')->cascadeOnDelete();
            $table->unsignedInteger('bw_reading');
            $table->unsignedInteger('color_reading');
            $table->unsignedInteger('bw_expected');
            $table->unsignedInteger('color_expected');
            $table->string('note', 200)->default('');
            $table->boolean('is_initial')->default(false);
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('created_by_name');
            $table->timestamp('created_at', 3)->useCurrent()->index();
            $table->index(['machine_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('photostat_meter_readings');
        Schema::dropIfExists('photostat_records');
        Schema::dropIfExists('photostat_machines');
    }
};
