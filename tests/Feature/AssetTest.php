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

    public function test_problem_log_is_recorded(): void
    {
        $asset = Asset::create(['name' => 'Printer']);

        $this->actingAs(User::factory()->create())->post(route('assets.logs.store', $asset), [
            'type' => 'problem', 'description' => 'Paper jam', 'cost' => '10',
        ])->assertRedirect();

        $this->assertDatabaseHas('asset_logs', ['asset_id' => $asset->id, 'type' => 'problem']);
    }
}
