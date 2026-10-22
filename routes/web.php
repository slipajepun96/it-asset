<?php

use App\Http\Controllers\AssetController;
use App\Http\Controllers\AssetLogController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\LocationController;
use App\Http\Controllers\SupplierController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/dashboard')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('dashboard', DashboardController::class)->name('dashboard');

    Route::get('assets/labels', [AssetController::class, 'labels'])->name('assets.labels');
    Route::resource('assets', AssetController::class);
    Route::patch('assets/{asset}/status', [AssetController::class, 'updateStatus'])->name('assets.status');
    Route::get('assets/{asset}/invoice', [AssetController::class, 'invoice'])->name('assets.invoice');
    Route::get('assets/{asset}/qr', [AssetController::class, 'qr'])->name('assets.qr');
    Route::get('assets/{asset}/label', [AssetController::class, 'label'])->name('assets.label');
    Route::post('assets/{asset}/logs', [AssetLogController::class, 'store'])->name('assets.logs.store');

    Route::resource('locations', LocationController::class)->only(['index', 'store', 'destroy']);
    Route::resource('suppliers', SupplierController::class)->only(['index', 'store', 'destroy']);
});

require __DIR__.'/settings.php';
