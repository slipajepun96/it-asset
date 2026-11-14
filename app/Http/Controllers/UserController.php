<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

/** Admins approve sign-in requests, pre-approve emails, change roles, block and remove accounts. */
class UserController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('users/index', [
            'users' => User::orderByDesc('created_at')->get()->map(fn (User $u) => [
                'id' => $u->id,
                'name' => $u->name,
                'email' => $u->email,
                'avatar' => $u->avatar,
                'role' => $u->role->value,
                'status' => $u->status->value,
                'google' => $u->google_id !== null,
                'created_at' => $u->created_at?->toIso8601String(),
                'last_login_at' => $u->last_login_at?->toIso8601String(),
            ]),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', Rule::unique('users', 'email')],
            'role' => ['required', Rule::enum(UserRole::class)],
        ]);

        User::create([
            ...$data,
            'email' => strtolower($data['email']),
            'status' => UserStatus::Active,
        ])->forceFill(['approved_at' => now(), 'approved_by' => $request->user()->id])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$data['name']} can now sign in with Google."]);

        return back();
    }

    public function update(Request $request, User $user): RedirectResponse
    {
        $data = $request->validate([
            'role' => ['sometimes', Rule::enum(UserRole::class)],
            'status' => ['sometimes', Rule::enum(UserStatus::class)],
        ]);

        abort_if($user->is($request->user()), 422, 'You cannot change your own role or access.');

        $user->fill($data);
        if ($user->isDirty('status') && $user->status === UserStatus::Active) {
            $user->forceFill(['approved_at' => now(), 'approved_by' => $request->user()->id]);
        }
        $user->save();

        // Blocked or demoted people lose their sessions at once (the 'active' middleware also signs them out).
        if ($user->status !== UserStatus::Active) {
            DB::table('sessions')->where('user_id', $user->id)->delete();
        }

        return back();
    }

    public function destroy(Request $request, User $user): RedirectResponse
    {
        abort_if($user->is($request->user()), 422, 'You cannot remove your own account.');
        DB::table('sessions')->where('user_id', $user->id)->delete();
        $user->delete();

        return back();
    }
}
