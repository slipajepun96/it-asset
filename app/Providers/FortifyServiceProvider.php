<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Inertia\Inertia;
use Laravel\Fortify\Fortify;

/**
 * Fortify only provides the login screen, logout and sessions here. Everyone signs in with Google
 * (see GoogleAuthController); password sign-in, registration, password reset and passkeys are off.
 */
class FortifyServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Fortify::loginView(fn (Request $request) => Inertia::render('auth/login', [
            'googleConfigured' => (bool) (config('services.google.client_id') && config('services.google.client_secret')),
            'status' => $request->session()->get('status'),
        ]));

        // No password sign-in: a posted email and password never authenticate.
        Fortify::authenticateUsing(fn (Request $request) => null);

        RateLimiter::for('login', fn (Request $request) => Limit::perMinute(5)->by($request->ip()));
        RateLimiter::for('google-login', fn (Request $request) => Limit::perMinute(20)->by($request->ip()));
        // Recording prints from a machine's QR poster, without signing in.
        RateLimiter::for('photostat-qr', fn (Request $request) => Limit::perMinutes(10, 30)->by($request->ip()));
    }
}
