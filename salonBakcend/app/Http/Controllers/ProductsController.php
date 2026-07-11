<?php

namespace App\Http\Controllers;

use App\Models\Products;
use Illuminate\Http\Request;

class ProductsController extends Controller
{
    public function displayProducts()
    {
        $products = Products::get();
        return response()->json($products);
    }

    public function addProduct(Request $request)
    {
        $request->validate([
            'product_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'unit' => ['required', 'string'],
            'unit_size' => ['required', 'numeric'],
            'estimated_usages_per_unit' => ['required', 'numeric'],
            'is_active' => ['required', 'boolean']
        ]);

        Products::create([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit,
            'is_active' => $request->is_active
        ]);

        return response()->json([
            'message' => 'Product Added Successfully'
        ], 200);
    }
}
