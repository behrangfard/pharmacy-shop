<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\Shipment;
use App\Models\ShipmentEvent;
use App\Models\ShippingMethod;
use App\Models\ShippingRule;
use App\Models\ShippingZone;
use App\Services\Messaging\MessagingManager;
use App\Services\Shipping\ShippingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * بخش «ارسال و حمل‌ونقل» پنل مدیریت.
 *
 * شامل داشبورد ارسال، مدیریت مرسوله‌ها، روش‌های ارسال، مناطق تحت پوشش،
 * تعرفه و هزینهٔ ارسال و تاریخچهٔ ارسال‌ها.
 */
class AdminShippingController extends Controller
{
    public function __construct(private readonly ShippingService $shipping)
    {
    }

    /**
     * داشبورد ارسال: آمار، آخرین مرسوله‌ها و سفارش‌های در انتظار ارسال.
     */
    public function overview(): JsonResponse
    {
        return response()->json([
            'success' => true,
            'data' => $this->shipping->overview(),
        ]);
    }

    /**
     * فهرست مرسوله‌ها با فیلتر وضعیت، جست‌وجو، روش ارسال و بازهٔ تاریخ.
     */
    public function shipments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', 'max:40'],
            'method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $status = $validated['status'] ?? null;

        $query = Shipment::query()->with([
            'order:id,order_number,total,status,payment_status,created_at',
            'method:id,name,carrier',
        ]);

        if ($status === 'open') {
            $query->whereIn('status', Shipment::OPEN_STATUSES);
        } elseif ($status === 'delayed') {
            $query->whereIn('status', Shipment::OPEN_STATUSES)
                ->whereNotNull('expected_delivery_at')
                ->where('expected_delivery_at', '<', now());
        } elseif ($status !== null && $status !== '' && in_array($status, Shipment::STATUSES, true)) {
            $query->where('status', $status);
        }

        if (! empty($validated['method_id'])) {
            $query->where('shipping_method_id', $validated['method_id']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('created_at', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('created_at', '<=', $validated['to']);
        }

        if (isset($validated['search']) && trim($validated['search']) !== '') {
            $search = trim($validated['search']);

            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('shipment_number', 'like', "%{$search}%")
                    ->orWhere('tracking_code', 'like', "%{$search}%")
                    ->orWhere('recipient_name', 'like', "%{$search}%")
                    ->orWhere('phone', 'like', "%{$search}%")
                    ->orWhereHas('order', function ($orderQuery) use ($search) {
                        $orderQuery->where('order_number', 'like', "%{$search}%");
                    });
            });
        }

        $shipments = $query
            ->orderByDesc('id')
            ->limit($validated['limit'] ?? 200)
            ->get()
            ->map(fn (Shipment $shipment) => $this->presentShipment($shipment));

