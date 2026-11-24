<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Illuminate\Testing\TestResponse;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * انتساب سفارش (UTM + referrer): ذخیره، پاک‌سازی و اعتبارسنجی.
 *
 * سرور مبنای گزارش «فروش هر کمپین» است؛ پس هیچ مقدار خام و بی‌حدی نباید
 * ذخیره شود.
 */
class OrderAttributionTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(int $stock = 10): Product
    {
        $category = Category::query()->create([
            'name' => 'Attribution Test Category',
            'slug' => 'attribution-test-'.Str::random(8),
            'is_active' => true,
            'sort_order' => 0,
        ]);

        return Product::query()->create([
            'category_id' => $category->id,
            'name' => 'Attribution Test Product',
            'slug' => 'attribution-test-product-'.Str::random(8),
            'sku' => 'ATT-TEST-'.Str::random(6),
            'price' => 100000,
            'stock' => $stock,
            'discount_percent' => 0,
            'is_active' => true,
        ]);
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function placeOrder(array $overrides = []): TestResponse
    {
        $user = User::factory()->create(['role' => 'user']);
        $product = $this->createProduct();

        Sanctum::actingAs($user);

        return $this->withHeader('Idempotency-Key', (string) Str::uuid())
            ->postJson('/api/v1/orders', array_merge([
                'recipient_name' => 'Test User',
                'phone' => '09120000000',
                'address' => 'Test address',
                'postal_code' => '1234567890',
                'notes' => null,
                'payment_method' => 'cod',
                'items' => [
                    [
                        'product_id' => $product->id,
                        'quantity' => 1,
                    ],
                ],
            ], $overrides));
    }

    public function test_utm_and_referrer_are_stored_with_the_order(): void
    {
        $this->placeOrder([
            'utm' => [
                'source' => 'instagram',
                'medium' => 'social',
                'campaign' => 'spring-sale',
                'content' => 'story-1',
                'term' => 'ویتامین',
                'referrer' => 'https://instagram.com/p/abc',
            ],
        ])->assertCreated();

        $order = Order::query()->firstOrFail();

        $this->assertSame('instagram', $order->utm_source);
        $this->assertSame('social', $order->utm_medium);
        $this->assertSame('spring-sale', $order->utm_campaign);
        $this->assertSame('story-1', $order->utm_content);
        $this->assertSame('ویتامین', $order->utm_term);
        $this->assertSame('https://instagram.com/p/abc', $order->referrer);
    }

    public function test_attribution_values_are_sanitized_before_storage(): void
    {
        $this->placeOrder([
            'utm' => [
                'source' => '  <b>google</b>  ',
                'campaign' => str_repeat('a', 300),
                'medium' => '',
            ],
        ])->assertCreated();

        $order = Order::query()->firstOrFail();

        $this->assertSame('google', $order->utm_source);
        $this->assertSame(180, mb_strlen((string) $order->utm_campaign));
        $this->assertNull($order->utm_medium);
        $this->assertNull($order->utm_content);
        $this->assertNull($order->referrer);
    }

    public function test_order_without_attribution_stores_nulls(): void
    {
        $this->placeOrder()->assertCreated();

        $order = Order::query()->firstOrFail();

        $this->assertNull($order->utm_source);
        $this->assertNull($order->utm_medium);
        $this->assertNull($order->utm_campaign);
        $this->assertNull($order->utm_content);
        $this->assertNull($order->utm_term);
        $this->assertNull($order->referrer);
    }

    public function test_attribution_values_must_be_strings(): void
    {
        $this->placeOrder([
            'utm' => ['source' => ['google']],
        ])->assertStatus(422);

        $this->assertSame(0, Order::query()->count());
    }
}
