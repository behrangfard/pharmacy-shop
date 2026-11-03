<?php

namespace App\Services\Messaging\Drivers;

class TelegramDriver extends AbstractBotApiDriver
{
    public function channel(): string
    {
        return 'telegram';
    }

    protected function configKey(): string
    {
        return 'telegram';
    }

    protected function defaultApiUrl(): string
    {
        return 'https://api.telegram.org';
    }
}
