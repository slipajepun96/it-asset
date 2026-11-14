<?php

namespace App\Services;

use App\Models\PhotostatMachine;
use App\Models\PhotostatMeterReading;
use App\Models\PhotostatRecord;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpException;

/**
 * The photostat counting rules. Each change locks the machine row, so two people saving at once both count.
 *
 * - A record adds its pages to the machine's counters.
 * - A meter reading stores the real meter next to the app's count (the difference is unrecorded pages),
 *   then the counters start again from the real meter.
 */
class PhotostatService
{
    /** A new machine starts from the meter the admin enters, kept as its starting reading. */
    public function createMachine(array $data, int $bw, int $color, User $by): PhotostatMachine
    {
        return DB::transaction(function () use ($data, $bw, $color, $by) {
            $machine = new PhotostatMachine($data);
            $machine->bw_counter = $bw;
            $machine->color_counter = $color;
            $machine->save();

            $machine->readings()->create([
                'bw_reading' => $bw,
                'color_reading' => $color,
                'bw_expected' => $bw,
                'color_expected' => $color,
                'note' => 'Starting reading',
                'is_initial' => true,
                'created_by' => $by->id,
                'created_by_name' => $by->name,
            ]);

            return $machine;
        });
    }

    /**
     * @param  array{bw: int, color: int, purpose: string}  $pages
     * @param  'app'|'qr'  $source
     */
    public function addRecord(int $machineId, array $pages, ?User $user, string $userName, string $source): PhotostatRecord
    {
        return DB::transaction(function () use ($machineId, $pages, $user, $userName, $source) {
            $machine = PhotostatMachine::whereKey($machineId)->lockForUpdate()->first();
            if (! $machine || ! $machine->active) {
                throw new HttpException(404, 'Machine not found.');
            }

            $record = $machine->records()->create([
                'user_id' => $user?->id,
                'user_name' => $userName,
                'bw' => $pages['bw'],
                'color' => $pages['color'],
                'bw_before' => $machine->bw_counter,
                'color_before' => $machine->color_counter,
                'purpose' => $pages['purpose'],
                'source' => $source,
            ]);

            $machine->forceFill([
                'bw_counter' => $machine->bw_counter + $pages['bw'],
                'color_counter' => $machine->color_counter + $pages['color'],
            ])->save();

            return $record->setRelation('machine', $machine);
        });
    }

    /** Removing a wrong record takes its pages back off the count, or, if a reading came after it, moves them into that reading's difference. */
    public function deleteRecord(PhotostatRecord $record): void
    {
        DB::transaction(function () use ($record) {
            $machine = PhotostatMachine::whereKey($record->machine_id)->lockForUpdate()->firstOrFail();
            $record->delete();

            $nextReading = $machine->readings()
                // With milliseconds: a plain datetime binding would drop them and mis-order things in the same second.
                ->where('created_at', '>', $record->created_at->format('Y-m-d H:i:s.v'))
                ->orderBy('created_at')->orderBy('id')
                ->first();

            if ($nextReading) {
                $nextReading->update([
                    'bw_expected' => max(0, $nextReading->bw_expected - $record->bw),
                    'color_expected' => max(0, $nextReading->color_expected - $record->color),
                ]);

                return;
            }

            $machine->forceFill([
                'bw_counter' => max(0, $machine->bw_counter - $record->bw),
                'color_counter' => max(0, $machine->color_counter - $record->color),
            ])->save();
        });
    }

    public function takeReading(PhotostatMachine $machine, int $bw, int $color, string $note, User $by): PhotostatMeterReading
    {
        return DB::transaction(function () use ($machine, $bw, $color, $note, $by) {
            $locked = PhotostatMachine::whereKey($machine->id)->lockForUpdate()->firstOrFail();

            $reading = $locked->readings()->create([
                'bw_reading' => $bw,
                'color_reading' => $color,
                'bw_expected' => $locked->bw_counter,
                'color_expected' => $locked->color_counter,
                'note' => $note,
                'created_by' => $by->id,
                'created_by_name' => $by->name,
            ]);

            $locked->forceFill(['bw_counter' => $bw, 'color_counter' => $color])->save();

            return $reading;
        });
    }

    /** Only a machine's latest reading can be undone: back to what the app had counted, plus anything recorded since. */
    public function undoReading(PhotostatMeterReading $reading): void
    {
        abort_if($reading->is_initial, 422, "A machine's starting reading can't be undone.");

        DB::transaction(function () use ($reading) {
            $machine = PhotostatMachine::whereKey($reading->machine_id)->lockForUpdate()->firstOrFail();
            abort_unless($this->latestReadingId($machine->id) === $reading->id, 409, 'Only the latest reading of a machine can be undone.');

            $reading->delete();
            $machine->forceFill([
                'bw_counter' => max(0, $machine->bw_counter - $reading->bw_reading + $reading->bw_expected),
                'color_counter' => max(0, $machine->color_counter - $reading->color_reading + $reading->color_expected),
            ])->save();
        });
    }

    public function latestReadingId(int $machineId): ?int
    {
        return PhotostatMeterReading::where('machine_id', $machineId)->max('id');
    }

    /** @return array<int, int> machine id => latest reading id */
    public function latestReadingIds(): array
    {
        return PhotostatMeterReading::query()
            ->select('machine_id', DB::raw('MAX(id) as id'))
            ->groupBy('machine_id')
            ->pluck('id', 'machine_id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }
}
