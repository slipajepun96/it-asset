<?php

namespace App\Http\Controllers\Photostat;

use App\Http\Controllers\Controller;
use App\Models\PhotostatMachine;
use App\Models\PhotostatRecord;
use App\Services\PhotostatService;
use Carbon\CarbonInterface;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/** Signed-in people: record prints on the machine, see their own records. */
class PhotostatController extends Controller
{
    /** There is only one machine, so this goes straight to its form. */
    public function index(): Response
    {
        $machine = PhotostatMachine::where('active', true)->oldest('id')->first();

        if (! $machine) {
            return Inertia::render('photostat/index');
        }

        return Inertia::render('photostat/machine', [
            'machine' => $machine->only('id', 'name', 'location', 'bw_counter', 'color_counter'),
            'recent' => $machine->records()->with('machine:id,name')->latest('id')->limit(20)->get()
                ->map->toListItem(),
        ]);
    }

    public function store(Request $request, PhotostatMachine $machine, PhotostatService $service): RedirectResponse
    {
        $pages = self::validatePages($request);
        $record = $service->addRecord($machine->id, $pages, $request->user(), $request->user()->name, 'app');

        Inertia::flash('toast', ['type' => 'success', 'message' => "Saved: {$record->bw} B&W, {$record->color} colour."]);

        return back();
    }

    public function mine(Request $request): Response
    {
        $month = self::month($request);

        return Inertia::render('photostat/mine', [
            'month' => $month->format('Y-m'),
            'records' => PhotostatRecord::with('machine:id,name')
                ->where('user_id', $request->user()->id)
                ->whereBetween('created_at', [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()])
                ->latest('id')->get()->map->toListItem(),
        ]);
    }

    /** @return array{bw: int, color: int, purpose: string} */
    public static function validatePages(Request $request): array
    {
        $data = $request->validate([
            'bw' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'color' => ['nullable', 'integer', 'min:0', 'max:100000'],
            'purpose' => ['nullable', 'string', 'max:200'],
        ]);
        $pages = ['bw' => (int) ($data['bw'] ?? 0), 'color' => (int) ($data['color'] ?? 0), 'purpose' => trim($data['purpose'] ?? '')];

        if ($pages['bw'] + $pages['color'] === 0) {
            throw ValidationException::withMessages(['bw' => 'Enter how many pages you printed.']);
        }

        return $pages;
    }

    /** ?month=YYYY-MM in the app's time zone, defaulting to this month. */
    public static function month(Request $request): CarbonInterface
    {
        $value = (string) $request->query('month', '');

        return preg_match('/^\d{4}-\d{2}$/', $value) ? Date::createFromFormat('Y-m-d', "{$value}-01")->startOfDay() : now()->startOfMonth();
    }
}
