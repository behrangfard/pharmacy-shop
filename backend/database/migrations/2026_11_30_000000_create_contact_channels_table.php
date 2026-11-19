<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * کانال‌های ارتباطی فروشگاه (تلگرام، واتساپ، بله، ایتا، اینستاگرام).
 *
 * هر کانال دو لینک مستقل دارد:
 *   - join_url: عضویت در کانال/دنبال‌کردن صفحهٔ فروشگاه
 *   - chat_url: ارسال پیام مستقیم به اکانت فروشگاه
 *
 * این لینک‌ها در بخش «همراه ما باشید» صفحه‌های ثبت‌نام و حساب کاربری نمایش
 * داده می‌شوند و کامل از پنل مدیران (/admin/channels) مدیریت می‌شوند. پنج
 * ردیف پایه اینجا ساخته می‌شوند تا پنل از ابتدا فهرست کاملی داشته باشد؛ تا
 * وقتی مدیر لینکی وارد نکند، آن کانال روی سایت دیده نمی‌شود.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contact_channels', function (Blueprint $table) {
            $table->id();

            /** شناسهٔ ثابت پلتفرم؛ هم‌نام با کلیدهای App\Support\ContactLinks. */
            $table->string('key', 32)->unique();

            /** عنوان نمایشی روی سایت (قابل ویرایش از پنل). */
            $table->string('title', 80);

            /** توضیح کوتاه زیر عنوان. */
            $table->string('description', 255)->nullable();

            /** لینک عضویت در کانال/صفحه. */
            $table->string('join_url', 2048)->nullable();

            /** برچسب دکمهٔ عضویت؛ خالی یعنی متن پیش‌فرض فرانت‌اند. */
            $table->string('join_label', 60)->nullable();

            /** لینک ارسال پیام به اکانت فروشگاه. */
            $table->string('chat_url', 2048)->nullable();

            /** برچسب دکمهٔ ارسال پیام؛ خالی یعنی متن پیش‌فرض فرانت‌اند. */
            $table->string('chat_label', 60)->nullable();

            $table->unsignedInteger('sort_order')->default(0);

            /** کانال غیرفعال در فروشگاه دیده نمی‌شود ولی حذف نمی‌شود. */
            $table->boolean('is_active')->default(true);

            $table->timestamps();

            /** فهرست فروشگاه همیشه با «فعال + ترتیب» خوانده می‌شود. */
            $table->index(['is_active', 'sort_order']);
        });

        $now = now();

        DB::table('contact_channels')->insert([
            [
                'key' => 'telegram',
                'title' => 'تلگرام',
                'description' => 'عضویت در کانال تلگرام یا گفتگوی مستقیم با فروشگاه',
                'sort_order' => 10,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'whatsapp',
                'title' => 'واتس‌اپ',
                'description' => 'عضویت در کانال واتس‌اپ یا ارسال پیام به شمارهٔ فروشگاه',
                'sort_order' => 20,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'bale',
                'title' => 'بله',
                'description' => 'کانال بله و گفتگوی مستقیم با پشتیبانی فروشگاه',
                'sort_order' => 30,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'eitaa',
                'title' => 'ایتا',
                'description' => 'کانال ایتا و ارتباط مستقیم با فروشگاه',
                'sort_order' => 40,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
            [
                'key' => 'instagram',
                'title' => 'اینستاگرام',
                'description' => 'صفحهٔ اینستاگرام فروشگاه و ارسال پیام مستقیم',
                'sort_order' => 50,
                'is_active' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('contact_channels');
    }
};
