<?php

namespace App\Http\Controllers;

use App\Enums\LogType;
use App\Http\Requests\Assets\AssetLogRequest;
use App\Models\Asset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;

class AssetLogController extends Controller
{
    public function store(AssetLogRequest $request, Asset $asset): RedirectResponse
    {
        $data = $request->validated();
        $data['logged_at'] ??= now();
        $data['user_id'] = $request->user()->id;

        DB::transaction(function () use ($asset, $data) {
            $asset->logs()->create($data);

            if ($data['type'] === LogType::Relocation->value) {
                $asset->update(['location_id' => $data['location_id']]);
            }
        });

        return back();
    }
}
