<?php

namespace App\Http\Controllers;

use App\Models\ServiceSpecialties;
use Illuminate\Http\Request;

class ServiceSpecialtiesController extends Controller
{
    public function addServiceSpecialty(Request $request)
    {
        $request->validate([
            'service_id' => ['required', 'numeric'],
            'specialty_id' => ['required', 'numeric']
        ]);

        ServiceSpecialties::create([
            'service_id' => $request->service_id,
            'specialty_id' => $request->specialty_id
        ]);

        return response()->json([
            'message' => 'Service Specialty Added Successfully'
        ], 200);
    }
}
