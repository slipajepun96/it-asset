<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $machine_id
 * @property int|null $user_id
 * @property string $user_name
 * @property int $bw
 * @property int $color
 * @property int $bw_before
 * @property int $color_before
 * @property string $purpose
 * @property string $source
 * @property Carbon $created_at
 */
class PhotostatRecord extends Model
{
    public const UPDATED_AT = null;

    protected $dateFormat = 'Y-m-d H:i:s.v';

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }

    /** @return BelongsTo<PhotostatMachine, $this> */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(PhotostatMachine::class, 'machine_id');
    }

    /** @return array<string, mixed> */
    public function toListItem(): array
    {
        return [
            'id' => $this->id,
            'machine_id' => $this->machine_id,
            'machine_name' => $this->machine?->name,
            'user_id' => $this->user_id,
            'user_name' => $this->user_name,
            'bw' => $this->bw,
            'color' => $this->color,
            'bw_before' => $this->bw_before,
            'color_before' => $this->color_before,
            'purpose' => $this->purpose,
            'source' => $this->source,
            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
