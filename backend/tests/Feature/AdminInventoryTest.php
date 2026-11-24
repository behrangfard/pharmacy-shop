<?php

namespace Tests\Feature;

use App\Models\AdminNotification;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\AdminRole;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/**
 * صفحهٔ «موجودی و انبار» پنل: آستانهٔ هشدار، شمارش انبار و اعلان موجودی کم.
 */
class AdminInventoryTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsAdmin(?string $role = null): User
    {
        $admin = User::factory()->create([
            'role' => 'admin',
            'admin_role' => $role ?? AdminRole::SUPER_ADMIN,
        ]);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function makeProduct(string $name, array $attributes = []): Product
    {
        $category = Category::query()->firstOrCreate(
            ['slug' => 'inventory-test-category'],
            ['name' => 'دستهٔ تست انبار', 'is_active' => true, 'sort_order' => 0]
        );

        return Product::query()->create($attributes + [
            'category_id' => $category->id,
            'name' => $name,
            'slug' => 'inventory-test-' . uniqid(),
            'sku' => 'INV-' . uniqid(),
            'price' => 120000,
            'stock' => 5,
            'is_active' => true,
        ]);
    }

    private function makeVariant(Product $product, string $name, int $stock, ?int $threshold = null): ProductVariant
    {
        return ProductVariant::query()->create([
            'product_id' => $product->id,
            'name' => $name,
            'sku' => 'INV-V-' . uniqid(),
            'price' => 120000,
            'stock' => $stock,
            'low_stock_threshold' => $threshold,
            'is_active' => true,
        ]);
    }

    public function test_inventory_endpoints_require_authentication(): void
    {
        $this->getJson('/api/v1/admin/inventory')->assertUnauthorized();
        $this->postJson('/api/v1/admin/inventory/stocktake')->assertUnauthorized();
        $this->postJson('/api/v1/admin/inventory/notify')->assertUnauthorized();
    }

    public function test_low_stock_list_uses_thresholds_and_fallback(): void
    {
        $this->actingAsAdmin();

        // زیر آستانهٔ پیش‌فرض (۵): باید بیاید.
        $low = $this->makeProduct('کرم کم‌موجودی', ['stock' => 3]);
        // آستانهٔ اختصاصی ۱ و موجودی ۲: نباید بیاید.
        $this->makeProduct('شامپو سالم', ['stock' => 2, 'low_stock_threshold' => 1]);
        // ناموجود: باید بیاید.
        $this->makeProduct('قرص ناموجود', ['stock' => 0]);
        // غیرفعال: نباید بیاید.
        $this->makeProduct('کالای غیرفعال', ['stock' => 1, 'is_active' => false]);

        $variant = $this->makeVariant($low, 'سایز M', 1);
        $this->makeVariant($low, 'سایز L', 9);

        $response = $this->getJson('/api/v1/admin/inventory?mode=low');

        $response->assertOk();

        $items = collect($response->json('data.items'));
        $kinds = $items->map(fn (array $row) => $row['kind'] . ':' . $row['id']);

        $this->assertSame(3, $response->json('data.meta.total'));
        $this->assertTrue($kinds->contains('product:' . $low->id));
        $this->assertTrue($kinds->contains('variant:' . $variant->id));

        $productRow = $items->first(
            fn (array $row) => $row['kind'] === 'product' && $row['id'] === $low->id
        );
        $this->assertSame(5, $productRow['threshold']);
        $this->assertSame(2, $productRow['shortfall']);
    }

    public function test_threshold_update_sets_and_clears_value(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('مایع ظرفشویی', ['stock' => 30]);

        $this->patchJson("/api/v1/admin/inventory/product/{$product->id}/threshold", [
            'threshold' => 12,
        ])->assertOk()
            ->assertJsonPath('data.item.threshold', 12)
            ->assertJsonPath('data.item.low_stock_threshold', 12);

        $this->assertSame(12, $product->fresh()->low_stock_threshold);

        // حذف آستانه = بازگشت به پیش‌فرض فروشگاه.
        $this->patchJson("/api/v1/admin/inventory/product/{$product->id}/threshold", [
            'threshold' => null,
        ])->assertOk()
            ->assertJsonPath('data.item.threshold', 5)
            ->assertJsonPath('data.item.low_stock_threshold', null);

        $this->assertNull($product->fresh()->low_stock_threshold);
    }

    public function test_threshold_update_rejects_invalid_values(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('دستمال کاغذی');

        $this->patchJson("/api/v1/admin/inventory/product/{$product->id}/threshold", [
            'threshold' => -1,
        ])->assertStatus(422);

        $this->assertNull($product->fresh()->low_stock_threshold);
    }

    public function test_stocktake_updates_stock_and_records_movement(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('ژله روغن بادام', ['stock' => 10]);

        $this->postJson('/api/v1/admin/inventory/stocktake', [
            'product_id' => $product->id,
            'counted_stock' => 7,
            'note' => 'شمارش پایان ماه',
        ])->assertOk()
            ->assertJsonPath('data.item.stock', 7)
            ->assertJsonPath('data.difference', -3);

        $this->assertSame(7, $product->fresh()->stock);

        $movement = StockMovement::query()
            ->where('product_id', $product->id)
            ->where('type', StockMovement::TYPE_STOCKTAKE)
            ->first();

        $this->assertNotNull($movement);
        $this->assertSame(-3, $movement->quantity);
        $this->assertSame(7, $movement->stock_after);
        $this->assertSame('شمارش پایان ماه', $movement->note);
    }

    public function test_stocktake_without_difference_records_no_movement(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('.band ، پنبهٔ گوش', ['stock' => 4]);

        $this->postJson('/api/v1/admin/inventory/stocktake', [
            'product_id' => $product->id,
            'counted_stock' => 4,
        ])->assertOk()
            ->assertJsonPath('data.difference', 0);

        $this->assertSame(0, StockMovement::query()->count());
    }

    public function test_stocktake_rejects_variant_of_other_product(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('کاندوم محافظ');
        $other = $this->makeProduct('محصول دیگر');
        $variant = $this->makeVariant($other, 'سایز M', 5);

        $this->postJson('/api/v1/admin/inventory/stocktake', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'counted_stock' => 3,
        ])->assertStatus(422);

        $this->assertSame(5, $variant->fresh()->stock);
    }

    public function test_stocktake_supports_variants(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('بند انداز');
        $variant = $this->makeVariant($product, 'سایز L', 2);

        $this->postJson('/api/v1/admin/inventory/stocktake', [
            'product_id' => $product->id,
            'variant_id' => $variant->id,
            'counted_stock' => 6,
        ])->assertOk()
            ->assertJsonPath('data.item.stock', 6)
            ->assertJsonPath('data.difference', 4);

        $this->assertSame(6, $variant->fresh()->stock);

        $movement = StockMovement::query()
            ->where('variant_id', $variant->id)
            ->where('type', StockMovement::TYPE_STOCKTAKE)
            ->first();

        $this->assertNotNull($movement);
        $this->assertSame(4, $movement->quantity);
    }

    public function test_notify_creates_low_stock_notification_once(): void
    {
        $this->actingAsAdmin();
        $product = $this->makeProduct('عینک آفتابی کودک', ['stock' => 2]);

        $first = $this->postJson('/api/v1/admin/inventory/notify')->assertOk();

        $first->assertJsonPath('data.created', true);
        $this->assertSame(1, $first->json('data.summary.total'));

        // اجرای دوم در بازهٔ خنک‌شدن: اعلان تازه ساخته نمی‌شود.
        $this->postJson('/api/v1/admin/inventory/notify')
            ->assertOk()
            ->assertJsonPath('data.created', false)
            ->assertJsonPath('data.reason', 'cooldown');

        $this->assertSame(1, AdminNotification::query()->count());

        // با force اعلان تازه ساخته می‌شود.
        $this->postJson('/api/v1/admin/inventory/notify?force=1')
            ->assertOk()
            ->assertJsonPath('data.created', true);

        $this->assertSame(2, AdminNotification::query()->count());

        $notification = AdminNotification::query()->first();
        $this->assertSame(AdminNotification::TYPE_LOW_STOCK, $notification->type);
        $this->assertSame('/admin/inventory', $notification->url);
    }

    public function test_notify_reports_empty_when_everything_is_stocked(): void
    {
        $this->actingAsAdmin();
        $this->makeProduct('محصول پر موجودی', ['stock' => 40]);

        $this->postJson('/api/v1/admin/inventory/notify')
            ->assertOk()
            ->assertJsonPath('data.created', false)
            ->assertJsonPath('data.reason', 'empty');

        $this->assertSame(0, AdminNotification::query()->count());
    }

    public function test_dashboard_includes_low_stock_summary(): void
    {
        $this->actingAsAdmin();
        $this->makeProduct('سشوار کم‌موجودی', ['stock' => 1]);
        $this->makeProduct('سشوار سالم', ['stock' => 50]);

        $this->getJson('/api/v1/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('data.low_stock.products', 1)
            ->assertJsonPath('data.low_stock.total', 1);
    }
}
