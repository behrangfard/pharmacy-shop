<?php

namespace App\Services\Messaging\Drivers;

/**
 * پیام‌رسان بله (Bale) — API آن با Bot API تلگرام سازگار است:
 * https://tapi.bale.ai/bot{token}/sendMessage
 */
class BaleDriver extends AbstractBotApiDriver
{
    public function channel(): string
    {
        return 'bale';
    }

    protected function configKey(): string
    {
        return 'bale';
    }

    protected function defaultApiUrl(): string
    {
        return 'https://tapi.bale.ai';
    }
}
