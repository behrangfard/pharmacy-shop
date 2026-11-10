<?php

namespace App\Services\Shipping;

use App\Models\Order;
use App\Models\Shipment;
use App\Models\ShipmentEvent;
use App\Models\ShippingMethod;
use App\Models\ShippingRule;
use App\Models\ShippingZone;
use App\Models\StoreSetting;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;

/**
 * منطق مشترک بخش «ارسال و حمل‌ونقل» پنل مدیریت.
 *
 * - محاسبهٔ هزینهٔ ارسال (تعرفه‌ها، مناطق و روش‌ها)
 * - ساخت و به‌روزرسانی مرسوله و ثبت تاریخچهٔ وضعیت‌ها
 * - همگام‌سازی وضعیت مرسوله با سفارش (کد رهگیری و وضعیت ارسال مشتری)
 * - آمار داشبورد ارسال
 */
class ShippingService
{
    /**
     * رشتهٔ تمیز (trim) برای مقایسهٔ نام استان/شهر.
     */
    private function clean(?string $value): string
    {
        return trim((string) $value);
    }

    /**
     * محاسبهٔ هزینهٔ ارسال بر اساس روش، منطقه و مبلغ سفارش.
     *
     * ترتیب اولویت:
     * ۱) آستانهٔ ارسال رایگان خود روش ارسال
     * ۲) قوانین تعرفه (بر اساس اولویت؛ اولین قانون مطابق اعمال می‌شود)
     * ۳) هزینهٔ پایه + هزینهٔ هر کیلوگرم روش ارسال
     * ۴) هزینهٔ منطقهٔ مقصد (اگر روش، هزینهٔ پایه نداشته باشد)
     *
     * @return array<string, mixed>
     */
    public function quote(
        ?ShippingMethod $method,
        ?string $province,
        ?string $city,
        int $weightGrams = 0,
        float $subtotal = 0
    ): array {
        $province = $this->clean($province);
        $city = $this->clean($city);
        $weightGrams = max(0, $weightGrams);
        $weightKg = $weightGrams > 0 ? (int) ceil($weightGrams / 1000) : 0;

        $zone = ShippingZone::query()
            ->active()
            ->forDestination($province, $city)
            ->first();

        $rules = $this->matchingRules($method, $province, $city);

        $cost = (float) ($method?->base_cost ?? 0);
        $perKg = (float) ($method?->cost_per_kg ?? 0);
        $reason = $method !== null
            ? "هزینهٔ پایهٔ «{$method->name}»"
            : 'هزینهٔ پایهٔ ارسال';
        $ruleId = null;
        $isFree = false;

        if (
            $method !== null
            && $method->free_over_amount !== null
            && (float) $method->free_over_amount > 0
            && $subtotal >= (float) $method->free_over_amount
        ) {
            $cost = 0.0;
            $isFree = true;
            $reason = 'ارسال رایگان برای خرید بالای '
                . $this->formatAmount((float) $method->free_over_amount);
        }

        if (! $isFree) {
            foreach ($rules as $rule) {
                if ($rule->type === ShippingRule::TYPE_FREE_OVER_AMOUNT) {
                    $threshold = (float) ($rule->threshold_amount ?? 0);

                    if ($threshold > 0 && $subtotal >= $threshold) {
                        $cost = 0.0;
                        $isFree = true;
                        $reason = "ارسال رایگان: {$rule->title}";
                        $ruleId = $rule->id;

                        break;
                    }

                    continue;
                }

                if ($rule->type === ShippingRule::TYPE_WEIGHT_BASED) {
                    $cost = (float) $rule->amount
                        + ((float) ($rule->cost_per_kg ?? 0) * $weightKg);
                } else {
                    $cost = (float) $rule->amount;
                }

                $reason = "{$rule->title} ({$rule->typeLabel()})";
                $ruleId = $rule->id;

                break;
            }
        }

        if (! $isFree && $ruleId === null) {
            if ($perKg > 0 && $weightKg > 0) {
                $cost = (float) ($method?->base_cost ?? 0) + ($perKg * $weightKg);
                $reason = 'هزینهٔ پایه + وزن بسته';
            } elseif ($zone !== null && $zone->cost !== null) {
                $cost = (float) $zone->cost;
                $reason = "تعرفهٔ منطقهٔ {$zone->label()}";
            }
        }

        return [
            'cost' => round(max(0, $cost), 2),
            'is_free' => $isFree,
            'reason' => $reason,
            'rule_id' => $ruleId,
            'zone' => $zone === null ? null : [
                'id' => $zone->id,
                'label' => $zone->label(),
                'cost' => $zone->cost === null ? null : (float) $zone->cost,
            ],
            'method' => $method === null ? null : [
                'id' => $method->id,
                'name' => $method->name,
                'estimate' => $method->deliveryEstimate(),
            ],
            'weight_grams' => $weightGrams,
            'weight_kg' => $weightKg,
            'subtotal' => $subtotal,
        ];
    }

