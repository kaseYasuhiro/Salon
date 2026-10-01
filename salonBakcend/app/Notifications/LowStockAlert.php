<?php

namespace App\Notifications;

use App\Models\Products;

class LowStockAlert extends BaseNotification
{
    public function __construct(public Products $product) {}

    public function toArray($notifiable): array
    {
        return [
            'type' => 'low_stock',
            'product_id' => $this->product->id,
            'product_name' => $this->product->product_name,
            'title' => 'Low Stock Alert',
            'message' => "{$this->product->product_name} is running low on stock.",
        ];
    }
}