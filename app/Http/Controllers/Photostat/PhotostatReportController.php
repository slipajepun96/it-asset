<?php

namespace App\Http\Controllers\Photostat;

use App\Http\Controllers\Controller;
use App\Models\PhotostatMachine;
use App\Models\PhotostatMeterReading;
use App\Models\PhotostatRecord;
use App\Services\PhotostatService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/** Admins: a month's records and meter checks (the PDF and CSV are made in the browser from the same data). */
class PhotostatReportController extends Controller
{
    public function index(Request $request): Response
    {
        $month = PhotostatController::month($request);
        $range = [$month->copy()->startOfMonth(), $month->copy()->endOfMonth()];
        $machineId = $request->integer('machine_id') ?: null;

        return Inertia::render('photostat/admin/report', [
            'month' => $month->format('Y-m'),
            'machineId' => $machineId,
            'machines' => PhotostatMachine::orderBy('name')->get(['id', 'name']),
            'records' => PhotostatRecord::with('machine:id,name')
                ->whereBetween('created_at', $range)
                ->when($machineId, fn ($q) => $q->where('machine_id', $machineId))
                ->latest('id')->get()->map->toListItem(),
            // Starting readings only set a machine's first numbers; they aren't checks.
            'checks' => PhotostatMeterReading::with('machine:id,name')
                ->where('is_initial', false)
                ->whereBetween('created_at', $range)
                ->when($machineId, fn ($q) => $q->where('machine_id', $machineId))
                ->latest('id')->get()->map->toListItem(),
        ]);
    }

    public function destroyRecord(PhotostatRecord $record, PhotostatService $service): RedirectResponse
    {
        $service->deleteRecord($record);

        return back();
    }
}
