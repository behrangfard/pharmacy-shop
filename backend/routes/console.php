<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

/*
|--------------------------------------------------------------------------
| تبریک تولد خودکار (پیامک/سایر کانال‌ها)
|--------------------------------------------------------------------------
|
| هر ۱۵ دقیقه اجرا می‌شود؛ خودِ کامند بررسی می‌کند که تبریک در پنل فعال باشد،
| ساعت تنظیم‌شده رسیده باشد و امروز تلاشی انجام نشده باشد. بنابراین مدیر
| می‌تواند ساعت ارسال را بدون تغییر این فایل عوض کند.
|
| روی سرور، کرونِ `* * * * * php artisan schedule:run` را فعال کنید.
|
*/
Schedule::command('birthday:greetings')
    ->everyFifteenMinutes()
    ->withoutOverlapping();

