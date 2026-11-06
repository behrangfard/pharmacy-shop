<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Storage;

Route::get('/', function () {
    return response()->json([
        'success' => true,
        'message' => 'آرسن شاپ',
    ]);
});

/*
|--------------------------------------------------------------------------
| سرو فایل‌های دیسک public
|--------------------------------------------------------------------------
|
| فایل‌های بارگذاری‌شده (محصولات، بنرها، کاور مقالات) در
| storage/app/public ذخیره می‌شوند و معمولاً با symlink «public/storage»
| سرو می‌شوند. در ویندوز ساخت این symlink همیشه موفق نیست و در آن حالت
| آدرس /storage/... خطای 404 می‌دهد و تصویر بنر/محصول نمایش داده نمی‌شود.
|
| این مسیر فقط زمانی اجرا می‌شود که فایل واقعی در public/storage نباشد
| (وب‌سرور ابتدا فایل‌های موجود را مستقیم سرو می‌کند)، بنابراین روی
| محیط‌هایی که symlink درست دارند هیچ هزینه‌ای ندارد.
|
*/
Route::get('/storage/{path}', function (string $path) {
    abort_if(str_contains($path, '..') || str_contains($path, "\0"), 404);

    $disk = Storage::disk('public');

    abort_unless($disk->exists($path), 404);

    return response()->file($disk->path($path));
})->where('path', '.*')->name('storage.file');
