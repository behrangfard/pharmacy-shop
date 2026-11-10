<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Address;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * دفترچهٔ آدرس مشتری.
 *
 * کاربر می‌تواند هر تعداد آدرس دلخواه ثبت کند و هنگام تسویه حساب یکی از
 * آن‌ها را انتخاب کند. در هر لحظه یک آدرس می‌تواند پیش‌فرض باشد.
 */
class AddressController extends Controller
{
    /**
     * فهرست آدرس‌های کاربر جاری (پیش‌فرض اول، سپس جدیدترین‌ها).
     */
    public function index(Request $request): JsonResponse
    {
        $addresses = $request->user()
            ->addresses()
            ->orderByDesc('is_default')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'items' => $addresses
                    ->map(fn (Address $address) => $this->format($address))
                    ->values()
                    ->all(),
                'total' => $addresses->count(),
            ],
        ]);
    }

    /**
     * ثبت آدرس جدید. اولین آدرس کاربر به‌طور خودکار پیش‌فرض می‌شود.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $this->validateAddress($request);

        $user = $request->user();

        $isDefault = (bool) ($validated['is_default'] ?? false)
            || $user->addresses()->count() === 0;

        $address = $user->addresses()->create(
            $this->attributes($validated, $isDefault)
        );

        if ($isDefault) {
            $this->clearOtherDefaults($user->id, $address->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'آدرس جدید با موفقیت ذخیره شد.',
            'data' => $this->format($address->fresh()),
        ], 201);
    }

    /**
     * ویرایش آدرس موجود. آدرس کاربران دیگر قابل ویرایش نیست.
     */
    public function update(Request $request, int $address): JsonResponse
    {
        $model = $this->findAddress($request, $address);

        $validated = $this->validateAddress($request);

        $isDefault = (bool) ($validated['is_default'] ?? $model->is_default);

        $model->fill($this->attributes($validated, $isDefault))->save();

        if ($isDefault) {
            $this->clearOtherDefaults($model->user_id, $model->id);
        }

        return response()->json([
            'success' => true,
            'message' => 'آدرس با موفقیت به‌روزرسانی شد.',
            'data' => $this->format($model->fresh()),
        ]);
    }

    /**
     * حذف آدرس. اگر آدرس پیش‌فرض حذف شود، جدیدترین آدرس باقی‌مانده
     * پیش‌فرض می‌شود تا همیشه یک آدرس پیش‌فرض داشته باشیم.
     */
    public function destroy(Request $request, int $address): JsonResponse
    {
        $model = $this->findAddress($request, $address);

        $wasDefault = (bool) $model->is_default;

        $model->delete();

        if ($wasDefault) {
            $replacement = Address::query()
                ->where('user_id', $request->user()->id)
                ->orderByDesc('id')
                ->first();

            if ($replacement) {
                $replacement->forceFill(['is_default' => true])->save();
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'آدرس حذف شد.',
        ]);
    }

    /**
     * تعیین آدرس پیش‌فرض برای استفادهٔ خودکار در تسویه حساب.
     */
    public function setDefault(Request $request, int $address): JsonResponse
    {
        $model = $this->findAddress($request, $address);

        $model->forceFill(['is_default' => true])->save();

        $this->clearOtherDefaults($model->user_id, $model->id);

        return response()->json([
            'success' => true,
            'message' => 'آدرس پیش‌فرض تغییر کرد.',
            'data' => $this->format($model->fresh()),
        ]);
    }

    private function findAddress(Request $request, int $address): Address
    {
        return Address::query()
            ->where('user_id', $request->user()->id)
            ->whereKey($address)
            ->firstOrFail();
    }

    /**
     * @return array<string, mixed>
     */
    private function validateAddress(Request $request): array
    {
        return $request->validate([
            'title' => ['nullable', 'string', 'max:60'],
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:30'],
            'province' => ['required', 'string', 'max:100'],
            'city' => ['required', 'string', 'max:100'],
            'address' => ['required', 'string', 'max:1000'],
            'postal_code' => ['nullable', 'string', 'max:10'],
            'latitude' => ['nullable', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'numeric', 'between:-180,180'],
            'is_default' => ['sometimes', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    private function attributes(array $validated, bool $isDefault): array
    {
        return [
            'title' => $this->nullableString($validated['title'] ?? null),
            'recipient_name' => trim((string) $validated['recipient_name']),
            'phone' => $this->digits((string) $validated['phone']),
            'province' => trim((string) $validated['province']),
            'city' => trim((string) $validated['city']),
            'address' => trim((string) $validated['address']),
            'postal_code' => $this->nullableString(
                $this->digits((string) ($validated['postal_code'] ?? ''))
            ),
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'is_default' => $isDefault,
        ];
    }

    private function clearOtherDefaults(int $userId, int $addressId): void
    {
        Address::query()
            ->where('user_id', $userId)
            ->whereKeyNot($addressId)
            ->where('is_default', true)
            ->update(['is_default' => false]);
    }

    /**
     * ارقام فارسی/عربی را به لاتین تبدیل می‌کند تا کد پستی و موبایل یکدست
     * ذخیره شوند.
     */
    private function digits(string $value): string
    {
        return strtr(trim($value), [
            '۰' => '0', '۱' => '1', '۲' => '2', '۳' => '3', '۴' => '4',
            '۵' => '5', '۶' => '6', '۷' => '7', '۸' => '8', '۹' => '9',
            '٠' => '0', '١' => '1', '٢' => '2', '٣' => '3', '٤' => '4',
            '٥' => '5', '٦' => '6', '٧' => '7', '٨' => '8', '٩' => '9',
        ]);
    }

    private function nullableString(mixed $value): ?string
    {
        $value = trim((string) $value);

        return $value === '' ? null : $value;
    }

    /**
     * @return array<string, mixed>
     */
    private function format(Address $address): array
    {
        return [
            'id' => $address->id,
            'title' => $address->title,
            'recipient_name' => $address->recipient_name,
            'phone' => $address->phone,
            'province' => $address->province,
            'city' => $address->city,
            'address' => $address->address,
            'postal_code' => $address->postal_code,
            'latitude' => $address->latitude,
            'longitude' => $address->longitude,
            'is_default' => (bool) $address->is_default,
            'full_address' => $address->fullAddress(),
            'created_at' => $address->created_at,
            'updated_at' => $address->updated_at,
        ];
    }
}
