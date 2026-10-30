<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\Location;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AssetTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_cannot_view_assets(): void
    {
        $this->get(route('assets.index'))->assertRedirect(route('login'));
    }

    public function test_asset_is_created_with_uuid_and_invoice(): void
    {
        Storage::fake();
        $supplier = Supplier::create(['name' => 'Acme']);

        $this->actingAs(User::factory()->create())->post(route('assets.store'), [
            'name' => 'Dell Latitude',
            'serial_number' => 'SN123',
            'price' => '2500.50',
            'supplier_id' => $supplier->id,
            'invoice' => UploadedFile::fake()->create('inv.pdf', 100, 'application/pdf'),
        ])->assertRedirect();

        $asset = Asset::firstOrFail();
        $this->assertTrue(\Illuminate\Support\Str::isUuid($asset->id));
        Storage::assertExists($asset->invoice_path);

        $this->get(route('assets.invoice', $asset))->assertOk();
        $this->get(route('assets.show', $asset))->assertOk();
        $this->get(route('assets.qr', $asset))->assertOk()->assertHeader('Content-Type', 'image/svg+xml');
    }

    public function test_qr_code_links_to_public_page_and_edit_requires_login(): void
    {
        $asset = Asset::create(['name' => 'Router']);

        $this->get(route('assets.public', $asset))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/asset')->where('asset.name', 'Router'));

        $this->get(route('assets.edit', $asset))->assertRedirect(route('login'));
    }

    public function test_asset_details_can_be_edited_and_invoice_replaced(): void
    {
        Storage::fake();
        $old = UploadedFile::fake()->create('old.pdf', 10, 'application/pdf')->store('invoices');
        $asset = Asset::create(['name' => 'Router', 'asset_number' => 'IT-001', 'invoice_path' => $old]);
        $supplier = Supplier::create(['name' => 'Acme']);
        $user = User::factory()->create();

        $this->actingAs($user)->get(route('assets.edit', $asset))->assertOk();

        // The form submits as POST with _method=PUT so file uploads work.
        $this->actingAs($user)->post(route('assets.update', [$asset, '_method' => 'PUT']), [
            'name' => 'Core Router',
            'asset_number' => 'IT-001',
            'category' => 'Network',
            'serial_number' => 'SN999',
            'supplier_id' => $supplier->id,
            'price' => '1200',
            'purchase_date' => '2026-01-15',
            'status' => 'in_repair',
            'invoice' => UploadedFile::fake()->create('new.pdf', 10, 'application/pdf'),
        ])->assertRedirect(route('assets.show', $asset));

        $asset->refresh();
        $this->assertSame('Core Router', $asset->name);
        $this->assertSame('Network', $asset->category);
        $this->assertSame('SN999', $asset->serial_number);
        $this->assertSame($supplier->id, $asset->supplier_id);
        $this->assertSame('2026-01-15', $asset->purchase_date->toDateString());
        Storage::assertMissing($old);
        Storage::assertExists($asset->invoice_path);
    }

    public function test_relocation_log_updates_location(): void
    {
        $asset = Asset::create(['name' => 'Router']);
        $estate = Location::create(['name' => 'Estate A', 'type' => 'estate']);
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('assets.logs.store', $asset), [
            'type' => 'relocation', 'description' => 'Moved to estate',
        ])->assertSessionHasErrors('location_id');

        $this->actingAs($user)->post(route('assets.logs.store', $asset), [
            'type' => 'relocation', 'description' => 'Moved to estate', 'location_id' => $estate->id,
        ])->assertRedirect();

        $this->assertSame($estate->id, $asset->fresh()->location_id);
        $this->assertCount(1, $asset->logs);
    }

    public function test_history_entry_accepts_attachments(): void
    {
        Storage::fake();
        $asset = Asset::create(['name' => 'Laptop']);
        $user = User::factory()->create();

        $this->actingAs($user)->post(route('assets.logs.store', $asset), [
            'type' => 'maintenance',
            'description' => 'Replaced keyboard',
            'attachments' => [
                UploadedFile::fake()->create('service-report.pdf', 50, 'application/pdf'),
                UploadedFile::fake()->image('repair-invoice.jpg'),
            ],
        ])->assertRedirect();

        $attachments = $asset->logs()->firstOrFail()->attachments;
        $this->assertSame(['service-report.pdf', 'repair-invoice.jpg'], $attachments->pluck('name')->all());
        Storage::assertExists($attachments[0]->path);

        $this->get(route('assets.show', $asset))
            ->assertInertia(fn ($page) => $page->where('logs.0.attachments.0.name', 'service-report.pdf'));
        $this->get(route('attachments.show', $attachments[0]))->assertOk();

        auth()->logout();
        $this->get(route('attachments.show', $attachments[0]))->assertRedirect(route('login'));

        $this->actingAs($user)->post(route('assets.logs.store', $asset), [
            'type' => 'maintenance',
            'description' => 'Bad file',
            'attachments' => [UploadedFile::fake()->create('virus.exe', 10)],
        ])->assertSessionHasErrors('attachments.0');

        $this->delete(route('assets.destroy', $asset));
        Storage::assertMissing($attachments[0]->path);
    }

    public function test_problem_log_is_recorded(): void
    {
        $asset = Asset::create(['name' => 'Printer']);

        $this->actingAs(User::factory()->create())->post(route('assets.logs.store', $asset), [
            'type' => 'problem', 'description' => 'Paper jam', 'cost' => '10',
        ])->assertRedirect();

        $this->assertDatabaseHas('asset_logs', ['asset_id' => $asset->id, 'type' => 'problem']);
    }
}
