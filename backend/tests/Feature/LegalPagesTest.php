<?php

namespace Tests\Feature;

use App\Models\Page;
use App\Models\StoreSetting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * صفحات رسمی/اعتماد فروشگاه (درباره ما، تماس، قوانین، حریم خصوصی، مرجوعی).
 */
class LegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_command_installs_five_published_pages(): void
    {
        $this->artisan('pages:legal')->assertSuccessful();

        $this->assertSame(5, Page::query()->count());

        foreach (Page::query()->get() as $page) {
            $this->assertTrue($page->is_published);
            $this->assertTrue($page->show_in_footer);
            // هر صفحه دست‌کم یک متغیر تنظیمات فروشگاه دارد که هنگام نمایش پر می‌شود.
            $this->assertMatchesRegularExpression('/\{\{[a-z_]+\}\}/', $page->content);
        }

        $this->assertNotNull(Page::query()->where('slug', 'about')->first());
        $this->assertNotNull(Page::query()->where('slug', 'contact')->first());
        $this->assertNotNull(Page::query()->where('slug', 'terms')->first());
        $this->assertNotNull(Page::query()->where('slug', 'privacy')->first());
        $this->assertNotNull(Page::query()->where('slug', 'returns')->first());
    }

    public function test_command_is_idempotent(): void
    {
        $this->artisan('pages:legal')->assertSuccessful();
        $this->artisan('pages:legal')->assertSuccessful();

        $this->assertSame(5, Page::query()->count());
    }

    public function test_command_keeps_manual_edits_unless_forced(): void
    {
        Page::query()->create([
            'title' => 'درباره ما',
            'slug' => 'about',
            'content' => 'متن سفارشی مدیر',
            'is_published' => true,
        ]);

        $this->artisan('pages:legal')->assertSuccessful();

        $this->assertSame(
            'متن سفارشی مدیر',
            Page::query()->where('slug', 'about')->value('content')
        );

        $this->artisan('pages:legal', ['--force' => true])->assertSuccessful();

        $content = (string) Page::query()->where('slug', 'about')->value('content');

        $this->assertStringContainsString('## ما کی هستیم؟', $content);
    }

    public function test_public_endpoint_renders_store_setting_placeholders(): void
    {
        StoreSetting::setValue('store_phone', '021-12345678');
        StoreSetting::setValue('return_policy_days', '5');
        StoreSetting::forgetCache();

        $this->artisan('pages:legal')->assertSuccessful();

        $contact = $this->getJson('/api/v1/pages/contact')
            ->assertOk()
            ->assertJsonPath('success', true)
            ->json('data');

        $this->assertStringContainsString('021-12345678', $contact['content']);
        $this->assertStringNotContainsString('{{store_phone}}', $contact['content']);

        $returns = $this->getJson('/api/v1/pages/returns')
            ->assertOk()
            ->json('data');

        $this->assertStringContainsString('5 روز پس از تحویل', $returns['content']);
    }

    public function test_published_legal_pages_are_listed_for_the_footer(): void
    {
        $this->artisan('pages:legal')->assertSuccessful();

        $pages = $this->getJson('/api/v1/pages')
            ->assertOk()
            ->assertJsonCount(5, 'data')
            ->json('data');

        foreach ($pages as $page) {
            $this->assertTrue($page['show_in_footer']);
        }
    }
}
