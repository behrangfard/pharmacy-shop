<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\Shipment;
use App\Models\ShipmentEvent;
use App\Models\ShippingMethod;
use App\Models\ShippingRule;
use App\Models\ShippingZone;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminShippingTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function order(string $number = 'ORD-SHIP-001'): Order
    {
        $user = User::factory()->create();

        return Order::query()->create([
            'user_id' => $user->id,
            'order_number' => $number,
            'recipient_name' => 'سارا محمدی',
            'phone' => '09121234567',
            'address' => 'تهران، خیابان ولیعصر، پلاک ۱۲',
            'postal_code' => '1234567890',
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 100000,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);
    }

    private function method(string $code = 'post_peyvast'): ShippingMethod
    {
        return ShippingMethod::query()->where('code', $code)->firstOrFail();
    }

    public function test_admin_can_view_shipping_dashboard(): void
    {
        $this->admin();
        $order = $this->order();

        $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
            'shipping_method_id' => $this->method()->id,
        ])->assertCreated();

        $response = $this->getJson('/api/v1/admin/shipping')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.stats.awaiting_packaging', 1)
            ->assertJsonPath('data.stats.total', 1);

        $this->assertGreaterThanOrEqual(5, $response->json('data.methods.total'));
        $this->assertCount(8, $response->json('data.statuses'));
    }

    public function test_admin_can_create_shipment_for_order(): void
    {
        $this->admin();
        $order = $this->order();

        $method = $this->method();

        $response = $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
            'shipping_method_id' => $method->id,
        ])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.order_id', $order->id)
            ->assertJsonPath('data.status', Shipment::STATUS_AWAITING_PACKAGING)
            ->assertJsonPath('data.recipient_name', 'سارا محمدی');

        $this->assertStringStartsWith(
            'SHP-',
            (string) $response->json('data.shipment_number')
        );

        // هزینهٔ پیش‌فرض از تعرفهٔ روش ارسال (هزینهٔ پایه) گرفته می‌شود.
        $this->assertSame(
            (float) $method->base_cost,
            (float) $response->json('data.cost')
        );

        $this->assertDatabaseHas('shipments', [
            'order_id' => $order->id,
            'shipping_method_id' => $method->id,
        ]);

        $this->assertDatabaseHas('shipment_events', [
            'status' => Shipment::STATUS_AWAITING_PACKAGING,
        ]);
    }

    public function test_shipment_status_updates_order_and_keeps_history(): void
    {
        $this->admin();
        $order = $this->order();

        $created = $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
            'shipping_method_id' => $this->method('tipax')->id,
            'status' => Shipment::STATUS_READY_TO_SHIP,
        ])->assertCreated();

        $shipmentId = (int) $created->json('data.id');

        $this->patchJson("/api/v1/admin/shipping/shipments/{$shipmentId}/status", [
            'status' => Shipment::STATUS_IN_TRANSIT,
            'tracking_code' => 'TRK-SHIP-1',
            'note' => 'تحویل به تیپاکس',
        ])
            ->assertOk()
            ->assertJsonPath('data.status', Shipment::STATUS_IN_TRANSIT)
            ->assertJsonPath('data.tracking_code', 'TRK-SHIP-1');

        $order->refresh();

        $this->assertSame('shipped', $order->status);
        $this->assertSame('TRK-SHIP-1', $order->tracking_code);
        $this->assertNotNull($order->shipped_at);

        $this->patchJson("/api/v1/admin/shipping/shipments/{$shipmentId}/status", [
            'status' => Shipment::STATUS_DELIVERED,
        ])->assertOk();

        $order->refresh();

        $this->assertSame('delivered', $order->status);
        $this->assertNotNull($order->delivered_at);

        $this->assertSame(
            3,
            ShipmentEvent::query()->where('shipment_id', $shipmentId)->count()
        );

        $this->getJson('/api/v1/admin/shipping/history')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.0.status', Shipment::STATUS_DELIVERED);
    }

    public function test_failed_delivery_requires_reason(): void
    {
        $this->admin();
        $order = $this->order();

        $created = $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
        ])->assertCreated();

        $this->patchJson(
            '/api/v1/admin/shipping/shipments/'
                . $created->json('data.id')
                . '/status',
            ['status' => Shipment::STATUS_DELIVERY_FAILED]
        )
            ->assertStatus(422)
            ->assertJsonValidationErrors('delay_reason');
    }

    public function test_quote_applies_free_shipping_rule(): void
    {
        $this->admin();

        $method = $this->method('post_sefareshi');

        ShippingRule::query()->create([
            'title' => 'ارسال رایگان بالای دو میلیون',
            'type' => ShippingRule::TYPE_FREE_OVER_AMOUNT,
            'threshold_amount' => 2000000,
            'amount' => 0,
            'priority' => 50,
            'is_active' => true,
        ]);

        $this->postJson('/api/v1/admin/shipping/quote', [
            'shipping_method_id' => $method->id,
            'subtotal' => 2500000,
            'weight_grams' => 1200,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_free', true)
            ->assertJsonPath('data.cost', 0);

        $this->postJson('/api/v1/admin/shipping/quote', [
            'shipping_method_id' => $method->id,
            'subtotal' => 500000,
            'weight_grams' => 1200,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_free', false)
            ->assertJsonPath('data.weight_kg', 2);
    }

    public function test_admin_can_manage_methods_zones_and_rules(): void
    {
        $this->admin();

        $method = $this->postJson('/api/v1/admin/shipping/methods', [
            'name' => 'پیک همان‌روز',
            'carrier' => 'پیک فروشگاه',
            'base_cost' => 55000,
            'max_days' => 1,
            'is_express' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.name', 'پیک همان‌روز');

        $methodId = (int) $method->json('data.id');

        $this->patchJson("/api/v1/admin/shipping/methods/{$methodId}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $zone = $this->postJson('/api/v1/admin/shipping/zones', [
            'province' => 'تهران',
            'city' => 'تهران',
            'cost' => 35000,
            'is_express_available' => true,
        ])
            ->assertCreated()
            ->assertJsonPath('data.province', 'تهران');

        $zoneId = (int) $zone->json('data.id');

        $this->patchJson("/api/v1/admin/shipping/zones/{$zoneId}/status", [
            'is_active' => false,
        ])
            ->assertOk()
            ->assertJsonPath('data.is_active', false);

        $rule = $this->postJson('/api/v1/admin/shipping/rules', [
            'title' => 'تعرفهٔ ثابت تهران',
            'type' => ShippingRule::TYPE_ZONE_BASED,
            'shipping_method_id' => $methodId,
            'province' => 'تهران',
            'amount' => 45000,
            'priority' => 10,
        ])
            ->assertCreated()
            ->assertJsonPath('data.type_label', 'هزینهٔ منطقه‌ای');

        $this->deleteJson('/api/v1/admin/shipping/rules/' . $rule->json('data.id'))
            ->assertOk();

        $this->assertDatabaseMissing('shipping_rules', [
            'title' => 'تعرفهٔ ثابت تهران',
        ]);

        $this->deleteJson("/api/v1/admin/shipping/zones/{$zoneId}")->assertOk();
        $this->deleteJson("/api/v1/admin/shipping/methods/{$methodId}")->assertOk();

        $this->assertDatabaseMissing('shipping_zones', ['id' => $zoneId]);
        $this->assertDatabaseMissing('shipping_methods', ['id' => $methodId]);
    }

    public function test_shipments_can_be_filtered_and_searched(): void
    {
        $this->admin();
        $order = $this->order('ORD-SHIP-SEARCH');

        $created = $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
            'tracking_code' => 'TRK-SEARCH-9',
            'status' => Shipment::STATUS_IN_TRANSIT,
        ])->assertCreated();

        $this->getJson('/api/v1/admin/shipping/shipments?search=TRK-SEARCH-9')
            ->assertOk()
            ->assertJsonPath('data.0.id', $created->json('data.id'));

        $this->getJson('/api/v1/admin/shipping/shipments?status=delivered')
            ->assertOk()
            ->assertJsonCount(0, 'data');

        $this->getJson('/api/v1/admin/shipping/shipments?status=open')
            ->assertOk()
            ->assertJsonCount(1, 'data');
    }

    public function test_notify_fails_when_sms_channel_is_not_configured(): void
    {
        $this->admin();

        config([
            'messaging.channels.sms.enabled' => false,
            'messaging.channels.sms.api_key' => null,
        ]);

        $order = $this->order('ORD-SHIP-NOTIFY');

        $created = $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
            'tracking_code' => 'TRK-NOTIFY-1',
        ])->assertCreated();

        $this->postJson(
            '/api/v1/admin/shipping/shipments/'
                . $created->json('data.id')
                . '/notify',
            []
        )
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    public function test_deleting_shipment_removes_it(): void
    {
        $this->admin();
        $order = $this->order('ORD-SHIP-DELETE');

        $created = $this->postJson('/api/v1/admin/shipping/shipments', [
            'order_id' => $order->id,
        ])->assertCreated();

        $shipmentId = (int) $created->json('data.id');

        $this->deleteJson("/api/v1/admin/shipping/shipments/{$shipmentId}")
            ->assertOk();

        $this->assertDatabaseMissing('shipments', ['id' => $shipmentId]);
    }
}
