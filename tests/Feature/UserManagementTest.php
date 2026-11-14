<?php

namespace Tests\Feature;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_approves_a_request_and_sees_the_pending_count()
    {
        $admin = User::factory()->admin()->create();
        $waiting = User::factory()->pending()->create();

        $this->actingAs($admin)->get(route('users.index'))
            ->assertInertia(fn ($page) => $page->component('users/index')->where('auth.pendingCount', 1));

        $this->actingAs($admin)->put(route('users.update', $waiting), ['status' => 'active'])->assertRedirect();
        $waiting->refresh();
        $this->assertSame(UserStatus::Active, $waiting->status);
        $this->assertSame($admin->id, $waiting->approved_by);
    }

    public function test_admin_pre_approves_an_email()
    {
        $this->actingAs(User::factory()->admin()->create())
            ->post(route('users.store'), ['name' => 'Siti', 'email' => 'Siti@Example.test', 'role' => 'admin'])
            ->assertRedirect();

        $siti = User::where('email', 'siti@example.test')->firstOrFail();
        $this->assertTrue($siti->isAdmin());
    }

    public function test_admins_cannot_change_their_own_access()
    {
        $admin = User::factory()->admin()->create();
        $this->actingAs($admin)->put(route('users.update', $admin), ['role' => 'user'])->assertStatus(422);
        $this->actingAs($admin)->delete(route('users.destroy', $admin))->assertStatus(422);
        $this->assertSame(UserRole::Admin, $admin->refresh()->role);
    }

    public function test_normal_users_cannot_manage_people()
    {
        $this->actingAs(User::factory()->create())->get(route('users.index'))->assertForbidden();
    }
}
