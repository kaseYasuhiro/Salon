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
            'title' => 'Low Stock Alert',
            'message' => "{$this->product->name} is running low ({$this->product->stock} left).",
            'stock' => $this->product->stock,
            'threshold' => $this->product->low_stock_threshold,
        ];
    }
}