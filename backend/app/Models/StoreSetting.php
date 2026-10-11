<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreSetting extends Model
{
    protected $fillable = [
        'key',
        'value',
    ];

    public static function getValue(
        string $key,
        mixed $default = null
    ): mixed {
        $setting = static::query()
            ->where('key', $key)
            ->value('value');

        return $setting ?? $default;
    }

    public static function setValue(
        string $key,
        string|int|float|bool $value
    ): self {
        return static::query()->updateOrCreate(
            ['key' => $key],
            ['value' => (string) $value],
        );
    }
}
