<?php

namespace App\Http\Controllers;

use App\Models\WalkinAuthorization;
use Illuminate\Http\Request;

class WalkinAuthorizationController extends Controller
{
    public function authorizeStaff(Request $request)
    {
        $request->validate([
            'staff_id' => ['required', 'numeric'],
            'isAuthorizedForWalkin' => ['required', 'boolean']
        ]);

        WalkinAuthorization::create([
            'staff_id' => $request->staff_id,
            'isAuthorizedForWalkin' => $request->isAuthorizedForWalkin
        ]);

        return response()->json([
            'message' => 'Staff Authorized Successfully'
        ], 200);
    }

    public function updateAuthorization(Request $request, $id)
    {
        $request->validate([
            'staff_id' => ['required', 'numeric'],
            'isAuthorizedForWalkin' => ['required', 'boolean']
        ]);

        $authorize = WalkinAuthorization::where('id', $id)->first();

        $authorize->update([
            'staff_id' => $request->staff_id,
            'isAuthorizedForWalkin' => $request->isAuthorizedForWalkin
        ]);

        return response()->json([
            'message' => 'Walk-in Authorization Updated Successfully'
        ], 200);
    }
}
