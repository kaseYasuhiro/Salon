<?php

namespace App\Http\Controllers;

use App\Models\Test;
use Illuminate\Http\Request;

class TestController extends Controller
{
    public function fetchUser($id)
    {
        $test = Test::where('id', $id)->first();
        return response()->json($test);
    }

    public function createUser(Request $request) 
    {
        $request->validate([
            'first_name' => ['required', 'string'],
            'last_name' => ['required', 'string'],
            'email' => ['required', 'string'],
            'password' => ['required', 'string'],
            'phone_number' => ['required', 'string'],
            'role' => ['required', 'string']
        ]);

        Test::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => $request->password,
            'phone_number' => $request->phone_number,
            'role' => $request->role
        ]);

        return response()->json([
            'message' => 'User Created Sucessfully'
        ], 200);
    }

}
