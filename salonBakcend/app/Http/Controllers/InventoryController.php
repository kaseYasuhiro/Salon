<?php

namespace App\Http\Controllers;

use App\Models\Inventory;
use Illuminate\Http\Request;

class InventoryController extends Controller
{
    public function inventoryRestock(Request $request, $id)
    {
        $request->validate([
            'product_id' => ['required', 'numeric'],
            'product_quantity' => ['required', 'numeric'],
        ]);

        $inventory = Inventory::where('id', $id)->first();

        $inventory->update([
            'product_id' => $request->product_id,
            'product_quantity' => $request->product_quantity + $request->product_quantity,
        ]);

        return response()->json([
            'message' => "Product Successfully Restocked"
        ], 200);
    }

    public function addStocks(Request $request)
    {
        $request->validate([
            'product_id' => ['required', 'numeric'],
            'product_quantity' => ['required', 'numeric'],
            'current_usages' => ['required', 'numeric'],
            'reorder_level' => ['required', 'numeric'],
            'expiration_date' => ['required', 'date', 'date_format:Y-m-d']
        ]);

        Inventory::create([
            'product_id' => $request->product_id,
            'product_quantity' => $request->product_quantity,
            'current_usages' => $request->current_usages,
            'reorder_level' => $request->reorder_level,
            'expiration_date' => $request->expiration_date
        ]);

        return response()->json([
            'message' => 'Stocks Added Successfully'
        ], 200);
    }
}
