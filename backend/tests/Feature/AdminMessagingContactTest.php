<?php

namespace Tests\Feature;

use App\Models\MessagingContact;
use App\Models\OutboundMessage;
use App\Models\User;
use App\Support\Spreadsheet\XlsxWriter;
use App\Support\Spreadsheet\ZipWriter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Http;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdminMessagingContactTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'messaging.audience_limit' => 50,
            'messaging.timeout' => 5,
            'messaging.channels.sms.enabled' => true,
            'messaging.channels.sms.driver' => 'kavenegar',
            'messaging.channels.sms.api_key' => 'sms-test-key',
            'messaging.channels.sms.sender' => '10004346',
            'messaging.channels.sms.base_url' => 'https://api.kavenegar.com',
        ]);
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);

        Sanctum::actingAs($admin);

        return $admin;
    }

    /**
     * @param  list<list<mixed>>  $rows
     */
    private function spreadsheet(array $rows): UploadedFile
    {
        return UploadedFile::fake()->createWithContent(
            'contacts.xlsx',
            XlsxWriter::build([['name' => 'مخاطبین', 'rows' => $rows]])
        );
    }

    private function wordDocument(string ...$paragraphs): UploadedFile
    {
        $body = '';

        foreach ($paragraphs as $paragraph) {
            $body .= '<w:p><w:r><w:t>'.$paragraph.'</w:t></w:r></w:p>';
        }

        $xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            .'<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            .'<w:body>'.$body.'</w:body></w:document>';

        return UploadedFile::fake()->createWithContent(
            'contacts.docx',
            ZipWriter::create(['word/document.xml' => $xml])
        );
    }

    public function test_contact_endpoints_are_protected(): void
    {
        $this->getJson('/api/v1/admin/messaging/contacts')->assertStatus(401);

        Sanctum::actingAs(User::factory()->create(['role' => 'customer']));

        $this->getJson('/api/v1/admin/messaging/contacts')->assertStatus(403);
        $this->postJson('/api/v1/admin/messaging/contacts/import', [])->assertStatus(403);
    }

    public function test_manual_contact_is_normalized_and_duplicates_are_rejected(): void
    {
        $this->admin();

        $this->postJson('/api/v1/admin/messaging/contacts', [
            'name' => 'مریم احمدی',
            'phone' => '+98 912 123 4567',
            'group_name' => 'مشتریان VIP',
        ])->assertCreated()->assertJsonPath('data.phone', '09121234567');

        $this->postJson('/api/v1/admin/messaging/contacts', [
            'phone' => '09121234567',
        ])->assertStatus(422);

        $this->postJson('/api/v1/admin/messaging/contacts', [
            'phone' => '12345',
        ])->assertStatus(422);

        $this->assertSame(1, MessagingContact::query()->count());
    }

    public function test_excel_import_is_previewed_then_committed(): void
    {
        $this->admin();

        $file = fn () => $this->spreadsheet([
            ['نام', 'شماره موبایل', 'گروه'],
            ['مریم احمدی', '09121234567', 'مشتریان VIP'],
            ['رضا کریمی', '0935 123 4567', 'باشگاه مشتریان'],
            ['شماره غلط', '12345', ''],
            ['تکرار مریم', '09121234567', ''],
        ]);

        $preview = $this->post('/api/v1/admin/messaging/contacts/import', [
            'file' => $file(),
            'dry_run' => true,
        ], ['Accept' => 'application/json']);

        $preview->assertOk();
        $preview->assertJsonPath('data.summary.create', 2);
        $preview->assertJsonPath('data.summary.errors', 1);
        $preview->assertJsonPath('data.summary.duplicate', 1);
        $preview->assertJsonPath('data.dry_run', true);

        $this->assertSame(0, MessagingContact::query()->count());

        $commit = $this->post('/api/v1/admin/messaging/contacts/import', [
            'file' => $file(),
            'dry_run' => false,
        ], ['Accept' => 'application/json']);

        $commit->assertOk();
        $this->assertSame(2, MessagingContact::query()->count());
        $this->assertDatabaseHas('messaging_contacts', [
            'phone' => '09351234567',
            'name' => 'رضا کریمی',
            'group_name' => 'باشگاه مشتریان',
        ]);
    }

    public function test_reimport_updates_existing_contact_instead_of_creating_duplicate(): void
    {
        $this->admin();

        MessagingContact::create(['phone' => '09121234567', 'name' => 'نام قدیمی']);

        $response = $this->post('/api/v1/admin/messaging/contacts/import', [
            'file' => $this->spreadsheet([
                ['نام', 'شماره موبایل', 'گروه'],
                ['نام جدید', '09121234567', 'گروه تازه'],
            ]),
            'dry_run' => false,
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.summary.update', 1);

        $this->assertSame(1, MessagingContact::query()->count());
        $this->assertDatabaseHas('messaging_contacts', [
            'phone' => '09121234567',
            'name' => 'نام جدید',
            'group_name' => 'گروه تازه',
        ]);
    }

    public function test_word_document_numbers_are_extracted(): void
    {
        $this->admin();

        $response = $this->post('/api/v1/admin/messaging/contacts/import', [
            'file' => $this->wordDocument(
                'لیست مشتریان باشگاه',
                'سارا محمدی ۰۹۱۲۳۴۵۶۷۸۹',
                'حسین رضایی - 0098 935 111 2233',
                'شماره دفتر: 02188776655'
            ),
            'dry_run' => false,
            'group' => 'باشگاه مشتریان',
        ], ['Accept' => 'application/json']);

        $response->assertOk();
        $response->assertJsonPath('data.summary.create', 3);

        $this->assertDatabaseHas('messaging_contacts', [
            'phone' => '09123456789',
            'group_name' => 'باشگاه مشتریان',
        ]);
        $this->assertDatabaseHas('messaging_contacts', [
            'phone' => '09351112233',
            'group_name' => 'باشگاه مشتریان',
        ]);
        $this->assertDatabaseHas('messaging_contacts', ['phone' => '02188776655']);

        $contact = MessagingContact::query()->where('phone', '09123456789')->firstOrFail();
        $this->assertSame('سارا محمدی', $contact->name);
    }

    public function test_groups_endpoint_returns_counts(): void
    {
        $this->admin();

        MessagingContact::create(['phone' => '09120000001', 'group_name' => 'A']);
        MessagingContact::create(['phone' => '09120000002', 'group_name' => 'A']);
        MessagingContact::create(['phone' => '09120000003']);

        $response = $this->getJson('/api/v1/admin/messaging/contacts/groups');

        $response->assertOk();
        $response->assertJsonPath('data.total', 3);
        $response->assertJsonPath('data.groups.0.name', 'A');
        $response->assertJsonPath('data.groups.0.count', 2);
    }

    public function test_send_to_contacts_audience_uses_saved_numbers(): void
    {
        $this->admin();

        MessagingContact::create(['phone' => '09120000001', 'group_name' => 'VIP']);
        MessagingContact::create(['phone' => '09120000002', 'group_name' => 'عادی']);

        Http::fake([
            'api.kavenegar.com/*' => Http::response([
                'return' => ['status' => 200, 'message' => 'تایید شد'],
            ]),
        ]);

        $response = $this->postJson('/api/v1/admin/messaging/send', [
            'channel' => 'sms',
            'body' => 'پیام تست مخاطبین',
            'audience' => 'contacts',
            'group' => 'VIP',
        ]);

        $response->assertOk();
        $response->assertJsonPath('data.sent', 1);

        $this->assertDatabaseHas('outbound_messages', [
            'recipient' => '09120000001',
            'status' => OutboundMessage::STATUS_SENT,
        ]);
        $this->assertDatabaseMissing('outbound_messages', [
            'recipient' => '09120000002',
        ]);
    }
}
