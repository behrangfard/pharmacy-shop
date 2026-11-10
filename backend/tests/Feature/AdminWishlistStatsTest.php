<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * تست‌های آمار علاقه‌مندی‌های مشتریان در پنل مدیریت.
 */
class AdminWishlistStatsTest extends TestCase
{
    use RefreshDatabase;

    private function admin(?string $adminRole = null): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'admin_role' => $adminRole,
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function customer(string $name = 'مشتری آماری'): User
    {
        return User::factory()->create([
            'role' => 'customer',
            'name' => $name,
        ]);
    }

    private function product(array $attributes = [], string $slug = 'wishlist-stat-product'): Product
    {
        $unique = uniqid();

        $categoryId = DB::table('categories')->insertGetId([
            'name' => 'دسته آماری',
            'slug' => 'wishlist-stat-category-'.$unique,
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return Product::query()->create(array_merge([
            'category_id' => $categoryId,
            'brand_id' => null,
            'name' => 'محصول آماری',
            'slug' => $slug.'-'.$unique,
            'sku' => 'WLS-STAT-'.strtoupper($unique),
            'short_description' => 'توضیح کوتاه',
            'price' => 200000,
            'compare_price' => null,
            'discount_percent' => 0,
            'stock' => 5,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'views_count' => 0,
            'sales_count' => 0,
        ], $attributes));
    }

    private function wishlistItem(User $customer, Product $product, ?Carbon $createdAt = null): void
    {
        $timestamp = $createdAt ?? now();

        DB::table('wishlist_items')->insert([
            'user_id' => $customer->id,
            'product_id' => $product->id,
            'created_at' => $timestamp,
            'updated_at' => $timestamp,
        ]);
    }

    private function orderWithProduct(User $customer, Product $product, string $number): Order
    {
        $order = Order::query()->create([
            'user_id' => $customer->id,
            'order_number' => $number,
            'recipient_name' => $customer->name,
            'phone' => '09121234567',
            'address' => 'تهران، خیابان ولیعصر، پلاک ۱۲',
            'postal_code' => '1234567890',
            'subtotal' => 200000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 200000,
            'status' => 'processing',
            'payment_status' => 'paid',
        ]);

        OrderItem::query()->create([
            'order_id' => $order->id,
            'product_id' => $product->id,
            'product_name' => $product->name,
            'quantity' => 1,
            'unit_price' => 200000,
            'total_price' => 200000,
        ]);

        return $order;
    }

    public function test_admin_can_view_wishlist_overview(): void
    {
        $this->admin();

        $firstCustomer = $this->customer('سارا محمدی');
        $secondCustomer = $this->customer('رضا کریمی');

        $popular = $this->product(['name' => 'کرم ضد آفتاب'], 'sunscreen');
        $outOfStock = $this->product(['name' => 'شامپو گیاهی', 'stock' => 0], 'shampoo');

        $this->wishlistItem($firstCustomer, $popular);
        $this->wishlistItem($secondCustomer, $popular);
        $this->wishlistItem($firstCustomer, $outOfStock);

        $response = $this->getJson('/api/v1/admin/wishlist/overview')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.summary.total_items', 3)
            ->assertJsonPath('data.summary.customers_count', 2)
            ->assertJsonPath('data.summary.products_count', 2)
            ->assertJsonPath('data.summary.items_last_7_days', 3)
            ->assertJsonPath('data.summary.avg_items_per_customer', 1.5)
            ->assertJsonPath('data.summary.out_of_stock_products', 1)
            ->assertJsonPath('data.summary.converted_items', 0);

        // نمودار روند پیش‌فرض ۱۴ روز است و امروز آخرین ستون آن است.
        $this->assertCount(14, $response->json('data.trend'));
        $this->assertSame(3, $response->json('data.trend.13.count'));

        $response
            ->assertJsonPath('data.top_products.0.id', $popular->id)
            ->assertJsonPath('data.top_products.0.wishlist_count', 2)
            ->assertJsonPath('data.top_products.0.customers_count', 2)
            ->assertJsonPath('data.top_customers.0.id', $firstCustomer->id)
            ->assertJsonPath('data.top_customers.0.wishlist_count', 2);

        $this->assertCount(3, $response->json('data.recent'));
        $this->assertSame('دسته آماری', $response->json('data.top_categories.0.name'));
        // هر محصول در این تست دستهٔ خودش را دارد؛ دستهٔ محصول پرطرفدار ۲ آیتم دارد.
        $this->assertSame(2, $response->json('data.top_categories.0.items'));
        $this->assertCount(2, $response->json('data.top_categories'));
    }

    public function test_overview_trend_window_is_configurable(): void
    {
        $this->admin();

        $customer = $this->customer();
        $product = $this->product();

        $this->wishlistItem($customer, $product, Carbon::now()->subDays(10));

        $weekResponse = $this->getJson('/api/v1/admin/wishlist/overview?days=7')
            ->assertOk();

        // آیتم ۱۰ روز پیش در بازهٔ ۷ روزه نیست.
        $this->assertCount(7, $weekResponse->json('data.trend'));
        $this->assertSame(0, array_sum(array_column($weekResponse->json('data.trend'), 'count')));

        $monthResponse = $this->getJson('/api/v1/admin/wishlist/overview?days=30')
            ->assertOk();

        $this->assertCount(30, $monthResponse->json('data.trend'));
        $this->assertSame(1, array_sum(array_column($monthResponse->json('data.trend'), 'count')));

        $this->getJson('/api/v1/admin/wishlist/overview?days=5')->assertStatus(422);
    }

    public function test_products_list_can_be_sorted_searched_and_filtered(): void
    {
        $this->admin();

        $firstCustomer = $this->customer('مشتری اول');
        $secondCustomer = $this->customer('مشتری دوم');

        $popular = $this->product(['name' => 'کرم ضد آفتاب SPF50'], 'sunscreen');
        $outOfStock = $this->product(['name' => 'شامپو گیاهی', 'stock' => 0], 'shampoo');

        $this->wishlistItem($firstCustomer, $popular);
        $this->wishlistItem($secondCustomer, $popular);
        $this->wishlistItem($firstCustomer, $outOfStock);

        $this->getJson('/api/v1/admin/wishlist/products')
            ->assertOk()
            ->assertJsonPath('data.total', 2)
            ->assertJsonPath('data.data.0.id', $popular->id)
            ->assertJsonPath('data.data.0.wishlist_count', 2)
            ->assertJsonPath('data.data.0.customers_count', 2)
            ->assertJsonPath('summary.products_with_wishlist', 2)
            ->assertJsonPath('summary.total_items', 3);

        $this->getJson('/api/v1/admin/wishlist/products?stock=out_of_stock')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $outOfStock->id);

        $this->getJson('/api/v1/admin/wishlist/products?search=شامپو')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $outOfStock->id);

        $this->getJson('/api/v1/admin/wishlist/products?sort_by=name&sort_direction=asc')
            ->assertOk()
            ->assertJsonPath('data.total', 2);
    }

