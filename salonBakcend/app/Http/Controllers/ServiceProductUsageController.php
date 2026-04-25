<?php

namespace App\Http\Controllers;

use App\Models\ServiceProductUsage;
use Illuminate\Http\Request;

class ServiceProductUsageController extends Controller
{
    public function serviceProductUsage($serviceId)
    {
        $serviceUsage = ServiceProductUsage::where('service_id', $serviceId)->get();
        return response()->json($serviceUsage);
    }
    
    public function addProductUsagePerService(Request $request)
    {
        $request->validate([
            'service_id' => ['required', 'numeric'],
            'product_id' => ['required', 'numeric'],
            'estimated_usage' => ['required', 'numeric']
        ]);

        ServiceProductUsage::create([
            'service_id' => $request->service_id,
            'product_id' => $request->product_id,
            'estimated_usage' => $request->estimated_usage
        ]);

        return response()->json([
            'message' => 'Product Usage Added Successfully'
        ], 200);
    }

    public function deleteProductFromUsage($id)
    {
        $productServiceUsage = serviceProductUsage::where('id', $id)->first();
        $productServiceUsage->delete();
        
        return response()->json([
            'message' => 'Product Usage Deleted Successfully'
        ], 200);
    }
}
