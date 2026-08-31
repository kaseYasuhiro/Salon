<?php

namespace App\Http\Controllers;

use App\Models\ServiceHairColors;
use Illuminate\Http\Request;

class ServiceHairColorsController extends Controller
{
    

    public function addAvailableColors(Request $request)
    {
        $request->validate([
            'service_id' => ['required', 'numeric'],
            'hair_color_id' => ['required', 'numeric']
        ]);

        ServiceHairColors::create([
            'service_id' => $request->service_id,
            'hair_color_id' => $request->hair_color_id
        ]);

        return response()->json([
            'message' => 'Color Added Successfully'
        ], 200);
    }
}
