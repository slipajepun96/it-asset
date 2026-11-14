<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Str;

/**
 * @property int $id
 * @property string $name
 * @property string $location
 * @property string|null $asset_id
 * @property int $bw_counter
 * @property int $color_counter
 * @property bool $active
 * @property string $qr_token
 */
class PhotostatMachine extends Model
{
    protected $fillable = ['name', 'location', 'asset_id', 'active'];

    protected $hidden = ['qr_token'];

    protected function casts(): array
    {
        return ['active' => 'boolean', 'bw_counter' => 'integer', 'color_counter' => 'integer'];
    }

    protected static function booted(): void
    {
        static::creating(function (self $machine) {
            $machine->qr_token ??= self::newQrToken();
        });
    }

    /** Random, so poster links can't be guessed. Replacing it makes old posters stop working. */
    public static function newQrToken(): string
    {
        return bin2hex(random_bytes(16));
    }

    /** @return BelongsTo<Asset, $this> */
    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    /** @return HasMany<PhotostatRecord, $this> */
    public function records(): HasMany
    {
        return $this->hasMany(PhotostatRecord::class, 'machine_id');
    }

    /** @return HasMany<PhotostatMeterReading, $this> */
    public function readings(): HasMany
    {
        return $this->hasMany(PhotostatMeterReading::class, 'machine_id');
    }

    public function qrUrl(): string
    {
        return route('photostat.qr.show', $this->qr_token);
    }

    public function slug(): string
    {
        return Str::slug($this->name);
    }
}
