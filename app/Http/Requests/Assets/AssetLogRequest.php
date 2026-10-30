<?php

namespace App\Http\Requests\Assets;

use App\Enums\LogType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class AssetLogRequest extends FormRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(LogType::class)],
            'description' => ['required', 'string', 'max:5000'],
            'cost' => ['nullable', 'numeric', 'min:0', 'max:9999999999'],
            'location_id' => [
                Rule::requiredIf(fn () => $this->input('type') === LogType::Relocation->value),
                'nullable',
                'exists:locations,id',
            ],
            'logged_at' => ['nullable', 'date'],
            'attachments' => ['nullable', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:pdf,jpg,jpeg,png,doc,docx,xls,xlsx', 'max:10240'],
        ];
    }
}
