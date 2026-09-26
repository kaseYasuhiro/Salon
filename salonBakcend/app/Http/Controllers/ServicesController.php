<?php

namespace App\Http\Controllers;

use App\Models\Services;
use App\Models\ServiceProductUsage;
use App\Models\ServicePriceAdjustments;
use Illuminate\Http\Request;

class ServicesController extends Controller
{
    public function services(Request $request)
    {
        $services = Services::get();
        return response()->json($services);
    }

    public function selectedService($id)
    {
        $services = Services::where('id', $id)->first();
        return response()->json($services);
    }

    public function addService(Request $request)
    {
        $request->validate([
            'service_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric'],
            'duration_minutes' => ['required', 'numeric'],
            'is_multitaskable' => ['required', 'boolean'],
            'reqHairColor' => ['required', 'boolean'],
            'service_status' => ['required', 'string'],
            'price_adjustments' => ['required', 'array', 'min:1'],
            'price_adjustments.*.hair_length' => ['required', 'string', 'in:short,medium,long'],
            'price_adjustments.*.hair_thickness' => ['required', 'string', 'in:thin,medium,thick'],
            'price_adjustments.*.additional_price' => ['required', 'numeric', 'min:0']
        ]);

        // First, create the service
        $service = Services::create([
            'service_name' => $request->service_name,
            'description' => $request->description,
            'price' => $request->price,
            'duration_minutes' => $request->duration_minutes,
            'is_multitaskable' => $request->is_multitaskable,
            'reqHairColor' => $request->reqHairColor,
            'service_status' => $request->service_status
        ]);

        // Then, create all price adjustments
        foreach ($request->price_adjustments as $adjustment) {
            ServicePriceAdjustments::create([
                'service_id' => $service->id,
                'hair_length' => $adjustment['hair_length'],
                'hair_thickness' => $adjustment['hair_thickness'],
                'additional_price' => $adjustment['additional_price']
            ]);
        }

        return response()->json([
            'message' => 'Service Added Successfully',
            'service' => $service,
            'price_adjustments_count' => count($request->price_adjustments)
        ], 200);
    }

    public function updateService(Request $request)
    {
        $request->validate([
            'service_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric'],
            'duration_minutes' => ['required', 'numeric'],
            'is_multitaskable' => ['required', 'boolean'],
            'reqHairColor' => ['nullable', 'boolean'],
            'service_status' => ['required', 'string'],
            'price_adjustments' => ['nullable', 'array'],
            'price_adjustments.*.hair_length' => ['required', 'string', 'in:short,medium,long'],
            'price_adjustments.*.hair_thickness' => ['required', 'string', 'in:thin,medium,thick'],
            'price_adjustments.*.additional_price' => ['required', 'numeric', 'min:0'],
        ]);

        $service = Services::where('id', $request->id)->first();

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        // Update the main service
        $service->update([
            'service_name' => $request->service_name,
            'description' => $request->description,
            'price' => $request->price,
            'duration_minutes' => $request->duration_minutes,
            'is_multitaskable' => $request->is_multitaskable,
            'reqHairColor' => $request->reqHairColor,
            'service_status' => $request->service_status  
        ]);

        // Handle price adjustments - delete existing and create new ones
        if ($request->has('price_adjustments')) {
            // Delete all existing price adjustments for this service
            ServicePriceAdjustments::where('service_id', $service->id)->delete();
            
            // Create new price adjustments
            foreach ($request->price_adjustments as $adjustment) {
                ServicePriceAdjustments::create([
                    'service_id' => $service->id,
                    'hair_length' => $adjustment['hair_length'],
                    'hair_thickness' => $adjustment['hair_thickness'],
                    'additional_price' => $adjustment['additional_price']
                ]);
            }
        }

        return response()->json([
            'message' => 'Service Updated Successfully'
        ], 200);
    }

    public function deleteService(Request $request)
    {
        $request->validate([
            'id' => ['required', 'numeric']
        ]);

        $service = Services::where('id', $request->id)->first();
        
        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }
        
        $service->delete();

        return response()->json([
            'message' => 'Service Deleted Successfully'
        ], 200);
    }
}