    /**
     * قوانین تعرفهٔ قابل اعمال برای این روش و مقصد (اولویت بالاتر اول).
     *
     * @return Collection<int, ShippingRule>
     */
    private function matchingRules(
        ?ShippingMethod $method,
        string $province,
        string $city
    ): Collection {
        return ShippingRule::query()
            ->active()
            ->where(function ($query) use ($method) {
                $query->whereNull('shipping_method_id');

                if ($method !== null) {
                    $query->orWhere('shipping_method_id', $method->id);
                }
            })
            ->orderByDesc('priority')
            ->orderBy('id')
            ->get()
            ->filter(function (ShippingRule $rule) use ($province, $city) {
                if ($rule->province !== null && $this->clean($rule->province) !== $province) {
                    return false;
                }

                if ($rule->city !== null && $this->clean($rule->city) !== $city) {
                    return false;
                }

                return true;
            })
            ->values();
    }

    private function formatAmount(float $amount): string
    {
        return number_format($amount, 0, '.', ',');
    }

    /**
     * شمارهٔ یکتای مرسوله: SHP-YYMMDD-0001
     */
    public function nextShipmentNumber(): string
    {
        $prefix = 'SHP-' . now()->format('ymd') . '-';

        $lastNumber = Shipment::query()
            ->where('shipment_number', 'like', $prefix . '%')
            ->orderByDesc('id')
            ->value('shipment_number');

        $sequence = 1;

        if (is_string($lastNumber)) {
            $sequence = (int) substr($lastNumber, strlen($prefix)) + 1;
        }

        return $prefix . str_pad((string) $sequence, 4, '0', STR_PAD_LEFT);
    }

