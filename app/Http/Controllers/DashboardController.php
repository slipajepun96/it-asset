<?php

namespace App\Http\Controllers;

use App\Enums\AssetStatus;
use App\Models\Asset;
use App\Models\AssetLog;
use App\Models\Location;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    public function __invoke(): Response
    {
        $owned = fn () => Asset::query()->whereNotIn('status', [AssetStatus::Retired->value, AssetStatus::Lost->value]);

        $byStatus = Asset::query()->selectRaw('status, count(*) as total')->groupBy('status')->pluck('total', 'status');

        return Inertia::render('dashboard', [
            'stats' => [
                'total_assets' => Asset::count(),
                'current_value' => (float) $owned()->sum('price'),
                'in_repair' => (int) ($byStatus[AssetStatus::InRepair->value] ?? 0),
                'open_problems_30d' => AssetLog::where('type', 'problem')->where('logged_at', '>=', now()->subDays(30))->count(),
                'maintenance_cost_year' => (float) AssetLog::whereIn('type', ['maintenance', 'service', 'component_swap'])
                    ->where('logged_at', '>=', now()->startOfYear())->sum('cost'),
                'missing_invoice' => Asset::whereNull('invoice_path')->count(),
                'unassigned_location' => Asset::whereNull('location_id')->count(),
            ],
            'by_status' => collect(AssetStatus::cases())->map(fn ($s) => [
                'label' => $s->value,
                'count' => (int) ($byStatus[$s->value] ?? 0),
            ])->values(),
            'by_location' => Location::query()
                ->withCount('assets')
                ->withSum('assets as value', 'price')
                ->orderByDesc('assets_count')
                ->limit(6)
                ->get()
                ->map(fn ($l) => ['label' => $l->name, 'count' => $l->assets_count, 'value' => (float) $l->value]),
            'by_category' => Asset::query()
                ->selectRaw("coalesce(category, 'Uncategorised') as label, count(*) as count")
                ->groupBy('label')->orderByDesc('count')->limit(6)->get(),
            'recent_logs' => AssetLog::with(['asset:id,name', 'user:id,name'])
                ->latest('logged_at')->latest('id')->limit(8)->get()
                ->map(fn ($l) => [
                    'id' => $l->id,
                    'asset_id' => $l->asset_id,
                    'asset' => $l->asset?->name,
                    'type' => $l->type->value,
                    'description' => $l->description,
                    'user' => $l->user?->name,
                    'logged_at' => $l->logged_at->toIso8601String(),
                ]),
        ]);
    }
}
