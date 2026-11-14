<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Cheque;
use App\Models\Expense;
use App\Models\Order;
use App\Models\Product;
use App\Models\PurchaseInvoice;
use App\Models\Supplier;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminAccountingTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    private function product(float $cost = 0, int $stock = 0): Product
    {
        $category = Category::query()->firstOrCreate(
            ['slug' => 'test-category'],
            ['name' => 'دستهٔ تست', 'is_active' => true]
        );

        return Product::create([
            'category_id' => $category->id,
            'name' => 'محصول تست',
            'slug' => 'test-product-'.uniqid(),
            'sku' => 'SKU-'.uniqid(),
            'price' => 2000,
            'cost_price' => $cost,
            'stock' => $stock,
            'is_active' => true,
        ]);
    }

    public function test_accounting_endpoints_are_protected(): void
    {
        $this->getJson('/api/v1/admin/accounting/overview')->assertStatus(401);

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->getJson('/api/v1/admin/accounting/overview')->assertStatus(403);
        $this->getJson('/api/v1/admin/accounting/suppliers')->assertStatus(403);
    }

    public function test_supplier_can_be_created_and_updated(): void
    {
        $this->admin();

        $response = $this->postJson('/api/v1/admin/accounting/suppliers', [
            'name' => 'پخش دارو ایران',
            'contact_name' => 'آقای رضایی',
            'phone' => '02188776655',
        ]);

        $response->assertCreated()->assertJsonPath('data.name', 'پخش دارو ایران');

        $supplier = Supplier::query()->firstOrFail();

        $this->putJson("/api/v1/admin/accounting/suppliers/{$supplier->id}", [
            'name' => 'پخش دارو ایران (جدید)',
            'is_active' => false,
        ])->assertOk()->assertJsonPath('data.is_active', false);

        $this->assertDatabaseHas('suppliers', [
            'id' => $supplier->id,
            'name' => 'پخش دارو ایران (جدید)',
        ]);
    }

    public function test_purchase_invoice_increases_stock_and_sets_cost_price(): void
    {
        $this->admin();

        $supplier = Supplier::create(['name' => 'تأمین‌کنندهٔ تست']);
        $product = $this->product();

        $response = $this->postJson('/api/v1/admin/accounting/purchase-invoices', [
            'supplier_id' => $supplier->id,
            'issued_at' => now()->toDateString(),
            'shipping_cost' => 200,
            'discount' => 0,
            'paid_amount' => 1000,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 10, 'unit_cost' => 1000],
                ['title' => 'کارتن بسته‌بندی', 'quantity' => 5, 'unit_cost' => 100],
            ],
        ]);

        $response->assertCreated();
        $response->assertJsonPath('data.items_total', '10500.00');
        $response->assertJsonPath('data.total', '10700.00');
        $response->assertJsonPath('data.payment_status', 'partial');
        $response->assertJsonPath('data.paid_amount', '1000.00');

        $product->refresh();
        $this->assertSame(10, (int) $product->stock);
        $this->assertEquals(1000, (float) $product->cost_price);
    }

    public function test_updating_invoice_recalculates_stock_and_deleting_reverses_it(): void
    {
        $this->admin();

        $product = $this->product(stock: 2);

        $payload = fn (int $quantity) => [
            'issued_at' => now()->toDateString(),
            'items' => [
                ['product_id' => $product->id, 'quantity' => $quantity, 'unit_cost' => 1500],
            ],
        ];

        $created = $this->postJson('/api/v1/admin/accounting/purchase-invoices', $payload(10));
        $created->assertCreated();

        $invoice = PurchaseInvoice::query()->firstOrFail();
        $this->assertSame(12, (int) $product->refresh()->stock);

        $this->putJson(
            "/api/v1/admin/accounting/purchase-invoices/{$invoice->id}",
            $payload(4)
        )->assertOk();

        $this->assertSame(6, (int) $product->refresh()->stock);

        $this->deleteJson("/api/v1/admin/accounting/purchase-invoices/{$invoice->id}")
            ->assertOk();

        $this->assertSame(2, (int) $product->refresh()->stock);
        $this->assertSame(0, PurchaseInvoice::query()->count());
    }

    public function test_expenses_and_cheques_can_be_managed(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/accounting/expenses', [
            'title' => 'کرایهٔ پیک',
            'category' => 'shipping',
            'amount' => 150000,
            'spent_at' => now()->toDateString(),
        ])->assertCreated();

        $expense = Expense::query()->firstOrFail();
        $this->assertEquals(150000, (float) $expense->amount);

        $this->putJson("/api/v1/admin/accounting/expenses/{$expense->id}", [
            'title' => 'کرایهٔ پیک (اصلاح)',
            'category' => 'shipping',
            'amount' => 160000,
            'spent_at' => now()->toDateString(),
        ])->assertOk();

        $this->assertDatabaseHas('expenses', ['id' => $expense->id, 'amount' => 160000]);

        $chequeResponse = $this->postJson('/api/v1/admin/accounting/cheques', [
            'direction' => 'paid',
            'amount' => 5000000,
            'due_date' => now()->addDays(10)->toDateString(),
            'bank_name' => 'ملت',
            'party_name' => 'پخش دارو',
        ]);

        $chequeResponse->assertCreated()->assertJsonPath('data.status', 'pending');

        $cheque = Cheque::query()->firstOrFail();

        $this->patchJson("/api/v1/admin/accounting/cheques/{$cheque->id}/status", [
            'status' => 'cleared',
        ])->assertOk()->assertJsonPath('data.status', 'cleared');

        $this->assertNotNull($cheque->refresh()->cleared_at);
    }

    public function test_profit_report_calculates_gross_and_net_profit(): void
    {
        $this->admin();

        $orders = $this->paidOrder(4000, 500);
        $orders->items()->create([
            'product_id' => $this->product()->id,
            'product_name' => 'محصول تست',
            'sku' => 'SKU-TEST',
            'quantity' => 2,
            'unit_price' => 2000,
            'cost_price' => 1000,
            'total_price' => 4000,
        ]);

        // باربری خرید و هزینهٔ دوره
        $product = $this->product();
        $this->postJson('/api/v1/admin/accounting/purchase-invoices', [
            'issued_at' => now()->toDateString(),
            'shipping_cost' => 200,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 10, 'unit_cost' => 1000],
            ],
        ])->assertCreated();

        $this->postJson('/api/v1/admin/accounting/expenses', [
            'title' => 'پیک ارسال',
            'category' => 'shipping',
            'amount' => 300,
            'spent_at' => now()->toDateString(),
        ])->assertCreated();

        $response = $this->getJson(
            '/api/v1/admin/accounting/report?from='.now()->toDateString().'&to='.now()->toDateString()
        );

        $response->assertOk();
        $response->assertJsonPath('data.sales.revenue', 4000);
        $response->assertJsonPath('data.costs.cogs', 2000);
        $response->assertJsonPath('data.costs.purchase_shipping', 200);
        $response->assertJsonPath('data.costs.expenses', 300);
        $response->assertJsonPath('data.profit.gross', 2000);
        $response->assertJsonPath('data.profit.net', 2000);

        $overview = $this->getJson('/api/v1/admin/accounting/overview');

        $overview->assertOk();
        $overview->assertJsonPath('data.inventory_value', 10000);
        $overview->assertJsonPath('data.supplier_debt', 10200);
    }

    private function paidOrder(float $subtotal, float $shipping): Order
    {
        $user = User::factory()->create(['role' => 'customer']);

        return Order::create([
            'user_id' => $user->id,
            'order_number' => 'ORD-TEST-'.uniqid(),
            'subtotal' => $subtotal,
            'shipping_cost' => $shipping,
            'discount' => 0,
            'coupon_discount' => 0,
            'tax_amount' => 0,
            'total' => $subtotal + $shipping,
            'status' => 'delivered',
            'payment_status' => 'paid',
            'recipient_name' => 'مشتری تست',
            'phone' => '09120000000',
            'address' => 'تهران',
        ]);
    }
}