    public function test_customers_list_shows_wishlist_counts(): void
    {
        $this->admin();

        $active = $this->customer('مشتری فعال');
        $this->customer('مشتری بدون علاقه‌مندی');

        $firstProduct = $this->product(['name' => 'محصول یک'], 'product-one');
        $secondProduct = $this->product(['name' => 'محصول دو'], 'product-two');

        $this->wishlistItem($active, $firstProduct);
        $this->wishlistItem($active, $secondProduct);

        $response = $this->getJson('/api/v1/admin/wishlist/customers')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $active->id)
            ->assertJsonPath('data.data.0.wishlist_count', 2);

        $this->assertNotNull($response->json('data.data.0.last_wishlist_at'));

        $this->getJson('/api/v1/admin/wishlist/customers?only=all')
            ->assertOk()
            ->assertJsonPath('data.total', 2);

        $this->getJson('/api/v1/admin/wishlist/customers?search=مشتری فعال')
            ->assertOk()
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.data.0.id', $active->id);
    }

    public function test_admin_can_view_customer_wishlist_items(): void
    {
        $this->admin();

        $customer = $this->customer('سارا محمدی');
        $inStock = $this->product(['name' => 'کرم مرطوب‌کننده', 'stock' => 4], 'moisturizer');
        $outOfStock = $this->product(['name' => 'تونر گیاهی', 'stock' => 0], 'toner');

        $this->wishlistItem($customer, $inStock, Carbon::now()->subDay());
        $this->wishlistItem($customer, $outOfStock);

        $response = $this->getJson("/api/v1/admin/wishlist/customers/{$customer->id}")
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.customer.id', $customer->id)
            ->assertJsonPath('data.summary.items_count', 2)
            ->assertJsonPath('data.summary.out_of_stock_count', 1)
            // جدیدترین آیتم اول فهرست است.
            ->assertJsonPath('data.items.0.product.id', $outOfStock->id);

        $this->assertGreaterThan(0, (float) $response->json('data.summary.total_value'));
        $this->assertNotNull($response->json('data.summary.last_added_at'));
    }

    public function test_unknown_customer_wishlist_returns_not_found(): void
    {
        $this->admin();

        $this->getJson('/api/v1/admin/wishlist/customers/999999')->assertNotFound();

        // مدیر هم مشتری نیست؛ نباید فهرست علاقه‌مندی او برگردد.
        $otherAdmin = User::factory()->create(['role' => 'admin']);
        $this->getJson("/api/v1/admin/wishlist/customers/{$otherAdmin->id}")->assertNotFound();
    }

    public function test_conversion_rate_counts_wishlisted_products_that_were_bought(): void
    {
        $this->admin();

        $customer = $this->customer('مشتری خریدار');
        $bought = $this->product(['name' => 'محصول خریداری‌شده'], 'bought-product');
        $notBought = $this->product(['name' => 'محصول بدون خرید'], 'pending-product');

        $this->wishlistItem($customer, $bought);
        $this->wishlistItem($customer, $notBought);

        $this->orderWithProduct($customer, $bought, 'ORD-WL-STAT-001');

        $this->getJson('/api/v1/admin/wishlist/overview')
            ->assertOk()
            ->assertJsonPath('data.summary.converted_items', 1)
            ->assertJsonPath('data.summary.conversion_rate', 50);
    }

    public function test_wishlist_stats_are_limited_to_customers_permission(): void
    {
        $this->getJson('/api/v1/admin/wishlist/overview')->assertUnauthorized();

        $customer = $this->customer();
        $this->actingAs($customer)
            ->getJson('/api/v1/admin/wishlist/overview')
            ->assertForbidden();

        // مدیر محصولات مجوز customers.manage ندارد.
        $productManager = User::factory()->create([
            'role' => 'admin',
            'admin_role' => 'product_manager',
        ]);

        $this->actingAs($productManager)
            ->getJson('/api/v1/admin/wishlist/products')
            ->assertForbidden();

        // مدیر سفارش‌ها مجوز دارد.
        $orderManager = User::factory()->create([
            'role' => 'admin',
            'admin_role' => 'order_manager',
        ]);

        $this->actingAs($orderManager)
            ->getJson('/api/v1/admin/wishlist/overview')
            ->assertOk();
    }
}
