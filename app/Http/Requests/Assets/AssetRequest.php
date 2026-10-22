<?php

namespace App\Http\Requests\Assets;

use App\Enums\AssetStatus;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'asset_number' => ['nullable', 'string', 'max:255', Rule::unique('assets', 'asset_number')->ignore($this->route('asset'))],
            'category' => ['nullable', 'string', 'max:100'],
            'serial_number' => ['nullable', 'string', 'max:255'],
            'supplier_id' => ['nullable', 'exists:suppliers,id'],
            'location_id' => ['nullable', 'exists:locations,id'],
            'price' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'purchase_date' => ['nullable', 'date'],
            'status' => ['sometimes', Rule::enum(AssetStatus::class)],
            'invoice' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png', 'max:10240'],
        ];
    }
}
