<?php

namespace App\Http\Controllers;

use App\Enums\LogType;
use App\Http\Requests\Assets\AssetLogRequest;
use App\Models\Asset;
use App\Models\AssetLogAttachment;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AssetLogController extends Controller
{
    public function store(AssetLogRequest $request, Asset $asset): RedirectResponse
    {
        $data = $request->safe()->except('attachments');
        $data['logged_at'] ??= now();
        $data['user_id'] = $request->user()->id;

        $files = collect($request->file('attachments', []))->map(fn ($file) => [
            'path' => $file->store('log-attachments'),
            'name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
        ]);

        DB::transaction(function () use ($asset, $data, $files) {
            $asset->logs()->create($data)->attachments()->createMany($files);

            if ($data['type'] === LogType::Relocation->value) {
                $asset->update(['location_id' => $data['location_id']]);
            }
        });

        return back();
    }

    public function attachment(AssetLogAttachment $attachment): StreamedResponse
    {
        abort_unless(Storage::exists($attachment->path), 404);

        return Storage::response($attachment->path, $attachment->name);
    }
}
