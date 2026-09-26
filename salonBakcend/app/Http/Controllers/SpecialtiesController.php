<?php

namespace App\Http\Controllers;

use App\Models\Specialties;
use Illuminate\Http\Request;

class SpecialtiesController extends Controller
{
   public function addSpecialty(Request $request)
   {
        $request->validate([
            'specialty_name' => ['required', 'string']
        ]);

        Specialties::create([
            'specialty_name' => $request->specialty_name
        ]);

        return response()->json([
            'message' => 'Specialty Added Successfully'
        ], 200);
   }

   public function displaySpecialties()
   {
        $specialty = Specialties::get();
        return response()->json($specialty);
   }
}
