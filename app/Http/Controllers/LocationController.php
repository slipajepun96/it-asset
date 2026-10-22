<?php

namespace App\Http\Controllers;

use App\Enums\LocationType;
use App\Models\Location;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;

class LocationController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('locations/index', [
            'locations' => Location::withCount('assets')->orderBy('name')->get(),
            'types' => array_column(LocationType::cases(), 'value'),
        ]);
    }

    public function store(Request $request): RedirectResponse
    {
        Location::create($request->validate([
            'name' => ['required', 'string', 'max:255'],
            'type' => ['required', Rule::enum(LocationType::class)],
            'address' => ['nullable', 'string', 'max:1000'],
        ]));

        return back();
    }

    public function destroy(Location $location): RedirectResponse
    {
        $location->delete();

        return back();
    }
}