    /**
     * ثبت مرسولهٔ جدید برای یک سفارش.
     *
     * @param  array<string, mixed>  $data
     */
    public function createShipment(
        Order $order,
        array $data,
        ?int $adminId = null
    ): Shipment {
        return DB::transaction(function () use ($order, $data, $adminId) {
            $method = $this->resolveMethod($data['shipping_method_id'] ?? null);

            $weight = (int) ($data['weight_grams'] ?? 0);
            $volumetric = (int) ($data['volumetric_weight_grams'] ?? 0);

            $quote = $this->quote(
                $method,
                $data['province'] ?? null,
                $data['city'] ?? null,
                max($weight, $volumetric),
                (float) $order->subtotal
            );

            $status = $data['status'] ?? Shipment::STATUS_AWAITING_PACKAGING;

            $shipment = Shipment::query()->create([
                'shipment_number' => $this->nextShipmentNumber(),
                'order_id' => $order->id,
                'shipping_method_id' => $method?->id,
                'status' => $status,
                'carrier' => $data['carrier'] ?? $method?->carrier,
                'recipient_name' => $data['recipient_name'] ?? $order->recipient_name,
                'phone' => $data['phone'] ?? $order->phone,
                'province' => $data['province'] ?? null,
                'city' => $data['city'] ?? null,
                'address' => $data['address'] ?? $order->address,
                'postal_code' => $data['postal_code'] ?? $order->postal_code,
                'tracking_code' => $data['tracking_code'] ?? null,
                'cost' => array_key_exists('cost', $data) && $data['cost'] !== null
                    ? (float) $data['cost']
                    : $quote['cost'],
                'weight_grams' => $weight > 0 ? $weight : null,
                'volumetric_weight_grams' => $volumetric > 0 ? $volumetric : null,
                'package_count' => max(1, (int) ($data['package_count'] ?? 1)),
                'notes' => $data['notes'] ?? null,
                'delay_reason' => $data['delay_reason'] ?? null,
                'expected_delivery_at' => $data['expected_delivery_at']
                    ?? $this->expectedDeliveryAt($method),
                'created_by' => $adminId,
            ]);

            $this->applyStatusTimestamps($shipment, $status);
            $shipment->save();

            $this->logEvent(
                $shipment,
                $status,
                $data['note'] ?? 'ثبت مرسوله',
                $adminId
            );

            $this->syncOrder($shipment);

            return $shipment->fresh()->load(['order', 'method', 'events.creator']);
        }, 3);
    }

    /**
     * به‌روزرسانی اطلاعات مرسوله (بدون تغییر وضعیت).
     *
     * @param  array<string, mixed>  $data
     */
    public function updateShipment(
        Shipment $shipment,
        array $data,
        ?int $adminId = null
    ): Shipment {
        return DB::transaction(function () use ($shipment, $data, $adminId) {
            $method = $this->resolveMethod(
                $data['shipping_method_id'] ?? $shipment->shipping_method_id
            );

            $previousTracking = $shipment->tracking_code;

            $fields = [
                'carrier',
                'recipient_name',
                'phone',
                'province',
                'city',
                'address',
                'postal_code',
                'tracking_code',
                'cost',
                'weight_grams',
                'volumetric_weight_grams',
                'package_count',
                'notes',
                'delay_reason',
                'return_reason',
                'expected_delivery_at',
            ];

            foreach ($fields as $field) {
                if (array_key_exists($field, $data)) {
                    $shipment->{$field} = $data[$field];
                }
            }

            $shipment->shipping_method_id = $method?->id;

            if ($method !== null && ! array_key_exists('carrier', $data)) {
                $shipment->carrier = $shipment->carrier ?? $method->carrier;
            }

            $shipment->save();

            if (
                array_key_exists('tracking_code', $data)
                && $data['tracking_code'] !== $previousTracking
                && is_string($data['tracking_code'])
                && $data['tracking_code'] !== ''
            ) {
                $this->logEvent(
                    $shipment,
                    $shipment->status,
                    "ثبت کد رهگیری {$data['tracking_code']}",
                    $adminId
                );
            }

            $this->syncOrder($shipment);

            return $shipment->fresh()->load(['order', 'method', 'events.creator']);
        }, 3);
    }

    /**
     * تغییر وضعیت مرسوله همراه با ثبت رویداد تاریخچه.
     *
     * @param  array<string, mixed>  $options
     */
    public function changeStatus(
        Shipment $shipment,
        string $status,
        array $options = [],
        ?int $adminId = null
    ): Shipment {
        return DB::transaction(function () use ($shipment, $status, $options, $adminId) {
            $previous = $shipment->status;

            $shipment->status = $status;

            if (array_key_exists('delay_reason', $options)) {
                $shipment->delay_reason = $options['delay_reason'];
            }

            if (array_key_exists('return_reason', $options)) {
                $shipment->return_reason = $options['return_reason'];
            }

            if (! empty($options['tracking_code'])) {
                $shipment->tracking_code = $options['tracking_code'];
            }

            $this->applyStatusTimestamps($shipment, $status);
            $shipment->save();

            $this->logEvent(
                $shipment,
                $status,
                $options['note'] ?? null,
                $adminId
            );

            if ($previous !== $status) {
                $this->syncOrder($shipment);
            }

            return $shipment->fresh()->load(['order', 'method', 'events.creator']);
        }, 3);
    }



