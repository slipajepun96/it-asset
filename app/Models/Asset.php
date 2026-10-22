<?php

namespace App\Models;

use App\Enums\AssetStatus;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Asset extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name', 'asset_number', 'category', 'serial_number', 'supplier_id', 'location_id',
        'price', 'purchase_date', 'invoice_path', 'status',
    ];

    protected function casts(): array
    {
        return [
            'price' => 'decimal:2',
            'purchase_date' => 'date:Y-m-d',
            'status' => AssetStatus::class,
        ];
    }

    public function supplier(): BelongsTo
    {
        return $this->belongsTo(Supplier::class);
    }

    public function location(): BelongsTo
    {
        return $this->belongsTo(Location::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(AssetLog::class)->latest('logged_at')->latest('id');
    }
}
