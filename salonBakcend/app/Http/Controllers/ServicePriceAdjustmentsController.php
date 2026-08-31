<?php

namespace App\Http\Controllers;

use App\Models\ServicePriceAdjustments;
use Illuminate\Http\Request;

class ServicePriceAdjustmentsController extends Controller
{
    public function displayAdjustments()
    {
        return ServicePriceAdjustments::get();
    }
}