    /**
     * آمار داشبورد ارسال.
     *
     * @return array<string, mixed>
     */
    public function overview(): array
    {
        $counts = Shipment::query()
            ->selectRaw('status, COUNT(*) as aggregate')
            ->groupBy('status')
            ->pluck('aggregate', 'status')
            ->map(fn ($value) => (int) $value)
            ->all();

        $count = fn (string $status): int => $counts[$status] ?? 0;

        $delayed = Shipment::query()
            ->whereIn('status', Shipment::OPEN_STATUSES)
            ->whereNotNull('expected_delivery_at')
            ->where('expected_delivery_at', '<', now())
            ->count();

        $awaitingShipmentOrders = Order::query()
            ->where('payment_status', 'paid')
            ->whereNotIn('status', ['cancelled', 'canceled', 'delivered'])
            ->whereDoesntHave('shipments', function ($query) {
                $query->whereIn('status', Shipment::OPEN_STATUSES);
            })
            ->orderBy('created_at')
            ->limit(8)
            ->get(['id', 'order_number', 'recipient_name', 'total', 'status', 'payment_status', 'created_at']);

        return [
            'stats' => [
                'awaiting_packaging' => $count(Shipment::STATUS_AWAITING_PACKAGING),
                'packaging' => $count(Shipment::STATUS_PACKAGING),
                'ready_to_ship' => $count(Shipment::STATUS_READY_TO_SHIP),
                'handed_to_carrier' => $count(Shipment::STATUS_HANDED_TO_CARRIER),
                'in_transit' => $count(Shipment::STATUS_IN_TRANSIT),
                'shipped' => $count(Shipment::STATUS_HANDED_TO_CARRIER)
                    + $count(Shipment::STATUS_IN_TRANSIT),
                'delivered' => $count(Shipment::STATUS_DELIVERED),
                'delivery_failed' => $count(Shipment::STATUS_DELIVERY_FAILED),
                'returned' => $count(Shipment::STATUS_RETURNED),
                'delayed' => $delayed,
                'awaiting_shipment_orders' => $awaitingShipmentOrders->count(),
                'total' => array_sum($counts),
            ],
            'costs' => [
                'total' => (float) Shipment::query()->sum('cost'),
                'last_30_days' => (float) Shipment::query()
                    ->where('created_at', '>=', now()->subDays(30))
                    ->sum('cost'),
                'average' => round((float) Shipment::query()->avg('cost'), 2),
            ],
            'methods' => [
                'total' => ShippingMethod::query()->count(),
                'active' => ShippingMethod::query()->where('is_active', true)->count(),
            ],
            'zones' => [
                'total' => ShippingZone::query()->count(),
                'active' => ShippingZone::query()->where('is_active', true)->count(),
            ],
            'rules' => [
                'total' => ShippingRule::query()->count(),
                'active' => ShippingRule::query()->where('is_active', true)->count(),
            ],
            'statuses' => collect(Shipment::statusMeta())
                ->map(fn (array $meta, string $key) => [
                    'value' => $key,
                    'label' => $meta['label'],
                    'tone' => $meta['tone'],
                    'count' => $counts[$key] ?? 0,
                ])
                ->values()
                ->all(),
            'recent_shipments' => Shipment::query()
                ->with([
                    'order:id,order_number,total,status,payment_status',
                    'method:id,name',
                ])
                ->orderByDesc('id')
                ->limit(8)
                ->get(),
            'awaiting_shipment_orders' => $awaitingShipmentOrders,
            'carriers' => ShippingMethod::query()
                ->whereNotNull('carrier')
                ->distinct()
                ->orderBy('carrier')
                ->pluck('carrier')
                ->all(),
        ];
    }

