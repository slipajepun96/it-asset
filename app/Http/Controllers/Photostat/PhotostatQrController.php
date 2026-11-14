<?php

namespace App\Http\Controllers\Photostat;

use App\Http\Controllers\Controller;
use App\Models\PhotostatMachine;
use App\Services\PhotostatService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * A machine's QR poster links here. Anyone with the poster's link can record prints on that one machine with
 * just their name, no sign-in. Nothing else can be read or changed this way. Signed-in people are recorded as themselves.
 */
class PhotostatQrController extends Controller
{
    public function show(Request $request, string $token): Response
    {
        $machine = $this->machine($token);

        return Inertia::render('public/photostat', [
            'token' => $token,
            'machine' => $machine?->only('name', 'location'),
            'signedInAs' => $request->user()?->isActive() ? $request->user()->name : null,
            'saved' => $request->session()->get('photostat_saved'),
        ]);
    }

    public function store(Request $request, string $token, PhotostatService $service): RedirectResponse
    {
        $machine = $this->machine($token);
        abort_unless($machine, 404, 'This QR code is no longer valid.');

        $pages = PhotostatController::validatePages($request);
        $user = $request->user()?->isActive() ? $request->user() : null;

        if ($user) {
            $name = $user->name;
        } else {
            $name = preg_replace('/\s+/', ' ', trim((string) $request->input('name')));
            if (mb_strlen($name) < 2 || mb_strlen($name) > 100) {
                throw ValidationException::withMessages(['name' => 'Please enter your name.']);
            }
        }

        $record = $service->addRecord($machine->id, $pages, $user, $name, 'qr');

        // Only what the person needs to see that it went in; no meter numbers.
        return back()->with('photostat_saved', [
            'user_name' => $record->user_name,
            'machine_name' => $machine->name,
            'bw' => $record->bw,
            'color' => $record->color,
        ]);
    }

    private function machine(string $token): ?PhotostatMachine
    {
        if (! preg_match('/^[a-f0-9]{32}$/', $token)) {
            return null;
        }

        return PhotostatMachine::where('qr_token', $token)->where('active', true)->first();
    }
}
