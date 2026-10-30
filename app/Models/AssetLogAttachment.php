<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AssetLogAttachment extends Model
{
    protected $fillable = ['path', 'name', 'size'];

    public function log(): BelongsTo
    {
        return $this->belongsTo(AssetLog::class, 'asset_log_id');
    }
}
