<?php

use App\Http\Controllers\AssetController;
use App\Http\Controllers\AssetLogController;
use App\Http\Controllers\Auth\GoogleAuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\Photostat\PhotostatController;
use App\Http\Controllers\Photostat\PhotostatMachineController;
use App\Http\Controllers\Photostat\PhotostatQrController;
use App\Http\Controllers\Photostat\PhotostatReportController;
use App\Http\Controllers\SupplierController;
use App\Http\Controllers\UserController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Admins land on the asset dashboard; everyone else on the photostat log.
Route::get('/', fn (Request $request) => $request->user()?->isAdmin()
    ? to_route('dashboard')
    : to_route('photostat.index'))->middleware(['auth', 'active'])->name('home');

// ---- Sign in with Google (the only way in) ----
Route::middleware(['guest', 'throttle:google-login'])->group(function () {
    Route::get('auth/google', [GoogleAuthController::class, 'redirect'])->name('auth.google');
    Route::get('auth/google/callback', [GoogleAuthController::class, 'callback'])->name('auth.google.callback');
});

// ---- Public pages (no sign-in) ----
// The printed asset QR labels point here.
Route::get('a/{asset}', [AssetController::class, 'publicShow'])->name('assets.public');
// A photostat machine's QR poster: record prints with just a name.
Route::get('q/{token}', [PhotostatQrController::class, 'show'])->name('photostat.qr.show');
Route::post('q/{token}', [PhotostatQrController::class, 'store'])->middleware('throttle:photostat-qr')->name('photostat.qr.store');

// ---- Everyone approved ----
Route::middleware(['auth', 'active'])->group(function () {
    Route::get('photostat', [PhotostatController::class, 'index'])->name('photostat.index');
    Route::get('photostat/mine', [PhotostatController::class, 'mine'])->name('photostat.mine');
    Route::post('photostat/{machine}/records', [PhotostatController::class, 'store'])->whereNumber('machine')->name('photostat.records.store');
});

// ---- Admins ----
Route::middleware(['auth', 'active', 'admin'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('assets/labels', [AssetController::class, 'labels'])->name('assets.labels');
    Route::resource('assets', AssetController::class);
    Route::patch('assets/{asset}/status', [AssetController::class, 'updateStatus'])->name('assets.status');
    Route::get('assets/{asset}/invoice', [AssetController::class, 'invoice'])->name('assets.invoice');
    Route::get('assets/{asset}/qr', [AssetController::class, 'qr'])->name('assets.qr');
    Route::get('assets/{asset}/label', [AssetController::class, 'label'])->name('assets.label');
    Route::post('assets/{asset}/logs', [AssetLogController::class, 'store'])->name('assets.logs.store');
    Route::get('attachments/{attachment}', [AssetLogController::class, 'attachment'])->name('attachments.show');

    Route::resource('locations', LocationController::class)->only(['index', 'store', 'destroy']);
    Route::resource('suppliers', SupplierController::class)->only(['index', 'store', 'destroy']);

    Route::resource('users', UserController::class)->only(['index', 'store', 'update', 'destroy']);

    Route::prefix('photostat/admin')->name('photostat.admin.')->group(function () {
        Route::get('machines', [PhotostatMachineController::class, 'index'])->name('machines.index');
        Route::post('machines', [PhotostatMachineController::class, 'store'])->name('machines.store');
        Route::put('machines/{machine}', [PhotostatMachineController::class, 'update'])->name('machines.update');
        Route::post('machines/{machine}/qr', [PhotostatMachineController::class, 'newQr'])->name('machines.qr');
        Route::post('machines/{machine}/readings', [PhotostatMachineController::class, 'storeReading'])->name('readings.store');
        Route::delete('readings/{reading}', [PhotostatMachineController::class, 'destroyReading'])->name('readings.destroy');

        Route::get('report', [PhotostatReportController::class, 'index'])->name('report');
        Route::delete('records/{record}', [PhotostatReportController::class, 'destroyRecord'])->name('records.destroy');
    });
});

require __DIR__.'/settings.php';
