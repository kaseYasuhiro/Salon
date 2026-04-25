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
}
