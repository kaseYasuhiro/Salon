<?php

namespace App\Http\Controllers;


use App\Models\User;
use Hash;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;


class UserController extends Controller
{
    public function user (Request $request)
    {
        return $request->user();
    }

    public function register (Request $request)
    {
        $request->validate([
            'first_name' => ['required', 'string'],
            'last_name' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'unique:users,email'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'phone_number' => ['required', 'string'],
            'role' => ['required', 'string']
        ]);

        User::create([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'phone_number' => $request->phone_number,
            'role' => $request->role
        ]);

        return response()->json([
            'message' => 'User Registered successfully'
        ], 200);
    }

    public function login(Request $request) 
    {
        $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required']
        ]);

        $user = User::where('email', $request->email)->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['message' => 'Credentials Provided are Incorrect.'], 422);
        }

        // Check if email is verified
        if (!$user->email_verified_at) {
            return response()->json([
                'message' => 'Please verify your email address before logging in.',
                'error_code' => 'EMAIL_NOT_VERIFIED',
                'email' => $user->email
            ], 403);
        }

        $token = $user->createToken('token')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => [
                'id' => $user->id,
                'first_name' => $user->first_name,
                'last_name' => $user->last_name,
                'email' => $user->email,
                'phone_number' => $user->phone_number,
                'role' => $user->role,
                'profile_image' => $user->profile_image,
            ],
            'message' => 'Login Successful.'
        ], 200);
    }

    public function logout(Request $request)
    {
        $user = $request->user();

        $user->currentAccessToken()->delete();

        return response()->json([
            'message' => 'Logout Successful.'
        ], 200);
    }

    public function getEmployees(Request $request)
    {
        $employees = User::whereIn('role', ['staff'])->get();
        return response()->json($employees);
    }

    public function updateEmployee(Request $request, $id)
    {
        $request->validate([
            'first_name' => ['required', 'string'],
            'last_name' => ['required', 'string'],
            'email' => ['required', 'string', 'email', 'unique:users,email,' . $id],
            'phone_number' => ['required', 'string'],
            'role' => ['required', 'string']
        ]);

        // Fix: Find employee by ID, not by role
        $employee = User::findOrFail($id);
        
        // Optional: Only allow updating employees (not admins/owners)
        if (in_array($employee->role, ['customer', 'owner'])) {
            return response()->json(['message' => 'Cannot update customer or owner'], 403);
        }

        $employee->update([
            'first_name' => $request->first_name,
            'last_name' => $request->last_name,
            'email' => $request->email,
            'phone_number' => $request->phone_number,
            'role' => $request->role,
        ]);

        return response()->json([
            'message' => 'Employee Updated Successfully',
            'employee' => $employee
        ], 200);
    }

    public function deleteEmployee($id)
    {
        // Fix: Find employee by ID, not by role
        $employee = User::findOrFail($id);
        
        // Optional: Prevent deleting admins or owners
        if (in_array($employee->role, ['customer', 'owner'])) {
            return response()->json(['message' => 'Cannot delete customer or owner'], 403);
        }
        
        $employee->delete();

        return response()->json([
            'message' => 'Employee Deleted Successfully'
        ], 200);
    }

    public function updatePassword(Request $request, $id)
    {
        $request->validate([
            'password' => ['required', 'confirmed', Password::defaults()]
        ]);

        $user = User::findOrFail($id);

        $user->update([
            'password' => Hash::make($request->password)
        ]);

        return response()->json([
            'message' => 'Password updated successfully'
        ], 200);
    }

    public function addProfileImage(Request $request, $id)
    {
        // Find the target user
        $user = User::find($id);

        if (!$user) {
            return response()->json(['message' => 'User not found'], 404);
        }

        // Validate
        $request->validate([
            'profile_image' => ['required', 'image', 'mimes:jpg,jpeg,png', 'max:4096']
        ]);

        // (Optional) Delete the old image file if one exists
        if ($user->profile_image) {
            $oldPath = str_replace('/storage/', '', $user->profile_image);
            \Storage::disk('public')->delete($oldPath);
        }

        // Store the new image
        $imagePath = $request->file('profile_image')->store('users', 'public');

        // ✅ UPDATE, don't CREATE
        $user->profile_image = $imagePath;
        $user->save();

        return response()->json([
            'message' => 'Profile Image Added Successfully',
            'profile_image' => $imagePath
        ], 200);
    }

    public function updateImage(Request $request, $id)
    {
        $user_id = $request->user()->id;

        $request->validate([
            'profile_image' => ['required', 'image', 'mimes:jpg, jpeg, png']
        ]);

        $image_url = $request->file('profile_image')->store('users', 'public');


        User::update([
            'profile_image' => $image_url
        ]);

        return response()->json([
            'message' => 'Profile Image Updated Successfully'
        ], 200);
    }

    public function updateNumber(Request $request, $id)
    {
        $user_id = $request->user()->id;

        $request->validate([
            'phone_number' => ['required', 'numeric']
        ]);

        // Fix: Find the user and update using the instance
        $user = User::find($id);
        if (!$user) {
            return response()->json([
                'message' => 'User not found'
            ], 404);
        }

        $user->update([
            'phone_number' => $request->phone_number
        ]);

        return response()->json([
            'message' => 'Phone Number Updated Successfully'
        ], 200);
    }
}
