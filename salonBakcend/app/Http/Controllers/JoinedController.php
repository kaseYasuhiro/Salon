<?php

namespace App\Http\Controllers;
use App\Models\Products;
use App\Models\ServiceProductUsage;
use App\Models\Inventory;
use App\Models\Services;
use Illuminate\Http\Request;

class JoinedController extends Controller
{
    public function serviceWithUsages()
    {
        return Services::with('ServiceProductUsage')->get();
    }

    public function invDisplay()
    {
        return Inventory::with('Products')->get();
    }

    public function usageWithPoducts()
    {
        return ServiceProductUsage::with('Products')->get();
    }

    public function addProductsToInventory(Request $request)
    {
        $request->validate([
            'product_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'unit' => ['required', 'string'],
            'unit_size' => ['required', 'string'],
            'estimated_usages_per_unit' => ['required', 'numeric'],

            'product_quantity' => ['required', 'numeric'],
            'current_usages' => ['required', 'numeric'],
            'reorder_level' => ['required', 'numeric'],
            'expiration_date' => ['required', 'date', 'date_format:m/d/Y']
        ]);

        Products::create([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit
        ]);
        
        Inventory::create([
            'product_quantity' => $request->product_quantity,
            'current_usages' => $request->current_usages,
            'reorder_level' => $request->reorder_level,
            'expiration_date' => $request->expiration_date
        ]);

        return response()->json([
            'message' => "Product Added to Inventory."
        ], 200);
    }

    public function updateProductsOnInventory(Request $request, $id)
    {
        $request->validate([
            'product_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'unit' => ['required', 'string'],
            'unit_size' => ['required', 'string'],
            'estimated_usages_per_unit' => ['required', 'numeric'],

            'product_quantity' => ['required', 'numeric'],
            'current_usages' => ['required', 'numeric'],
            'reorder_level' => ['required', 'numeric'],
            'expiration_date' => ['required', 'date', 'date_format:m/d/Y']
        ]);

        $product = Products::where('id', $id)->first();
        $inventory = Inventory::where('id', $id)->first();

        $product->update([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit
        ]);

        $inventory->update([
            'product_quantity' => $request->product_quantity,
            'current_usages' => $request->current_usages,
            'reorder_level' => $request->reorder_level,
            'expiration_date' => $request->expiration_date
        ]);

        return response()->json([
            'message' => 'Inventory Updated Successfully'
        ], 200);
    }
}
