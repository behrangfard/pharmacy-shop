<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('articles', function (Blueprint $table) {
            $table->id();

            $table->string('title');
            $table->string('slug')->unique();

            $table->string('excerpt', 500)->nullable();
            $table->longText('content');

            $table->string('cover_image', 2048)->nullable();
            $table->string('category', 60)->nullable();
            $table->string('author_name', 120)->nullable();

            // انتشار: هم is_published لازم است و هم رسیدن published_at
            $table->boolean('is_published')->default(false);
            $table->timestamp('published_at')->nullable();

            $table->unsignedSmallInteger('reading_minutes')->default(1);

            $table->timestamps();

            $table->index(['is_published', 'published_at']);
            $table->index('category');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('articles');
    }
};
