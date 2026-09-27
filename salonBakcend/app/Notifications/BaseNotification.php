<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Notification;
use Illuminate\Notifications\Messages\BroadcastMessage;

abstract class BaseNotification extends Notification implements ShouldQueue
{
    use Queueable;

    /**
     * All notifications go to database + broadcast.
     */
    public function via($notifiable): array
    {
        return ['database', 'broadcast'];
    }

    /**
     * Override in child classes — must return an array.
     */
    abstract public function toArray($notifiable): array;

    /**
     * Broadcast payload — reuses toArray by default.
     */
    public function toBroadcast($notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->toArray($notifiable));
    }
}