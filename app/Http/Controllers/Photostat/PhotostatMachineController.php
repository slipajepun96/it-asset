<?php

namespace App\Http\Controllers\Photostat;

use App\Http\Controllers\Controller;
use App\Models\Asset;
use App\Models\PhotostatMachine;
use App\Models\PhotostatMeterReading;
use App\Services\PhotostatService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpKernel\Exception\HttpException;

/** Admins: the photostat machine (there is only one), its meter readings and QR poster. */
class PhotostatMachineController extends Controller
{
    public function index(PhotostatService $service): Response
    {
        $latest = $service->latestReadingIds();

        return Inertia::render('photostat/admin/machines', [
            'machines' => PhotostatMachine::with('asset:id,name,asset_number')->orderBy('name')->get()
                ->map(fn (PhotostatMachine $m) => [
                    ...$m->only('id', 'name', 'location', 'bw_counter', 'color_counter', 'active', 'asset_id'),
                    'asset' => $m->asset?->only('id', 'name', 'asset_number'),
                    'qr_url' => $m->qrUrl(),
                    'updated_at' => $m->updated_at?->toIso8601String(),
                ]),
            'readings' => PhotostatMeterReading::with('machine:id,name')->latest('id')->limit(50)->get()
                ->map(fn (PhotostatMeterReading $r) => $r->toListItem($latest[$r->machine_id] ?? null)),
            'assets' => Asset::orderBy('name')->get(['id', 'name', 'asset_number']),
        ]);
    }

    /** One-time setup: there is only one machine, so this works only while none exists. */
    public function store(Request $request, PhotostatService $service): RedirectResponse
    {
        if (PhotostatMachine::exists()) {
            Inertia::flash('toast', ['type' => 'error', 'message' => 'The photostat machine is already set up.']);

            return back();
        }
        $data = $this->validated($request);
        $meters = $request->validate([
            'bw_counter' => ['required', 'integer', 'min:0', 'max:999999999'],
            'color_counter' => ['required', 'integer', 'min:0', 'max:999999999'],
        ]);
        $service->createMachine($data, (int) $meters['bw_counter'], (int) $meters['color_counter'], $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => "{$data['name']} set up."]);

        return back();
    }

    /** Name, location, asset and visibility. Meter numbers change only through meter readings, so every change is on record. */
    public function update(Request $request, PhotostatMachine $machine): RedirectResponse
    {
        $machine->update($this->validated($request, $machine));

        return back();
    }

    /** A new QR secret: posters printed before stop working. */
    public function newQr(PhotostatMachine $machine): RedirectResponse
    {
        $machine->forceFill(['qr_token' => PhotostatMachine::newQrToken()])->save();
        Inertia::flash('toast', ['type' => 'success', 'message' => 'New QR code made. Print the new poster.']);

        return back();
    }

    public function storeReading(Request $request, PhotostatMachine $machine, PhotostatService $service): RedirectResponse
    {
        $data = $request->validate([
            'bw_reading' => ['required', 'integer', 'min:0', 'max:999999999'],
            'color_reading' => ['required', 'integer', 'min:0', 'max:999999999'],
            'note' => ['nullable', 'string', 'max:200'],
        ]);
        $service->takeReading($machine, (int) $data['bw_reading'], (int) $data['color_reading'], trim($data['note'] ?? ''), $request->user());

        Inertia::flash('toast', ['type' => 'success', 'message' => 'Meter reading saved.']);

        return back();
    }

    public function destroyReading(PhotostatMeterReading $reading, PhotostatService $service): RedirectResponse
    {
        try {
            $service->undoReading($reading);
        } catch (HttpException $e) {
            Inertia::flash('toast', ['type' => 'error', 'message' => $e->getMessage()]);
        }

        return back();
    }

    /** @return array<string, mixed> */
    private function validated(Request $request, ?PhotostatMachine $machine = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:200', Rule::unique('photostat_machines', 'name')->ignore($machine)],
            'location' => ['nullable', 'string', 'max:200'],
            'asset_id' => ['nullable', 'uuid', 'exists:assets,id', Rule::unique('photostat_machines', 'asset_id')->ignore($machine)],
            'active' => ['boolean'],
        ], ['asset_id.unique' => 'That asset is already linked to another machine.']);

        return [...$data, 'location' => trim($data['location'] ?? ''), 'active' => $request->boolean('active', true)];
    }
}
