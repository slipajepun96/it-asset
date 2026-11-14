<?php

namespace Tests\Feature\Auth;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\GoogleProvider;
use Laravel\Socialite\Two\User as GoogleUser;
use Mockery;
use Tests\TestCase;

class AuthenticationTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.google.client_id' => 'test-id', 'services.google.client_secret' => 'test-secret', 'services.google.admin_email' => 'boss@example.test']);
    }

    private function googleReturns(string $email, string $id = 'g-1', string $name = 'Google Person'): void
    {
        $user = (new GoogleUser)->map(['id' => $id, 'email' => $email, 'name' => $name, 'avatar' => 'https://example.test/a.png']);
        $user->user = ['email_verified' => true];
        $provider = Mockery::mock(GoogleProvider::class);
        $provider->shouldReceive('redirectUrl')->andReturnSelf();
        $provider->shouldReceive('setHttpClient')->andReturnSelf();
        $provider->shouldReceive('user')->andReturn($user);
        Socialite::shouldReceive('driver')->with('google')->andReturn($provider);
    }

    public function test_login_screen_can_be_rendered()
    {
        $this->get(route('login'))->assertOk()->assertInertia(fn ($page) => $page->component('auth/login')->where('googleConfigured', true));
    }

    public function test_password_sign_in_is_turned_off()
    {
        $user = User::factory()->admin()->create();
        $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);
        $this->assertGuest();
    }

    public function test_first_google_sign_in_creates_a_pending_request()
    {
        $this->googleReturns('new@example.test');
        $this->get(route('auth.google.callback'))->assertRedirect(route('login'))->assertSessionHas('status');

        $this->assertGuest();
        $user = User::where('email', 'new@example.test')->firstOrFail();
        $this->assertSame(UserStatus::Pending, $user->status);
        $this->assertSame(UserRole::User, $user->role);
    }

    public function test_admin_email_becomes_an_active_admin()
    {
        $this->googleReturns('BOSS@example.test');
        $this->get(route('auth.google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticated();
        $this->assertTrue(User::where('email', 'boss@example.test')->firstOrFail()->isAdmin());
    }

    public function test_pre_approved_email_gets_straight_in_and_is_linked()
    {
        User::factory()->create(['email' => 'staff@example.test', 'password' => null]);
        $this->googleReturns('staff@example.test', 'g-staff');
        $this->get(route('auth.google.callback'))->assertRedirect(route('home'));

        $this->assertAuthenticated();
        $this->assertSame('g-staff', User::where('email', 'staff@example.test')->value('google_id'));
    }

    public function test_rejected_accounts_cannot_sign_in()
    {
        User::factory()->rejected()->create(['email' => 'no@example.test', 'google_id' => 'g-no']);
        $this->googleReturns('no@example.test', 'g-no');
        $this->get(route('auth.google.callback'))->assertRedirect(route('login'))->assertSessionHasErrors('google');
        $this->assertGuest();
    }

    public function test_email_linked_to_another_google_account_is_refused()
    {
        User::factory()->create(['email' => 'taken@example.test', 'google_id' => 'g-original']);
        $this->googleReturns('taken@example.test', 'g-other');
        $this->get(route('auth.google.callback'))->assertSessionHasErrors('google');
        $this->assertGuest();
    }

    public function test_blocked_users_are_signed_out_on_their_next_request()
    {
        $user = User::factory()->rejected()->create();
        $this->actingAs($user)->get(route('photostat.index'))->assertRedirect(route('login'));
        $this->assertGuest();
    }

    public function test_only_admins_reach_the_asset_pages()
    {
        $this->actingAs(User::factory()->create())->get(route('dashboard'))->assertForbidden();
        $this->actingAs(User::factory()->create())->get(route('home'))->assertRedirect(route('photostat.index'));
        $this->actingAs(User::factory()->admin()->create())->get(route('home'))->assertRedirect(route('dashboard'));
    }

    public function test_users_can_logout()
    {
        $this->actingAs(User::factory()->create())->post(route('logout'))->assertRedirect('/');
        $this->assertGuest();
    }
}
