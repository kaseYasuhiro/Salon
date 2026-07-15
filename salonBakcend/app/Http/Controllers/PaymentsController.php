<?php

namespace App\Http\Controllers;

use App\Models\Payments;
use Illuminate\Http\Request;

class PaymentsController extends Controller
{
    public function displayPayments()
    {
        return Payments::get();
    }
}
