<?php

namespace App\Http\Controllers;

use App\Models\HairColors;
use Illuminate\Http\Request;

class HairColorsController extends Controller
{
    public function displayHairColors()
    {
        return HairColors::get();
    }


    public function addHairColor(Request $request)
    {
        $request->validate([
            'color_name' => ['required', 'string', 'max:255'],
            'color_code' => ['required', 'string', 'regex:/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/'],
        ]);

        $color = HairColors::create([
            'color_name' => $request->color_name,
            'color_code' => $request->color_code,
            'is_active' => 1,
        ]);

        return response()->json([
            'message' => 'Hair color added successfully',
            'data' => $color,
        ], 201);
    }

    public function addAvailableColors(Request $request)
    {
        $request->validate([
            'service_id' => ['required', 'numeric'],
            'hair_color_ids' => ['required', 'array'],
            'hair_color_ids.*' => ['required', 'numeric']
        ]);
        
        foreach ($request->hair_color_ids as $colorId) {
            ServiceHairColors::create([
                'service_id' => $request->service_id,
                'hair_color_id' => $colorId
            ]);
        }
        
        return response()->json(['message' => 'Hair colors added successfully']);
    }

    public function updateHairColor(Request $request, $id)
    {
        $request->validate([
            'color_name' => ['required', 'string'],
            'color_code' => ['required', 'string'],
            'is_active' => ['required', 'boolean']
        ]);

        $hairColor = HairColors::where('id', $id)->first();

        $hairColor->update([
            'color_name' => $request->color_name,
            'color_code' => $request->color_code,
            'is_active' => $request->is_active
        ]);

        return response()->json([
            'message' => 'Hair Color Updated Successfully'
        ], 200);
    }

    
}