    /**
     * متن پیامک اطلاع‌رسانی کد رهگیری مرسوله.
     */
    public function trackingMessage(Shipment $shipment): string
    {
        $store = (string) StoreSetting::getValue('store_name', 'فروشگاه');
        $method = $shipment->method?->name ?? $shipment->carrier ?? 'ارسال';

        $lines = [
            "{$shipment->recipient_name} عزیز، سفارش شما با {$method} ارسال شد.",
        ];

        if ($shipment->tracking_code) {
            $lines[] = "کد رهگیری: {$shipment->tracking_code}";
        }

        $lines[] = "شمارهٔ مرسوله: {$shipment->shipment_number}";
        $lines[] = "با تشکر از خرید شما — {$store}";

        return implode("\n", $lines);
    }

    /**
     * روش ارسال را از شناسه پیدا می‌کند (شناسهٔ خالی = بدون روش).
     */
    private function resolveMethod(mixed $methodId): ?ShippingMethod
    {
        if ($methodId === null || $methodId === '') {
            return null;
        }

        return ShippingMethod::query()->find((int) $methodId);
    }

    /**
     * ثبت رویداد در تاریخچهٔ مرسوله.
     */
    private function logEvent(
        Shipment $shipment,
        string $status,
        ?string $note,
        ?int $adminId,
        ?Carbon $happenedAt = null
    ): ShipmentEvent {
        return ShipmentEvent::query()->create([
            'shipment_id' => $shipment->id,
            'status' => $status,
            'note' => $note,
            'happened_at' => $happenedAt ?? now(),
            'created_by' => $adminId,
        ]);
    }

    /**
     * ثبت زمان‌های ارسال/تحویل بر اساس وضعیت جدید.
     */
    private function applyStatusTimestamps(Shipment $shipment, string $status): void
    {
        if (in_array($status, [
            Shipment::STATUS_HANDED_TO_CARRIER,
            Shipment::STATUS_IN_TRANSIT,
        ], true)) {
            $shipment->shipped_at = $shipment->shipped_at ?? now();
        }

        if ($status === Shipment::STATUS_DELIVERED) {
            $shipment->shipped_at = $shipment->shipped_at ?? now();
            $shipment->delivered_at = $shipment->delivered_at ?? now();
        }
    }

    /**
     * تاریخ تخمینی تحویل بر اساس حداکثر زمان اعلام‌شدهٔ روش ارسال.
     */
    private function expectedDeliveryAt(?ShippingMethod $method): ?Carbon
    {
        if ($method === null || $method->max_days === null) {
            return null;
        }

        return now()->addDays(max(0, $method->max_days));
    }

    /**
     * همگام‌سازی سفارش با آخرین وضعیت مرسوله:
     * کد رهگیری، روش ارسال، وضعیت ارسال و زمان تحویل مشتری.
     */
    private function syncOrder(Shipment $shipment): void
    {
        $order = $shipment->order;

        if ($order === null) {
            return;
        }

        if (in_array($order->status, ['cancelled', 'canceled'], true)) {
            return;
        }

        if ($shipment->tracking_code) {
            $order->tracking_code = $shipment->tracking_code;
        }

        if ($shipment->method !== null) {
            $order->shipping_method = $shipment->method->name;
        } elseif ($shipment->carrier) {
            $order->shipping_method = $shipment->carrier;
        }

        if (in_array($shipment->status, [
            Shipment::STATUS_HANDED_TO_CARRIER,
            Shipment::STATUS_IN_TRANSIT,
            Shipment::STATUS_DELIVERED,
        ], true)) {
            $order->shipped_at = $order->shipped_at ?? $shipment->shipped_at ?? now();

            if ($order->status !== 'delivered') {
                $order->status = 'shipped';
            }
        }

        if ($shipment->status === Shipment::STATUS_DELIVERED) {
            $order->status = 'delivered';
            $order->delivered_at = $shipment->delivered_at ?? now();
        }

        $order->save();
    }
}


