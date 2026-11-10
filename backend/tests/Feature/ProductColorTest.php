<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Order;
use App\Models\Product;
use App\Models\ProductColor;
use App\Models\ProductPackItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * رنگ محصول و رنگ اجزای پک.
 *
 * مشتری باید بتواند رنگ لباس را انتخاب کند و برای محصولات پک، رنگ هر قطعه
 * را جداگانه بگذارد؛ انتخاب او در سفارش ذخیره می‌شود.
 */
class ProductColorTest extends TestCase
{
    use RefreshDatabase;

    private Category $category;

    private int $orderCounter = 0;

    protected function setUp(): void
    {
        parent::setUp();

        $this->category = Category::query()->create([
            'name' => 'Color Test Category',
            'slug' => 'color-test-category',
            'is_active' => true,
            'sort_order' => 0,
        ]);
    }

    private function makeProduct(array $attributes = []): Product
    {
        static $counter = 0;
        $counter++;

        return Product::query()->create(array_merge([
            'category_id' => $this->category->id,
            'name' => 'Color Test Product '.$counter,
            'slug' => 'color-test-product-'.$counter,
            'sku' => 'COLOR-TEST-'.$counter,
            'price' => 250000,
            'stock' => 10,
            'discount_percent' => 0,
            'is_active' => true,
            'is_taxable' => false,
        ], $attributes));
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function productPayload(array $overrides = []): array
    {
        static $counter = 0;
        $counter++;

        return array_merge([
            'category_id' => $this->category->id,
            'name' => 'Admin Color Product '.$counter,
            'sku' => 'ADMIN-COLOR-'.$counter,
            'price' => 320000,
            'stock' => 8,
            'is_active' => true,
        ], $overrides);
    }

    private function actingAsAdmin(): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function actingAsCustomer(): User
    {
        $customer = User::factory()->create([
            'role' => 'user',
        ]);

        Sanctum::actingAs($customer);

        return $customer;
    }

    /**
     * ثبت سفارش با کلید یکتای تازه.
     *
     * @param  array<int, array<string, mixed>>  $items
     */
    private function placeOrder(array $items)
    {
        $this->orderCounter++;

        $key = sprintf(
            '550e8400-e29b-41d4-a716-44665544%04d',
            $this->orderCounter
        );

        return $this
            ->withHeader('Idempotency-Key', $key)
            ->postJson('/api/v1/orders', [
                'recipient_name' => 'Test Buyer',
                'phone' => '09120000000',
                'address' => 'Test address',
                'postal_code' => '1234567890',
                'notes' => null,
                'items' => $items,
            ]);
    }

    public function test_admin_can_create_product_with_colors_and_pack_items(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/products', $this->productPayload([
            'colors' => [
                ['name' => 'مشکی', 'hex' => '#111111', 'is_active' => true],
                ['name' => 'سفید', 'hex' => '#ffffff', 'is_active' => true],
            ],
            'pack_items' => [
                ['name' => 'شورت اول', 'quantity' => 2, 'colors' => ['مشکی', 'سفید']],
                ['name' => 'شورت دوم', 'quantity' => 1, 'colors' => ['سفید']],
            ],
        ]));

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $productId = $response->json('data.id');

        $this->assertDatabaseHas('product_colors', [
            'product_id' => $productId,
            'name' => 'مشکی',
            'hex' => '#111111',
        ]);

        $this->assertDatabaseHas('product_pack_items', [
            'product_id' => $productId,
            'name' => 'شورت اول',
            'quantity' => 2,
        ]);

        $packItem = ProductPackItem::query()
            ->where('product_id', $productId)
            ->where('name', 'شورت دوم')
            ->first();

        $this->assertSame(['سفید'], $packItem->colors);
    }

    public function test_admin_update_replaces_color_palette(): void
    {
        $this->actingAsAdmin();

        $first = $this->postJson('/api/v1/admin/products', $this->productPayload([
            'colors' => [
                ['name' => 'مشکی', 'hex' => '#111111'],
                ['name' => 'بژ', 'hex' => '#d9c7a7'],
            ],
        ]));

        $first->assertCreated();

        $productId = $first->json('data.id');

        $keptColor = ProductColor::query()
            ->where('product_id', $productId)
            ->where('name', 'مشکی')
            ->firstOrFail();

        $response = $this->putJson('/api/v1/admin/products/'.$productId, [
            'colors' => [
                ['id' => $keptColor->id, 'name' => 'مشکی', 'hex' => '#000000'],
                ['name' => 'سرمه‌ای', 'hex' => '#1e293b'],
            ],
        ]);

        $response->assertOk();

        $this->assertSame(
            ['مشکی', 'سرمه‌ای'],
            ProductColor::query()
                ->where('product_id', $productId)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->pluck('name')
                ->all()
        );

        $this->assertDatabaseHas('product_colors', [
            'id' => $keptColor->id,
            'hex' => '#000000',
        ]);

        $this->assertDatabaseMissing('product_colors', [
            'product_id' => $productId,
            'name' => 'بژ',
        ]);
    }

    public function test_pack_item_color_must_belong_to_product_palette(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/products', $this->productPayload([
            'colors' => [
                ['name' => 'مشکی', 'hex' => '#111111'],
            ],
            'pack_items' => [
                ['name' => 'شورت اول', 'quantity' => 1, 'colors' => ['قرمز']],
            ],
        ]));

        $response->assertStatus(422);

        $this->assertDatabaseCount('product_pack_items', 0);
    }

    public function test_duplicate_color_names_are_rejected(): void
    {
        $this->actingAsAdmin();

        $response = $this->postJson('/api/v1/admin/products', $this->productPayload([
            'colors' => [
                ['name' => 'مشکی', 'hex' => '#111111'],
                ['name' => 'مشکی', 'hex' => '#222222'],
            ],
        ]));

        $response->assertStatus(422);

        $this->assertDatabaseCount('product_colors', 0);
    }

    public function test_public_product_page_exposes_only_active_colors(): void
    {
        $product = $this->makeProduct();

        ProductColor::query()->create([
            'product_id' => $product->id,
            'name' => 'مشکی',
            'hex' => '#111111',
            'is_active' => true,
        ]);

        ProductColor::query()->create([
            'product_id' => $product->id,
            'name' => 'قرمز',
            'hex' => '#dc2626',
            'is_active' => false,
        ]);

        ProductPackItem::query()->create([
            'product_id' => $product->id,
            'name' => 'شورت اول',
            'quantity' => 1,
            'colors' => ['مشکی'],
        ]);

        $response = $this->getJson('/api/v1/products/'.$product->slug);

        $response->assertOk()
            ->assertJsonCount(1, 'data.colors')
            ->assertJsonPath('data.colors.0.name', 'مشکی')
            ->assertJsonCount(1, 'data.pack_items')
            ->assertJsonPath('data.pack_items.0.name', 'شورت اول');
    }

    public function test_order_requires_color_when_product_has_palette(): void
    {
        $product = $this->makeProduct();

        ProductColor::query()->create([
            'product_id' => $product->id,
            'name' => 'مشکی',
            'hex' => '#111111',
            'is_active' => true,
        ]);

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            ['product_id' => $product->id, 'quantity' => 1],
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_rejects_color_outside_palette(): void
    {
        $product = $this->makeProduct();

        ProductColor::query()->create([
            'product_id' => $product->id,
            'name' => 'مشکی',
            'hex' => '#111111',
            'is_active' => true,
        ]);

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'color_name' => 'سبز',
            ],
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_order_stores_selected_color(): void
    {
        $product = $this->makeProduct();

        ProductColor::query()->create([
            'product_id' => $product->id,
            'name' => 'مشکی',
            'hex' => '#111111',
            'is_active' => true,
        ]);

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'color_name' => 'مشکی',
            ],
        ]);

        $response->assertSuccessful();

        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'color_name' => 'مشکی',
        ]);
    }

    public function test_order_can_contain_two_colors_of_same_product(): void
    {
        $product = $this->makeProduct([
            'stock' => 5,
        ]);

        foreach (['مشکی', 'سفید'] as $name) {
            ProductColor::query()->create([
                'product_id' => $product->id,
                'name' => $name,
                'hex' => $name === 'مشکی' ? '#111111' : '#ffffff',
                'is_active' => true,
            ]);
        }

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            ['product_id' => $product->id, 'quantity' => 1, 'color_name' => 'مشکی'],
            ['product_id' => $product->id, 'quantity' => 1, 'color_name' => 'سفید'],
        ]);

        $response->assertSuccessful();

        $this->assertDatabaseCount('order_items', 2);
        $this->assertSame(3, $product->fresh()->stock);
    }

    public function test_pack_order_requires_color_for_each_piece(): void
    {
        $product = $this->makeProduct();

        ProductColor::query()->create([
            'product_id' => $product->id,
            'name' => 'مشکی',
            'hex' => '#111111',
            'is_active' => true,
        ]);

        foreach (['شورت اول', 'شورت دوم'] as $pieceName) {
            ProductPackItem::query()->create([
                'product_id' => $product->id,
                'name' => $pieceName,
                'quantity' => 1,
                'colors' => ['مشکی'],
            ]);
        }

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'pack_colors' => [
                    ['name' => 'شورت اول', 'color' => 'مشکی'],
                ],
            ],
        ]);

        $response->assertStatus(422);

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_pack_order_stores_colors_of_each_piece(): void
    {
        $product = $this->makeProduct();

        foreach (['مشکی', 'سفید'] as $name) {
            ProductColor::query()->create([
                'product_id' => $product->id,
                'name' => $name,
                'hex' => $name === 'مشکی' ? '#111111' : '#ffffff',
                'is_active' => true,
            ]);
        }

        foreach (['شورت اول', 'شورت دوم'] as $pieceName) {
            ProductPackItem::query()->create([
                'product_id' => $product->id,
                'name' => $pieceName,
                'quantity' => 1,
                'colors' => ['مشکی', 'سفید'],
            ]);
        }

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            [
                'product_id' => $product->id,
                'quantity' => 1,
                'pack_colors' => [
                    ['name' => 'شورت اول', 'color' => 'مشکی'],
                    ['name' => 'شورت دوم', 'color' => 'سفید'],
                ],
            ],
        ]);

        $response->assertSuccessful();

        $item = Order::query()->firstOrFail()->items()->firstOrFail();

        $this->assertSame([
            ['name' => 'شورت اول', 'color' => 'مشکی'],
            ['name' => 'شورت دوم', 'color' => 'سفید'],
        ], $item->pack_colors);
    }

    public function test_product_without_colors_still_accepts_orders(): void
    {
        $product = $this->makeProduct();

        $this->actingAsCustomer();

        $response = $this->placeOrder([
            ['product_id' => $product->id, 'quantity' => 1],
        ]);

        $response->assertSuccessful();

        $this->assertDatabaseHas('order_items', [
            'product_id' => $product->id,
            'color_name' => null,
            'pack_colors' => null,
        ]);
    }
}
