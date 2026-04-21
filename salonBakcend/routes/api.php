<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\ServicesController;
use App\Http\Controllers\JoinedController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('guest')->group(function() {
    Route::post('/register', [UserController::class, 'register']);
    Route::post('/login', [UserController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('user', [UserController::class, 'user']);
    Route::post('/logout', [UserController::class, 'logout']);
});

Route::get('/services', [ServicesController::class, 'services']);
Route::post('/service/add', [ServicesController::class, 'addService']);
Route::post('/services/update/{id}', [ServicesController::class, 'updateService']);
Route::post('/services/delete/{id}', [ServicesController::class, 'deleteService']);

Route::get('/employees', [UserController::class, 'getEmployees']);
Route::post('/employees/update/{id}', [UserController::class, 'updateEmployee']);
Route::post('/employees/delete/{id}', [UserController::class, 'deleteEmployee']);