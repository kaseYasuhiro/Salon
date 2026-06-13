<?php

use App\Http\Controllers\UserController;
use App\Http\Controllers\ServicesController;
use App\Http\Controllers\JoinedController;
use App\Http\Controllers\ServiceProductUsageController;
use App\Http\Controllers\ProductsController;
use App\Http\Controllers\AppointmentsController;
use App\Http\Controllers\TransactionController;
use App\Http\Controllers\StaffSpecialtiesController;
use App\Http\Controllers\SpecialtiesController;
use App\Http\Controllers\ServiceSpecialtiesController;
use App\Http\Controllers\StaffSchedulesController;
use App\Http\Controllers\BusinessSchedulesController;
use App\Http\Controllers\AssignStaffController;
use App\Http\Controllers\FeedbackController;
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

    //owner side
    Route::post('/service/add', [ServicesController::class, 'addService']);
    Route::post('/services/update/{id}', [ServicesController::class, 'updateService']);
    Route::post('/services/delete/{id}', [ServicesController::class, 'deleteService']);

    Route::get('/employees', [UserController::class, 'getEmployees']);
    Route::post('/employees/update/{id}', [UserController::class, 'updateEmployee']);
    Route::post('/employees/delete/{id}', [UserController::class, 'deleteEmployee']);
    Route::post('/employees/specialty/add', [StaffSpecialtiesController::class, 'addStaffSpecialty']);
    Route::get('/employee/specialties', [JoinedController::class, 'staffWithSpecialties']);

    Route::get('/feedbacks', [JoinedController::class, 'viewFeedbacks']);

    Route::get('/inventory', [JoinedController::class, 'invDisplay']);
    Route::post('/inventory/add' , [JoinedController::class, 'addProductsToInventory']);
    Route::post('/inventory/update', [JoinedController::class, 'updateProductsOnInventory']);
    Route::post('/inventory/delete', [JoinedController::class, 'deleteProductsFromInventory']);

    Route::get('/service/usage', [JoinedController::class, 'serviceWithUsages']);
    Route::post('/service/usage/add', [ServiceProductUsageController::class, 'addProductUsagePerService']);
    Route::get('/service/usage/{serviceId}', [ServiceProductUsageController::class, 'serviceProductUsage']);
    Route::post('/service/usage/delete/{id}', [ServiceProductUsageController::class, 'deleteProductFromUsage']);
    Route::post('/services/specialty/add', [ServiceSpecialtiesController::class, 'addServiceSpecialty']);
    Route::get('/services/specialties', [JoinedController::class, 'serviceWithSpecialties']);
    Route::get('/products', [ProductsController::class, 'displayProducts']);

    Route::get('/all-appointments', [JoinedController::class, 'allAppointments']);
    Route::put('/appointments/update/{id}', [JoinedController::class, 'updateAppointment']);
    Route::get('/staff', [JoinedController::class, 'getStaff']);

    Route::post('/specialty/add', [SpecialtiesController::class, 'addSpecialty']);
    Route::get('/specialties', [SpecialtiesController::class, 'displaySpecialties']);

    Route::post('/daysched/add', [BusinessSchedulesController::class, 'addDateSchedule']);
    Route::get('/daysched', [BusinessSchedulesController::class, 'displayBusinessSchedules']);

    Route::get('/assign', [JoinedController::class, 'assignedStaffSchedules']);


    //customer side
    Route::get('/appointments', [JoinedController::class, 'userAppointments']);
    Route::get('/services', [ServicesController::class, 'services']);
    Route::get('/services/usages', [JoinedController::class, 'serviceWithUsage']);
    Route::post('/booking/complete', [JoinedController::class, 'completeBooking']);
    Route::get('/staff-list', [JoinedController::class, 'staffList']);
    Route::post('/feedbacks/submit', [FeedbackController::class, 'submitFeedback']);
    Route::post('/user/{id}/password', [UserController::class, 'updatePassword']);

    

    //staff side
    Route::get('/staff/{staffId}/appointments', [JoinedController::class, 'getStaffAppointments']);
    Route::put('/staff/transaction/{transactionId}/status', [JoinedController::class, 'updateTransactionStatus']);
    Route::put('/staff/transaction/{transactionId}/complete', [JoinedController::class, 'completeService']);
    Route::put('/staff/transaction/{transactionId}/update', [JoinedController::class, 'updateServiceWithInventory']);
    Route::get('/service/{serviceId}/product-usages', [JoinedController::class, 'getServiceProductUsages']);
    Route::get('/test/service/{serviceId}/product-usages', [JoinedController::class, 'testServiceProductUsages']);
    Route::post('/assign/add', [AssignStaffController::class, 'staffAssignment']);
});











 




