<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * صفحات ثابت سایت (درباره ما، تماس با ما، قوانین و ...).
 *
 * این صفحات از بخش «مدیریت محتوا» در پنل مدیران نوشته می‌شوند و در مسیر
 * /pages/{slug} فروشگاه نمایش داده می‌شوند. لینک صفحاتی که
 * show_in_footer دارند در فوتر سایت هم می‌آید.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pages', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('slug', 180)->unique();
            $table->string('excerpt', 500)->nullable();
            $table->longText('content');
            $table->boolean('is_published')->default(false);
            $table->boolean('show_in_footer')->default(true);
            $table->unsignedSmallInteger('sort_order')->default(0);
            $table->string('seo_title')->nullable();
            $table->string('seo_description', 500)->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();

            $table->index(['is_published', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pages');
    }
};
