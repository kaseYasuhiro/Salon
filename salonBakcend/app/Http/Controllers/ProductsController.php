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
            'is_active' => ['required', 'boolean'],
            'product_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'] // Optional image validation
        ]);

        // Handle product image upload
        $productImagePath = null;
        if ($request->hasFile('product_image')) {
            $file = $request->file('product_image');
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('product_images', $filename, 'public');
            $productImagePath = '/storage/' . $path;
        }

        Products::create([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit,
            'is_active' => $request->is_active,
            'product_image' => $productImagePath // Store the image path
        ]);

        return response()->json([
            'message' => 'Product Added Successfully'
        ], 200);
    }

    public function updateProduct(Request $request, $id)
    {
        $request->validate([
            'product_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'unit' => ['required', 'string'],
            'unit_size' => ['required', 'numeric'],
            'estimated_usages_per_unit' => ['required', 'numeric'],
            'is_active' => ['required', 'boolean'],
            'product_image' => ['nullable', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048'] // Optional image validation
        ]);

        $product = Products::findOrFail($id);

        // Handle product image upload
        $productImagePath = $product->product_image; // Keep existing image by default
        if ($request->hasFile('product_image')) {
            // Delete old image if exists
            if ($product->product_image) {
                $oldImagePath = public_path(str_replace('/storage/', '', $product->product_image));
                if (file_exists($oldImagePath)) {
                    unlink($oldImagePath);
                }
            }
            
            $file = $request->file('product_image');
            $filename = time() . '_' . uniqid() . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('product_images', $filename, 'public');
            $productImagePath = '/storage/' . $path;
        }

        $product->update([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit,
            'is_active' => $request->is_active,
            'product_image' => $productImagePath
        ]);

        return response()->json([
            'message' => 'Product Updated Successfully',
            'product' => $product
        ], 200);
    }

    public function deleteProductImage($id)
    {
        $product = Products::findOrFail($id);
        
        if ($product->product_image) {
            $imagePath = public_path(str_replace('/storage/', '', $product->product_image));
            if (file_exists($imagePath)) {
                unlink($imagePath);
            }
            $product->update(['product_image' => null]);
            
            return response()->json([
                'message' => 'Product image deleted successfully'
            ], 200);
        }
        
        return response()->json([
            'message' => 'No product image found'
        ], 404);
    }
}
