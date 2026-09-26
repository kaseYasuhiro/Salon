<?php

namespace App\Http\Controllers;

use App\Models\WalkInTransaction;
use Illuminate\Http\Request;

class WalkInTransactionController extends Controller
{
   public function addWalkInTransaction(Request $request)
   {
        $request->validate([
            'walkin_id' => ['required', 'numeric'],
            'inventory_id' => ['required', 'numeric'],
            'quantity_change' => ['required', 'numeric']
        ]);

        WalkInTransaction::create([
            'walkin_id' => $request->walkin_id,
            'inventory_id' => $request->inventory_id,
            'quantity_change' => $request->quantity_change
        ]);

        return response()->json([
            'message' => 'Walk In Transaction Recorded Successfully'
        ], 200);
   }
}
