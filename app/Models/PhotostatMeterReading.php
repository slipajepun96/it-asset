<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $machine_id
 * @property int $bw_reading
 * @property int $color_reading
 * @property int $bw_expected
 * @property int $color_expected
 * @property string $note
 * @property bool $is_initial
 * @property int|null $created_by
 * @property string $created_by_name
 * @property Carbon $created_at
 */
class PhotostatMeterReading extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime', 'is_initial' => 'boolean'];
    }

    /** @return BelongsTo<PhotostatMachine, $this> */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(PhotostatMachine::class, 'machine_id');
    }

    /** @return array<string, mixed> */
    public function toListItem(?int $latestId = null): array
    {
        return [
            'id' => $this->id,
            'machine_id' => $this->machine_id,
            'machine_name' => $this->machine?->name,
            'bw_reading' => $this->bw_reading,
            'color_reading' => $this->color_reading,
            'bw_expected' => $this->bw_expected,
            'color_expected' => $this->color_expected,
            'bw_diff' => $this->bw_reading - $this->bw_expected,
            'color_diff' => $this->color_reading - $this->color_expected,
            'note' => $this->note,
            'initial' => $this->is_initial,
            'created_by_name' => $this->created_by_name,
            'created_at' => $this->created_at->toIso8601String(),
            'latest' => $latestId === $this->id,
        ];
    }
}
