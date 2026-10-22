<?php

namespace App\Http\Controllers;

use App\Enums\AssetStatus;
use App\Enums\LogType;
use App\Http\Requests\Assets\AssetRequest;
use App\Models\Asset;
use App\Models\Location;
use App\Models\Supplier;
use BaconQrCode\Renderer\Image\SvgImageBackEnd;
use BaconQrCode\Renderer\ImageRenderer;
use BaconQrCode\Renderer\RendererStyle\RendererStyle;
use BaconQrCode\Writer;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response as InertiaResponse;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssetController extends Controller
{
    public function index(Request $request): InertiaResponse
    {
        $search = trim((string) $request->query('search', ''));

        $assets = Asset::query()
            ->with(['location:id,name', 'supplier:id,name'])
            ->when($search !== '', function ($query) use ($search) {
                $like = '%'.str_replace(['%', '_'], ['\%', '\_'], $search).'%';
                $query->where(fn ($q) => $q
                    ->where('name', 'like', $like)
                    ->orWhere('serial_number', 'like', $like)
                    ->orWhere('asset_number', 'like', $like)
                    ->orWhere('id', 'like', $like));
            })
            ->when($request->query('status'), fn ($q, $status) => $q->where('status', $status))
            ->when($request->query('location_id'), fn ($q, $id) => $q->where('location_id', $id))
            ->latest()
            ->paginate(15)
            ->withQueryString()
            ->through(fn (Asset $asset) => $this->summary($asset));

        return Inertia::render('assets/index', [
            'assets' => $assets,
            'filters' => $request->only('search', 'status', 'location_id'),
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'statuses' => array_column(AssetStatus::cases(), 'value'),
        ]);
    }

    public function create(): InertiaResponse
    {
        return Inertia::render('assets/form', $this->formOptions());
    }

    public function store(AssetRequest $request): RedirectResponse
    {
        $data = $request->safe()->except('invoice');

        if ($request->hasFile('invoice')) {
            $data['invoice_path'] = $request->file('invoice')->store('invoices');
        }

        $asset = Asset::create($data);

        return to_route('assets.show', $asset);
    }

    public function show(Asset $asset): InertiaResponse
    {
        $asset->load(['supplier', 'location', 'logs.user:id,name', 'logs.location:id,name']);

        return Inertia::render('assets/show', [
            'asset' => [
                ...$this->summary($asset),
                'purchase_date' => $asset->purchase_date?->toDateString(),
                'price' => $asset->price,
                'supplier' => $asset->supplier?->only('id', 'name', 'contact'),
                'has_invoice' => $asset->invoice_path !== null,
                'url' => route('assets.show', $asset),
            ],
            'logs' => $asset->logs->map(fn ($log) => [
                'id' => $log->id,
                'type' => $log->type->value,
                'description' => $log->description,
                'cost' => $log->cost,
                'location' => $log->location?->name,
                'user' => $log->user?->name,
                'logged_at' => $log->logged_at->toIso8601String(),
            ]),
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'logTypes' => array_column(LogType::cases(), 'value'),
            'statuses' => array_column(AssetStatus::cases(), 'value'),
        ]);
    }

    public function edit(Asset $asset): InertiaResponse
    {
        return Inertia::render('assets/form', [
            ...$this->formOptions(),
            'asset' => [
                ...$asset->only('id', 'name', 'asset_number', 'category', 'serial_number', 'supplier_id', 'location_id', 'price', 'status'),
                'status' => $asset->status->value,
                'purchase_date' => $asset->purchase_date?->toDateString(),
                'has_invoice' => $asset->invoice_path !== null,
            ],
        ]);
    }

    public function update(AssetRequest $request, Asset $asset): RedirectResponse
    {
        $data = $request->safe()->except('invoice');

        if ($request->hasFile('invoice')) {
            if ($asset->invoice_path) {
                Storage::delete($asset->invoice_path);
            }
            $data['invoice_path'] = $request->file('invoice')->store('invoices');
        }

        $asset->update($data);

        return to_route('assets.show', $asset);
    }

    public function updateStatus(Request $request, Asset $asset): RedirectResponse
    {
        $data = $request->validate(['status' => ['required', 'in:'.implode(',', array_column(AssetStatus::cases(), 'value'))]]);
        $asset->update($data);

        return back();
    }

    public function destroy(Asset $asset): RedirectResponse
    {
        if ($asset->invoice_path) {
            Storage::delete($asset->invoice_path);
        }
        $asset->delete();

        return to_route('assets.index');
    }

    public function invoice(Asset $asset): StreamedResponse
    {
        abort_unless($asset->invoice_path && Storage::exists($asset->invoice_path), 404);

        return Storage::response($asset->invoice_path);
    }

    public function qr(Asset $asset): Response
    {
        $writer = new Writer(new ImageRenderer(new RendererStyle(320, 1), new SvgImageBackEnd));
        $svg = $writer->writeString(route('assets.show', $asset));

        return response($svg, 200, [
            'Content-Type' => 'image/svg+xml',
            'Content-Disposition' => 'inline; filename="asset-'.$asset->id.'.svg"',
        ]);
    }

    public function label(Asset $asset): InertiaResponse
    {
        return Inertia::render('assets/label', [
            'assets' => [$asset->only('id', 'name', 'asset_number', 'serial_number')],
        ]);
    }

    public function labels(Request $request): InertiaResponse
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'max:100'],
            'ids.*' => ['uuid'],
        ]);

        return Inertia::render('assets/label', [
            'assets' => Asset::whereIn('id', $data['ids'])
                ->orderBy('name')
                ->get(['id', 'name', 'asset_number', 'serial_number']),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function summary(Asset $asset): array
    {
        return [
            'id' => $asset->id,
            'name' => $asset->name,
            'asset_number' => $asset->asset_number,
            'category' => $asset->category,
            'serial_number' => $asset->serial_number,
            'status' => $asset->status->value,
            'location' => $asset->location?->only('id', 'name'),
            'supplier' => $asset->supplier?->only('id', 'name'),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function formOptions(): array
    {
        return [
            'suppliers' => Supplier::orderBy('name')->get(['id', 'name']),
            'locations' => Location::orderBy('name')->get(['id', 'name']),
            'statuses' => array_column(AssetStatus::cases(), 'value'),
        ];
    }
}