        return response()->json([
            'success' => true,
            'data' => $shipments,
            'meta' => [
                'total' => $shipments->count(),
                'statuses' => collect(Shipment::statusMeta())
                    ->map(fn (array $meta, string $key) => [
                        'value' => $key,
                        'label' => $meta['label'],
                        'tone' => $meta['tone'],
                    ])
                    ->values(),
            ],
        ]);
    }

    /**
     * جزئیات یک مرسوله همراه تاریخچه و اطلاعات سفارش.
     */
    public function showShipment(Shipment $shipment): JsonResponse
    {
        $shipment->load([
            'order.items',
            'method',
            'events.creator:id,name,email',
        ]);

        return response()->json([
            'success' => true,
            'data' => $this->presentShipment($shipment, true),
        ]);
    }

    /**
     * دادهٔ نمایشی مرسوله برای پنل (برچسب وضعیت، تأخیر، وزن مؤثر و ...).
     *
     * @return array<string, mixed>
     */
    private function presentShipment(Shipment $shipment, bool $withEvents = false): array
    {
        $meta = Shipment::statusMeta()[$shipment->status] ?? [
            'label' => $shipment->status,
            'tone' => 'gray',
        ];

        $data = $shipment->toArray();

        $data['status_label'] = $meta['label'];
        $data['status_tone'] = $meta['tone'];
        $data['is_delayed'] = $shipment->isDelayed();
        $data['effective_weight_grams'] = $shipment->effectiveWeightGrams();
        $data['method_name'] = $shipment->method?->name;
        $data['order_number'] = $shipment->order?->order_number;
        $data['statuses'] = Shipment::statusMeta();

        if ($withEvents) {
            $data['events'] = $shipment->events
                ->map(fn (ShipmentEvent $event) => [
                    'id' => $event->id,
                    'status' => $event->status,
                    'status_label' => $event->statusLabel(),
                    'note' => $event->note,
                    'happened_at' => $event->happened_at?->toIso8601String(),
                    'creator' => $event->creator?->name,
                ])
                ->values()
                ->all();
        }

        return $data;
    }

    /**
     * ثبت مرسولهٔ جدید برای یک سفارش.
     */
    public function storeShipment(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'order_id' => ['required', 'integer', 'exists:orders,id'],
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'status' => ['nullable', Rule::in(Shipment::STATUSES)],
            'carrier' => ['nullable', 'string', 'max:100'],
            'recipient_name' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'province' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:2000'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'tracking_code' => ['nullable', 'string', 'max:80'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'volumetric_weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'package_count' => ['nullable', 'integer', 'min:1', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'delay_reason' => ['nullable', 'string', 'max:255'],
            'expected_delivery_at' => ['nullable', 'date'],
            'note' => ['nullable', 'string', 'max:255'],
        ]);

        $order = Order::query()->find($validated['order_id']);

        if ($order === null) {
            return response()->json([
                'success' => false,
                'message' => 'سفارش موردنظر پیدا نشد.',
            ], 404);
        }

        if (in_array($order->status, ['cancelled', 'canceled'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'برای سفارش لغوشده امکان ثبت مرسوله وجود ندارد.',
            ], 422);
        }

        $shipment = $this->shipping->createShipment(
            $order,
            $validated,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => "مرسولهٔ {$shipment->shipment_number} ثبت شد.",
            'data' => $this->presentShipment($shipment, true),
        ], 201);
    }

    /**
     * ویرایش اطلاعات مرسوله (بدون تغییر وضعیت).
     */
    public function updateShipment(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'carrier' => ['nullable', 'string', 'max:100'],
            'recipient_name' => ['nullable', 'string', 'max:150'],
            'phone' => ['nullable', 'string', 'max:30'],
            'province' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'address' => ['nullable', 'string', 'max:2000'],
            'postal_code' => ['nullable', 'string', 'max:20'],
            'tracking_code' => ['nullable', 'string', 'max:80'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'volumetric_weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'package_count' => ['nullable', 'integer', 'min:1', 'max:100'],
            'notes' => ['nullable', 'string', 'max:2000'],
            'delay_reason' => ['nullable', 'string', 'max:255'],
            'return_reason' => ['nullable', 'string', 'max:255'],
            'expected_delivery_at' => ['nullable', 'date'],
        ]);

        $updated = $this->shipping->updateShipment(
            $shipment,
            $validated,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => 'اطلاعات مرسوله به‌روزرسانی شد.',
            'data' => $this->presentShipment($updated, true),
        ]);
    }

    /**
     * تغییر وضعیت مرسوله (با امکان ثبت کد رهگیری و علت تأخیر/برگشت).
     */
    public function updateShipmentStatus(Request $request, Shipment $shipment): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['required', Rule::in(Shipment::STATUSES)],
            'note' => ['nullable', 'string', 'max:255'],
            'tracking_code' => ['nullable', 'string', 'max:80'],
            'delay_reason' => [
                'nullable',
                'string',
                'max:255',
                'required_if:status,' . Shipment::STATUS_DELIVERY_FAILED,
            ],
            'return_reason' => [
                'nullable',
                'string',
                'max:255',
                'required_if:status,' . Shipment::STATUS_RETURNED,
            ],
        ]);

        $updated = $this->shipping->changeStatus(
            $shipment,
            $validated['status'],
            $validated,
            $request->user()?->id
        );

        return response()->json([
            'success' => true,
            'message' => "وضعیت مرسوله به «{$updated->statusLabel()}» تغییر کرد.",
            'data' => $this->presentShipment($updated, true),
        ]);
    }

    /**
     * حذف مرسوله (برای اصلاح اشتباه ثبت).
     */
    public function destroyShipment(Shipment $shipment): JsonResponse
    {
        $number = $shipment->shipment_number;
        $shipment->delete();

        return response()->json([
            'success' => true,
            'message' => "مرسولهٔ {$number} حذف شد.",
        ]);
    }

    /**
     * ارسال پیامک کد رهگیری به مشتری.
     */
    public function notifyShipment(
        Request $request,
        Shipment $shipment,
        MessagingManager $messaging
    ): JsonResponse {
        $validated = $request->validate([
            'channel' => ['nullable', 'string', 'in:sms,whatsapp,telegram,bale'],
            'message' => ['nullable', 'string', 'max:600'],
        ]);

        $channel = $validated['channel'] ?? 'sms';

        if (! $messaging->isAvailable($channel)) {
            return response()->json([
                'success' => false,
                'message' => 'کانال پیام‌رسانی انتخاب‌شده فعال یا تنظیم نشده است. '
                    . 'تنظیمات پیامک را در بخش «پیام‌رسانی» بررسی کنید.',
            ], 422);
        }

        $recipient = in_array($channel, ['sms', 'whatsapp'], true)
            ? (string) $shipment->phone
            : (string) ($messaging->defaultRecipient($channel) ?? '');

        if (trim($recipient) === '') {
            return response()->json([
                'success' => false,
                'message' => 'شمارهٔ گیرنده برای ارسال پیام ثبت نشده است.',
            ], 422);
        }

        $body = trim((string) ($validated['message'] ?? ''))
            ?: $this->shipping->trackingMessage($shipment);

        $message = $messaging->send(
            $channel,
            $recipient,
            $body,
            [],
            $request->user()?->id
        );

        if ($message->status !== 'sent') {
            return response()->json([
                'success' => false,
                'message' => $message->error ?: 'ارسال پیام ناموفق بود.',
                'data' => ['outbound_message_id' => $message->id],
            ], 422);
        }

        return response()->json([
            'success' => true,
            'message' => 'کد رهگیری برای مشتری ارسال شد.',
            'data' => [
                'outbound_message_id' => $message->id,
                'recipient' => $message->recipient,
            ],
        ]);
    }

    /**
     * پیش‌نمایش هزینهٔ ارسال بر اساس روش، مقصد، وزن و مبلغ سفارش.
     */
    public function quote(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'province' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'weight_grams' => ['nullable', 'integer', 'min:0', 'max:1000000'],
            'subtotal' => ['nullable', 'numeric', 'min:0'],
        ]);

        $method = ! empty($validated['shipping_method_id'])
            ? ShippingMethod::query()->find($validated['shipping_method_id'])
            : null;

        return response()->json([
            'success' => true,
            'data' => $this->shipping->quote(
                $method,
                $validated['province'] ?? null,
                $validated['city'] ?? null,
                (int) ($validated['weight_grams'] ?? 0),
                (float) ($validated['subtotal'] ?? 0)
            ),
        ]);
    }

    /**
     * فهرست روش‌های ارسال به‌همراه آمار مرسوله‌ها.
     */
    public function methods(): JsonResponse
    {
        $methods = ShippingMethod::query()
            ->withCount('shipments')
            ->orderBy('sort_order')
            ->orderBy('id')
            ->get()
            ->map(fn (ShippingMethod $method) => array_merge(
                $method->toArray(),
                [
                    'delivery_estimate' => $method->deliveryEstimate(),
                    'coverage' => $method->coverage(),
                ]
            ));

        return response()->json([
            'success' => true,
            'data' => $methods,
        ]);
    }

    /**
     * تعریف روش ارسال جدید.
     */
    public function storeMethod(Request $request): JsonResponse
    {
        $validated = $request->validate($this->methodRules());

        $validated['code'] = $validated['code']
            ?? $this->uniqueMethodCode();

        $method = ShippingMethod::query()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'روش ارسال جدید ثبت شد.',
            'data' => $method,
        ], 201);
    }

    /**
     * ویرایش روش ارسال.
     */
    public function updateMethod(Request $request, ShippingMethod $method): JsonResponse
    {
        $validated = $request->validate(
            $this->methodRules($method->id)
        );

        $method->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'روش ارسال به‌روزرسانی شد.',
            'data' => $method->fresh(),
        ]);
    }

    /**
     * فعال/غیرفعال کردن روش ارسال.
     */
    public function updateMethodStatus(Request $request, ShippingMethod $method): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $method->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'روش ارسال فعال شد.'
                : 'روش ارسال غیرفعال شد.',
            'data' => $method->fresh(),
        ]);
    }

    /**
     * حذف روش ارسال (اگر مرسولهٔ وابسته داشته باشد، فقط غیرفعال می‌شود).
     */
    public function destroyMethod(ShippingMethod $method): JsonResponse
    {
        if ($method->shipments()->exists()) {
            return response()->json([
                'success' => false,
                'message' => 'این روش در مرسوله‌های ثبت‌شده استفاده شده است؛ '
                    . 'به‌جای حذف، آن را غیرفعال کنید.',
            ], 422);
        }

        $method->delete();

        return response()->json([
            'success' => true,
            'message' => 'روش ارسال حذف شد.',
        ]);
    }

    /**
     * قواعد اعتبارسنجی روش ارسال.
     *
     * @return array<string, mixed>
     */
    private function methodRules(?int $ignoreId = null): array
    {
        return [
            'name' => ['required', 'string', 'max:100'],
            'code' => [
                'nullable',
                'string',
                'max:60',
                'regex:/^[a-zA-Z0-9_\-]+$/',
                Rule::unique('shipping_methods', 'code')->ignore($ignoreId),
            ],
            'carrier' => ['nullable', 'string', 'max:100'],
            'description' => ['nullable', 'string', 'max:255'],
            'base_cost' => ['nullable', 'numeric', 'min:0'],
            'cost_per_kg' => ['nullable', 'numeric', 'min:0'],
            'min_weight_grams' => ['nullable', 'integer', 'min:0'],
            'max_weight_grams' => ['nullable', 'integer', 'min:0'],
            'min_days' => ['nullable', 'integer', 'min:0', 'max:60'],
            'max_days' => ['nullable', 'integer', 'min:0', 'max:60'],
            'free_over_amount' => ['nullable', 'numeric', 'min:0'],
            'is_express' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'sort_order' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'zone_ids' => ['nullable', 'array'],
            'zone_ids.*' => ['integer', 'exists:shipping_zones,id'],
        ];
    }

    private function uniqueMethodCode(): string
    {
        do {
            $code = 'method_' . strtolower(\Illuminate\Support\Str::random(8));
        } while (ShippingMethod::query()->where('code', $code)->exists());

        return $code;
    }

    /**
     * فهرست مناطق ارسال.
     */
    public function zones(): JsonResponse
    {
        $zones = ShippingZone::query()
            ->orderBy('province')
            ->orderBy('city')
            ->orderBy('area')
            ->orderBy('id')
            ->get();

        return response()->json([
            'success' => true,
            'data' => $zones,
            'meta' => [
                'provinces' => $zones->pluck('province')->unique()->values()->all(),
            ],
        ]);
    }

    /**
     * تعریف منطقهٔ ارسال جدید.
     */
    public function storeZone(Request $request): JsonResponse
    {
        $validated = $request->validate($this->zoneRules());

        $zone = ShippingZone::query()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'منطقهٔ ارسال جدید ثبت شد.',
            'data' => $zone,
        ], 201);
    }

    /**
     * ویرایش منطقهٔ ارسال.
     */
    public function updateZone(Request $request, ShippingZone $zone): JsonResponse
    {
        $validated = $request->validate($this->zoneRules());

        $zone->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'منطقهٔ ارسال به‌روزرسانی شد.',
            'data' => $zone->fresh(),
        ]);
    }

    /**
     * فعال/غیرفعال کردن منطقهٔ ارسال.
     */
    public function updateZoneStatus(Request $request, ShippingZone $zone): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $zone->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'منطقهٔ ارسال فعال شد.'
                : 'منطقهٔ ارسال غیرفعال شد.',
            'data' => $zone->fresh(),
        ]);
    }

    /**
     * حذف منطقهٔ ارسال.
     */
    public function destroyZone(ShippingZone $zone): JsonResponse
    {
        $zone->delete();

        return response()->json([
            'success' => true,
            'message' => 'منطقهٔ ارسال حذف شد.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function zoneRules(): array
    {
        return [
            'province' => ['required', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'area' => ['nullable', 'string', 'max:120'],
            'cost' => ['nullable', 'numeric', 'min:0'],
            'is_express_available' => ['nullable', 'boolean'],
            'is_active' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * فهرست قوانین تعرفهٔ ارسال.
     */
    public function rules(): JsonResponse
    {
        $rules = ShippingRule::query()
            ->with('method:id,name')
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get()
            ->map(fn (ShippingRule $rule) => array_merge(
                $rule->toArray(),
                ['type_label' => $rule->typeLabel()]
            ));

        return response()->json([
            'success' => true,
            'data' => $rules,
            'meta' => [
                'types' => collect(ShippingRule::labels())
                    ->map(fn (string $label, string $value) => [
                        'value' => $value,
                        'label' => $label,
                    ])
                    ->values(),
            ],
        ]);
    }

    /**
     * تعریف قانون تعرفهٔ جدید.
     */
    public function storeRule(Request $request): JsonResponse
    {
        $validated = $request->validate($this->ruleRules());

        $rule = ShippingRule::query()->create($validated);

        return response()->json([
            'success' => true,
            'message' => 'قانون تعرفهٔ ارسال ثبت شد.',
            'data' => $rule->load('method:id,name'),
        ], 201);
    }

    /**
     * ویرایش قانون تعرفه.
     */
    public function updateRule(Request $request, ShippingRule $rule): JsonResponse
    {
        $validated = $request->validate($this->ruleRules());

        $rule->update($validated);

        return response()->json([
            'success' => true,
            'message' => 'قانون تعرفه به‌روزرسانی شد.',
            'data' => $rule->fresh()->load('method:id,name'),
        ]);
    }

    /**
     * فعال/غیرفعال کردن قانون تعرفه.
     */
    public function updateRuleStatus(Request $request, ShippingRule $rule): JsonResponse
    {
        $validated = $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $rule->update(['is_active' => $validated['is_active']]);

        return response()->json([
            'success' => true,
            'message' => $validated['is_active']
                ? 'قانون تعرفه فعال شد.'
                : 'قانون تعرفه غیرفعال شد.',
            'data' => $rule->fresh()->load('method:id,name'),
        ]);
    }

    /**
     * حذف قانون تعرفه.
     */
    public function destroyRule(ShippingRule $rule): JsonResponse
    {
        $rule->delete();

        return response()->json([
            'success' => true,
            'message' => 'قانون تعرفه حذف شد.',
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function ruleRules(): array
    {
        return [
            'title' => ['required', 'string', 'max:150'],
            'type' => ['required', Rule::in(ShippingRule::TYPES)],
            'shipping_method_id' => ['nullable', 'integer', 'exists:shipping_methods,id'],
            'province' => ['nullable', 'string', 'max:100'],
            'city' => ['nullable', 'string', 'max:100'],
            'threshold_amount' => ['nullable', 'numeric', 'min:0'],
            'amount' => ['nullable', 'numeric', 'min:0'],
            'cost_per_kg' => ['nullable', 'numeric', 'min:0'],
            'priority' => ['nullable', 'integer', 'min:0', 'max:9999'],
            'is_active' => ['nullable', 'boolean'],
            'note' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * تاریخچهٔ ارسال‌ها: رویدادهای مرسوله‌ها با فیلتر وضعیت، مرسوله و جست‌وجو.
     */
    public function history(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'status' => ['nullable', Rule::in(Shipment::STATUSES)],
            'shipment_id' => ['nullable', 'integer', 'exists:shipments,id'],
            'search' => ['nullable', 'string', 'max:100'],
            'from' => ['nullable', 'date'],
            'to' => ['nullable', 'date'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:500'],
        ]);

        $query = ShipmentEvent::query()->with([
            'shipment:id,shipment_number,tracking_code,recipient_name,status,order_id',
            'shipment.order:id,order_number',
            'creator:id,name,email',
        ]);

        if (! empty($validated['status'])) {
            $query->where('status', $validated['status']);
        }

        if (! empty($validated['shipment_id'])) {
            $query->where('shipment_id', $validated['shipment_id']);
        }

        if (! empty($validated['from'])) {
            $query->whereDate('happened_at', '>=', $validated['from']);
        }

        if (! empty($validated['to'])) {
            $query->whereDate('happened_at', '<=', $validated['to']);
        }

        if (isset($validated['search']) && trim($validated['search']) !== '') {
            $search = trim($validated['search']);

            $query->where(function ($subQuery) use ($search) {
                $subQuery
                    ->where('note', 'like', "%{$search}%")
                    ->orWhereHas('shipment', function ($shipmentQuery) use ($search) {
                        $shipmentQuery
                            ->where('shipment_number', 'like', "%{$search}%")
                            ->orWhere('tracking_code', 'like', "%{$search}%")
                            ->orWhere('recipient_name', 'like', "%{$search}%");
                    });
            });
        }

        $events = $query
            ->orderByDesc('happened_at')
            ->orderByDesc('id')
            ->limit($validated['limit'] ?? 200)
            ->get()
            ->map(fn (ShipmentEvent $event) => [
                'id' => $event->id,
                'status' => $event->status,
                'status_label' => $event->statusLabel(),
                'note' => $event->note,
                'happened_at' => $event->happened_at?->toIso8601String(),
                'creator' => $event->creator?->name,
                'shipment' => $event->shipment === null ? null : [
                    'id' => $event->shipment->id,
                    'shipment_number' => $event->shipment->shipment_number,
                    'tracking_code' => $event->shipment->tracking_code,
                    'recipient_name' => $event->shipment->recipient_name,
                    'status' => $event->shipment->status,
                    'order_number' => $event->shipment->order?->order_number,
                ],
            ]);

        return response()->json([
            'success' => true,
            'data' => $events,
            'meta' => [
                'total' => $events->count(),
                'statuses' => collect(Shipment::statusMeta())
                    ->map(fn (array $meta, string $key) => [
                        'value' => $key,
                        'label' => $meta['label'],
                        'tone' => $meta['tone'],
                    ])
                    ->values(),
            ],
        ]);
    }
}





