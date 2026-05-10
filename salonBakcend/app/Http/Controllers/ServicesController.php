<?php

namespace App\Http\Controllers;

use App\Models\Services;
use App\Models\ServiceProductUsage;
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
            'service_status' => ['required', 'string']
        ]);

        Services::create([
            'service_name' => $request->service_name,
            'description' => $request->description,
            'price' => $request->price,
            'duration_minutes' => $request->duration_minutes,
            'is_multitaskable' => $request->is_multitaskable,
            'service_status' => $request->service_status
        ]);

        return response()->json([
            'message' => 'Service Added Successfully'
        ], 200);
    }

    public function updateService(Request $request)
    {
        

        $request->validate([
            'id' => ['required', 'numeric'],
            'service_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'price' => ['required', 'numeric'],
            'duration_minutes' => ['required', 'numeric'],
            'is_multitaskable' => ['required', 'string'],
            'service_status' => ['required', 'string']
        ]);

        $service = Services::where('id', $request->id)->first();

        if (!$service) {
            return response()->json(['message' => 'Service not found'], 404);
        }

        $service->update([
            'service_name' => $request->service_name,
            'description' => $request->description,
            'price' => $request->price,
            'duration_minutes' => $request->duration_minutes,
            'is_multitaskable' => $request->is_multitaskable,
            'service_status' => $request->service_status  
        ]);

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
