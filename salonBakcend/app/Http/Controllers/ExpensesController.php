<?php

namespace App\Http\Controllers;

use App\Models\Expenses;
use Illuminate\Http\Request;

class ExpensesController extends Controller
{
    public function addExpense(Request $request)
    {
        $request->validate([
            'expense_name' => ['required', 'string'],
            'amount' => ['required', 'numeric'],
            'expense_date' => ['required', 'date', 'date_format:Y-m-d'],
            'description' => ['required', 'string'],
            'recorded_by' => ['required', 'numeric']
        ]);

        Expenses::create([
           'expense_name' => $request->expense_name,
           'amount' => $request->amount,
           'expense_date' => $request->expense_date,
           'description' => $request->description,
           'recorded_by' => $request->recorded_by 
        ]);

        return response()->json([
            'message' => 'Expense Added Successfully'
        ], 200);
    }
}
