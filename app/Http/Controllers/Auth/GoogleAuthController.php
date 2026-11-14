<?php

namespace App\Http\Controllers\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Http\Controllers\Controller;
use App\Models\User;
use GuzzleHttp\Client;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\InvalidStateException;
use Throwable;

/**
 * The only way to sign in. First-time Google accounts become a pending request that an admin approves
 * (People page). An admin can also pre-approve an email. ADMIN_EMAIL's account is made an active admin.
 */
class GoogleAuthController extends Controller
{
    public function redirect(): RedirectResponse
    {
        if (! $this->configured()) {
            return $this->fail('Sign in with Google is not set up yet. Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env.');
        }

        return Socialite::driver('google')
            ->redirectUrl(url(config('services.google.redirect')))
            ->with(['prompt' => 'select_account'])
            ->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            return $this->fail('Google sign-in was cancelled.');
        }

        try {
            // Verify Google's SSL certificate with the CA bundle shipped in the project, so the
            // token exchange works even when the server's php.ini has no curl.cainfo (e.g. PHP on Windows).
            $google = Socialite::driver('google')
                ->redirectUrl(url(config('services.google.redirect')))
                ->setHttpClient(new Client(['verify' => resource_path('certs/cacert.pem'), 'timeout' => 15]))
                ->user();
        } catch (InvalidStateException) {
            return $this->fail('The sign-in session expired. Please try again.');
        } catch (Throwable $e) {
            report($e);

            return $this->fail('Google sign-in failed. Please try again.');
        }

        $email = strtolower((string) $google->getEmail());
        if ($email === '' || (($google->user['email_verified'] ?? true) === false)) {
            return $this->fail('Your Google account has no verified email address.');
        }

        // Match the linked Google account first, then an email an admin pre-approved.
        $user = User::where('google_id', $google->getId())->first()
            ?? User::whereNull('google_id')->whereRaw('LOWER(email) = ?', [$email])->first();

        if ($user === null && User::whereRaw('LOWER(email) = ?', [$email])->exists()) {
            return $this->fail("This email ({$email}) is linked to a different Google account.");
        }

        $user ??= new User([
            'name' => $google->getName() ?: $email,
            'email' => $email,
            'role' => UserRole::User,
            'status' => UserStatus::Pending,
        ]);

        $adminEmail = strtolower(trim((string) config('services.google.admin_email')));
        if ($adminEmail !== '' && $email === $adminEmail && ! $user->isAdmin()) {
            $user->role = UserRole::Admin;
            $user->status = UserStatus::Active;
            $user->approved_at = now();
        }

        $user->forceFill([
            'google_id' => $google->getId(),
            'avatar' => $google->getAvatar(),
            'email' => $email,
            'email_verified_at' => $user->email_verified_at ?? now(),
        ])->save();

        if ($user->status === UserStatus::Pending) {
            return redirect()->route('login')->with('status', 'Thanks! Your access request has been sent. An admin needs to approve your account before you can sign in.');
        }
        if ($user->status === UserStatus::Rejected) {
            return $this->fail('Your access request was not approved. Contact an admin if you think this is a mistake.');
        }

        $user->forceFill(['last_login_at' => now()])->save();
        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('home'));
    }

    private function configured(): bool
    {
        return (bool) (config('services.google.client_id') && config('services.google.client_secret'));
    }

    private function fail(string $message): RedirectResponse
    {
        return redirect()->route('login')->withErrors(['google' => $message]);
    }
}
