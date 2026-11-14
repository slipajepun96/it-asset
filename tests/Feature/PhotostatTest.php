<?php

namespace Tests\Feature;

use App\Models\Asset;
use App\Models\PhotostatMachine;
use App\Models\PhotostatMeterReading;
use App\Models\PhotostatRecord;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PhotostatTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::factory()->admin()->create(['name' => 'Test Admin']);
    }

    private function machine(int $bw = 1000, int $color = 500, array $extra = []): PhotostatMachine
    {
        $this->actingAs($this->admin)->post(route('photostat.admin.machines.store'), [
            'name' => 'Canon', 'location' => 'Level 2', 'bw_counter' => $bw, 'color_counter' => $color, ...$extra,
        ])->assertSessionHasNoErrors();

        return PhotostatMachine::where('name', 'Canon')->firstOrFail();
    }

    private function record(PhotostatMachine $m, int $bw, int $color = 0, ?User $as = null): void
    {
        $this->actingAs($as ?? $this->admin)->post(route('photostat.records.store', $m), ['bw' => $bw, 'color' => $color])
            ->assertSessionHasNoErrors();
    }

    private function reading(PhotostatMachine $m, int $bw, int $color): PhotostatMeterReading
    {
        $this->actingAs($this->admin)->post(route('photostat.admin.readings.store', $m), ['bw_reading' => $bw, 'color_reading' => $color])
            ->assertSessionHasNoErrors();

        return PhotostatMeterReading::latest('id')->firstOrFail();
    }

    public function test_new_machine_gets_a_starting_reading()
    {
        $m = $this->machine();
        $start = $m->readings()->sole();
        $this->assertTrue($start->is_initial);
        $this->assertSame(1000, $start->bw_reading);
    }

    public function test_records_raise_the_count_and_keep_the_meter_before()
    {
        $m = $this->machine();
        $user = User::factory()->create(['name' => 'Aisyah']);
        $this->record($m, 30, 5, $user);
        $this->record($m, 20);

        $this->assertSame(1050, $m->refresh()->bw_counter);
        $this->assertSame(505, $m->color_counter);
        $first = PhotostatRecord::oldest('id')->first();
        $this->assertSame([1000, 500, 'Aisyah', 'app'], [$first->bw_before, $first->color_before, $first->user_name, $first->source]);
    }

    public function test_a_record_needs_some_pages()
    {
        $m = $this->machine();
        $this->actingAs($this->admin)->post(route('photostat.records.store', $m), ['bw' => 0, 'color' => 0])->assertSessionHasErrors('bw');
        $this->actingAs($this->admin)->post(route('photostat.records.store', $m), ['bw' => -3])->assertSessionHasErrors('bw');
    }

    public function test_editing_a_machine_never_changes_its_meters()
    {
        $m = $this->machine();
        $this->actingAs($this->admin)->put(route('photostat.admin.machines.update', $m), [
            'name' => 'Canon C3530', 'bw_counter' => 1, 'color_counter' => 1, 'active' => true,
        ])->assertSessionHasNoErrors();

        $m->refresh();
        $this->assertSame(['Canon C3530', 1000], [$m->name, $m->bw_counter]);
    }

    public function test_meter_reading_stores_the_difference_and_resets_the_count()
    {
        $m = $this->machine();
        $this->record($m, 50, 5);
        $r = $this->reading($m, 1080, 503);

        $this->assertSame([1050, 505], [$r->bw_expected, $r->color_expected]);
        $this->assertSame(30, $r->toListItem()['bw_diff']);
        $this->assertSame(-2, $r->toListItem()['color_diff']);
        $this->assertSame(1080, $m->refresh()->bw_counter);

        $this->record($m, 7);
        $this->assertSame(1087, $m->refresh()->bw_counter);
    }

    public function test_deleting_a_record_from_before_a_reading_moves_its_pages_into_that_reading()
    {
        $m = $this->machine();
        $this->record($m, 30);
        $wrong = PhotostatRecord::latest('id')->first();
        Carbon::setTestNow(now()->addSecond());
        $r = $this->reading($m, 1040, 500);
        Carbon::setTestNow();

        $this->actingAs($this->admin)->delete(route('photostat.admin.records.destroy', $wrong))->assertRedirect();

        $this->assertSame(1000, $r->refresh()->bw_expected); // now 40 pages not recorded
        $this->assertSame(1040, $m->refresh()->bw_counter);  // the count still follows the real meter
    }

    public function test_deleting_a_record_with_no_reading_after_it_lowers_the_count()
    {
        $m = $this->machine();
        $this->record($m, 30);
        $this->actingAs($this->admin)->delete(route('photostat.admin.records.destroy', PhotostatRecord::first()));
        $this->assertSame(1000, $m->refresh()->bw_counter);
    }

    public function test_only_the_latest_reading_can_be_undone_and_never_the_starting_one()
    {
        $m = $this->machine();
        $start = $m->readings()->sole();
        $first = $this->reading($m, 1100, 510);
        $second = $this->reading($m, 1200, 520);
        $this->record($m, 4);

        // Refused, shown as a message: the starting reading, and any reading that isn't the latest.
        $this->actingAs($this->admin)->delete(route('photostat.admin.readings.destroy', $start))->assertRedirect();
        $this->actingAs($this->admin)->delete(route('photostat.admin.readings.destroy', $first))->assertRedirect();
        $this->assertSame(3, $m->readings()->count());
        $this->actingAs($this->admin)->delete(route('photostat.admin.readings.destroy', $second))->assertRedirect();
        $this->assertSame(2, $m->readings()->count());

        // Back to what the app had counted at the second reading (1100), plus the 4 recorded since.
        $this->assertSame(1104, $m->refresh()->bw_counter);
    }

    public function test_qr_page_records_without_sign_in()
    {
        $m = $this->machine();
        $this->post(route('logout'));

        $this->get(route('photostat.qr.show', $m->qr_token))
            ->assertOk()
            ->assertInertia(fn ($page) => $page->component('public/photostat')
                ->where('machine.name', 'Canon')
                ->missing('machine.bw_counter')
                ->where('signedInAs', null));

        $this->post(route('photostat.qr.store', $m->qr_token), ['name' => '  Siti   Aminah ', 'bw' => 12, 'color' => 3])
            ->assertSessionHas('photostat_saved.user_name', 'Siti Aminah');

        $rec = PhotostatRecord::sole();
        $this->assertSame(['qr', null, 1012], [$rec->source, $rec->user_id, $m->refresh()->bw_counter]);
    }

    public function test_qr_page_checks_name_pages_and_token()
    {
        $m = $this->machine();
        $this->post(route('logout'));

        $this->post(route('photostat.qr.store', $m->qr_token), ['name' => 'x', 'bw' => 1])->assertSessionHasErrors('name');
        $this->post(route('photostat.qr.store', $m->qr_token), ['name' => 'Ali', 'bw' => 0])->assertSessionHasErrors('bw');
        $this->post(route('photostat.qr.store', str_repeat('0', 32)), ['name' => 'Ali', 'bw' => 1])->assertNotFound();
        $this->get(route('photostat.qr.show', 'not-a-token'))->assertInertia(fn ($page) => $page->where('machine', null));
        $this->assertSame(0, PhotostatRecord::count());
    }

    public function test_signed_in_people_scanning_are_recorded_as_themselves()
    {
        $m = $this->machine();
        $user = User::factory()->create(['name' => 'Real Name']);
        $this->actingAs($user)->post(route('photostat.qr.store', $m->qr_token), ['name' => 'Pretend', 'bw' => 2]);
        $this->assertSame(['Real Name', $user->id], [PhotostatRecord::sole()->user_name, PhotostatRecord::sole()->user_id]);
    }

    public function test_new_qr_code_and_hiding_a_machine_stop_old_links()
    {
        $m = $this->machine();
        $old = $m->qr_token;
        $this->actingAs($this->admin)->post(route('photostat.admin.machines.qr', $m));
        $this->assertNotSame($old, $m->refresh()->qr_token);

        $this->post(route('logout'));
        $this->post(route('photostat.qr.store', $old), ['name' => 'Ali', 'bw' => 1])->assertNotFound();

        $m->update(['active' => false]);
        $this->post(route('photostat.qr.store', $m->qr_token), ['name' => 'Ali', 'bw' => 1])->assertNotFound();
    }

    public function test_qr_records_are_rate_limited_per_device()
    {
        $m = $this->machine();
        $this->post(route('logout'));
        for ($i = 0; $i < 30; $i++) {
            $this->post(route('photostat.qr.store', $m->qr_token), ['name' => 'Ali', 'bw' => 1]);
        }
        $this->post(route('photostat.qr.store', $m->qr_token), ['name' => 'Ali', 'bw' => 1])->assertTooManyRequests();
    }

    public function test_normal_users_record_but_cannot_manage()
    {
        $m = $this->machine();
        $user = User::factory()->create();
        $this->record($m, 5, 0, $user);

        $this->actingAs($user)->get(route('photostat.admin.machines.index'))->assertForbidden();
        $this->actingAs($user)->post(route('photostat.admin.readings.store', $m), ['bw_reading' => 1, 'color_reading' => 1])->assertForbidden();
        $this->actingAs($user)->get(route('photostat.index'))
            ->assertInertia(fn ($page) => $page->component('photostat/machine')->where('machine.id', $m->id)->missing('machine.qr_token'));
    }

    public function test_machine_links_to_one_asset_and_shows_on_its_page()
    {
        $asset = Asset::create(['name' => 'Canon iR-ADV C3530', 'price' => 1]);
        $m = $this->machine(extra: ['asset_id' => $asset->id]);
        $this->record($m, 25, 2);

        $this->actingAs($this->admin)->get(route('assets.show', $asset))
            ->assertInertia(fn ($page) => $page->where('photostat.id', $m->id)->where('photostat.month_bw', 25));

    }

    public function test_only_one_machine_can_be_set_up()
    {
        $this->machine();
        $this->actingAs($this->admin)->post(route('photostat.admin.machines.store'), [
            'name' => 'Other', 'bw_counter' => 0, 'color_counter' => 0,
        ]);
        $this->assertSame(1, PhotostatMachine::count());
    }

    public function test_record_prints_shows_setup_notice_without_a_machine()
    {
        $this->actingAs(User::factory()->create())->get(route('photostat.index'))
            ->assertInertia(fn ($page) => $page->component('photostat/index'));
    }

    public function test_report_lists_the_months_records_and_checks()
    {
        $m = $this->machine();
        $this->record($m, 10);
        $this->reading($m, 1015, 500);

        $this->actingAs($this->admin)->get(route('photostat.admin.report', ['month' => now()->format('Y-m')]))
            ->assertInertia(fn ($page) => $page->component('photostat/admin/report')
                ->has('records', 1)
                ->has('checks', 1)
                ->where('checks.0.bw_diff', 5));

        $this->actingAs($this->admin)->get(route('photostat.admin.report', ['month' => now()->subYear()->format('Y-m')]))
            ->assertInertia(fn ($page) => $page->has('records', 0)->has('checks', 0));
    }

    public function test_my_records_shows_only_mine()
    {
        $m = $this->machine();
        $me = User::factory()->create();
        $this->record($m, 3, 0, $me);
        $this->record($m, 9);

        $this->actingAs($me)->get(route('photostat.mine'))
            ->assertInertia(fn ($page) => $page->has('records', 1)->where('records.0.bw', 3));
    }
}
