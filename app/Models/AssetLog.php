<?php

namespace App\Models;

use App\Enums\LogType;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AssetLog extends Model
{
    use HasFactory;

    protected $fillable = ['asset_id', 'user_id', 'type', 'description', 'cost', 'location_id', 'logged_at'];

    protected function casts(): array
    {
        return [
            'type' => LogType::class,
            'cost' => 'decimal:2',
            'logged_at' => 'datetime',
        ];
    }

    public function asset(): BelongsTo
    {
        return $this->belongsTo(Asset::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(AssetLogAttachment::class);
    }
}
