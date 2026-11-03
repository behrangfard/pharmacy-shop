<?php

namespace Tests\Feature;

use App\Models\ProductReview;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class ProductReviewTest extends TestCase
{
    use RefreshDatabase;

    private function createProduct(
        string $slug = 'review-test-product'
    ): int {
        $unique = uniqid();

        $categoryId = DB::table('categories')->insertGetId([
            'name' => 'دسته تست',
            'slug' => 'review-test-category-' . $unique,
            'is_active' => true,
            'sort_order' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return DB::table('products')->insertGetId([
            'category_id' => $categoryId,
            'name' => 'محصول تست',
            'slug' => $slug,
            'sku' => 'REVIEW-TEST-' . strtoupper($unique),
            'description' => 'توضیحات محصول تست',
            'price' => 100000,
            'stock' => 20,
            'is_active' => true,
            'is_featured' => false,
            'is_new' => false,
            'views_count' => 0,
            'sales_count' => 0,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function createOrder(
        int $userId,
        int $productId,
        array $attributes = []
    ): int {
        $orderId = DB::table('orders')->insertGetId(array_merge([
            'user_id' => $userId,
            'order_number' => 'TEST-' . uniqid(),
            'subtotal' => 100000,
            'shipping_cost' => 0,
            'discount' => 0,
            'total' => 100000,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'recipient_name' => 'کاربر تست',
            'phone' => '09120000000',
            'address' => 'آدرس تست',
            'postal_code' => '1234567890',
            'created_at' => now(),
            'updated_at' => now(),
        ], $attributes));

        DB::table('order_items')->insert([
            'order_id' => $orderId,
            'product_id' => $productId,
            'product_name' => 'محصول تست',
            'sku' => 'REVIEW-TEST-001',
            'quantity' => 1,
            'unit_price' => 100000,
            'total_price' => 100000,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $orderId;
    }

    public function test_customer_can_review_paid_and_delivered_product(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId
        );

        $response = $this->actingAs($customer)
            ->postJson('/api/v1/products/review-test-product/reviews', [
                'order_id' => $orderId,
                'rating' => 5,
                'title' => 'محصول عالی',
                'comment' => 'از کیفیت این محصول کاملاً راضی هستم.',
            ]);

        $response->assertCreated()
            ->assertJsonPath('success', true);

        $this->assertDatabaseHas('product_reviews', [
            'product_id' => $productId,
            'user_id' => $customer->id,
            'order_id' => $orderId,
            'rating' => 5,
            'status' => 'pending',
        ]);
    }

    public function test_customer_cannot_review_unpaid_order(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId,
            [
                'payment_status' => 'unpaid',
            ]
        );

        $response = $this->actingAs($customer)
            ->postJson('/api/v1/products/review-test-product/reviews', [
                'order_id' => $orderId,
                'rating' => 5,
                'comment' => 'نظر آزمایشی برای محصول',
            ]);

        $response->assertUnprocessable();

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_customer_cannot_review_undelivered_order(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId,
            [
                'status' => 'processing',
            ]
        );

        $response = $this->actingAs($customer)
            ->postJson('/api/v1/products/review-test-product/reviews', [
                'order_id' => $orderId,
                'rating' => 4,
                'comment' => 'نظر آزمایشی برای محصول',
            ]);

        $response->assertUnprocessable();

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_customer_cannot_review_product_not_in_order(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $productId = $this->createProduct();

        $otherProductId = $this->createProduct(
            'review-test-product-other'
        );

        $orderId = $this->createOrder(
            $customer->id,
            $otherProductId
        );

        $response = $this->actingAs($customer)
            ->postJson('/api/v1/products/review-test-product/reviews', [
                'order_id' => $orderId,
                'rating' => 5,
                'comment' => 'نظر آزمایشی برای محصول',
            ]);

        $response->assertUnprocessable();

        $this->assertDatabaseCount('product_reviews', 0);
    }

    public function test_customer_cannot_submit_duplicate_review_for_same_order_and_product(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId
        );

        ProductReview::create([
            'product_id' => $productId,
            'user_id' => $customer->id,
            'order_id' => $orderId,
            'rating' => 5,
            'title' => 'نظر اول',
            'comment' => 'این نظر قبلاً ثبت شده است.',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($customer)
            ->postJson('/api/v1/products/review-test-product/reviews', [
                'order_id' => $orderId,
                'rating' => 4,
                'comment' => 'تلاش برای ثبت نظر تکراری',
            ]);

        $response->assertUnprocessable();

        $this->assertDatabaseCount('product_reviews', 1);
    }

    public function test_public_product_reviews_only_show_approved_reviews(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId
        );

        ProductReview::create([
            'product_id' => $productId,
            'user_id' => $customer->id,
            'order_id' => $orderId,
            'rating' => 5,
            'title' => 'نظر تأییدشده',
            'comment' => 'این نظر باید در صفحه محصول نمایش داده شود.',
            'status' => 'approved',
            'approved_at' => now(),
        ]);

        $response = $this->getJson(
            '/api/v1/products/review-test-product/reviews'
        );

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1)
            ->assertJsonPath('data.average_rating', 5);
    }

    public function test_admin_can_list_and_filter_product_reviews(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId
        );

        ProductReview::create([
            'product_id' => $productId,
            'user_id' => $customer->id,
            'order_id' => $orderId,
            'rating' => 4,
            'title' => 'نظر در انتظار بررسی',
            'comment' => 'این نظر برای آزمایش پنل مدیریت است.',
            'status' => 'pending',
        ]);

        $response = $this->actingAs($admin)
            ->getJson('/api/v1/admin/reviews?status=pending');

        $response->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.total', 1);
    }

    public function test_admin_can_approve_review_and_reply(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $admin = User::factory()->create([
            'role' => 'admin',
        ]);

        $productId = $this->createProduct();

        $orderId = $this->createOrder(
            $customer->id,
            $productId
        );

        $review = ProductReview::create([
            'product_id' => $productId,
            'user_id' => $customer->id,
            'order_id' => $orderId,
            'rating' => 5,
            'title' => 'نظر مشتری',
            'comment' => 'محصول کیفیت بسیار خوبی دارد.',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->patchJson(
                "/api/v1/admin/reviews/{$review->id}/status",
                [
                    'status' => 'approved',
                ]
            )
            ->assertOk()
            ->assertJsonPath('data.status', 'approved');

        $this->assertDatabaseHas('product_reviews', [
            'id' => $review->id,
            'status' => 'approved',
        ]);

        $this->actingAs($admin)
            ->patchJson(
                "/api/v1/admin/reviews/{$review->id}/reply",
                [
                    'admin_reply' => 'از ثبت نظر شما سپاسگزاریم.',
                ]
            )
            ->assertOk();

        $this->assertDatabaseHas('product_reviews', [
            'id' => $review->id,
            'admin_reply' => 'از ثبت نظر شما سپاسگزاریم.',
        ]);
    }

    public function test_regular_customer_cannot_manage_product_reviews(): void
    {
        $customer = User::factory()->create([
            'role' => 'customer',
        ]);

        $response = $this->actingAs($customer)
            ->getJson('/api/v1/admin/reviews');

        $response->assertForbidden();
    }
}
