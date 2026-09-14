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
use App\Http\Controllers\StaffFeedbackController;
use App\Http\Controllers\RemittanceController;
use App\Http\Controllers\EmployeeCommissionController;
use App\Http\Controllers\IncidentReportsController;
use App\Http\Controllers\InventoryController;
use App\Http\Controllers\WalkInController;
use App\Http\Controllers\WalkInTransactionController;
use App\Http\Controllers\WalkinAuthorizationController;
use App\Http\Controllers\PaymentsController;
use App\Http\Controllers\HairColorsController;
use App\Http\Controllers\RefundsController;
use App\Http\Controllers\ServiceHairColorsController;
use App\Http\Controllers\ExpensesController;
use App\Http\Controllers\OTPController;
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
    route::get('/feedbacks/staff', [JoinedController::class, 'displayStaffReviews']);
    Route::get('/inventory', [JoinedController::class, 'invDisplay']);
    Route::post('/inventory/add' , [InventoryController::class, 'addStocks']);  
    Route::post('/inventory/update/{id}', [InventoryController::class, 'inventoryRestock']);
    Route::post('/inventory/delete', [JoinedController::class, 'deleteProductsFromInventory']);
    Route::get('/inventory/transactions', [JoinedController::class, 'inventoryTransactions']);
    Route::get('/walk-in/transaction', [JoinedController::class, 'displayWalkinTransactions']);
    Route::get('/service/usage', [JoinedController::class, 'serviceWithUsages']);
    Route::post('/service/usage/add', [ServiceProductUsageController::class, 'addProductUsagePerService']);
    Route::get('/service/usage/{serviceId}', [ServiceProductUsageController::class, 'serviceProductUsage']);
    Route::post('/service/usage/delete/{id}', [ServiceProductUsageController::class, 'deleteProductFromUsage']);
    Route::post('/services/specialty/add', [ServiceSpecialtiesController::class, 'addServiceSpecialty']);
    Route::get('/services/specialties', [JoinedController::class, 'serviceWithSpecialties']);
    Route::get('/products', [ProductsController::class, 'displayProducts']);
    Route::post('/products/add', [ProductsController::class, 'addProduct']);
    Route::post('/products/update/{id}', [ProductsController::class, 'updateProduct']);
    Route::get('/all-appointments', [JoinedController::class, 'allAppointments']);
    Route::put('/appointments/update/{id}', [JoinedController::class, 'updateAppointment']);
    Route::get('/staff', [JoinedController::class, 'getStaff']);
    Route::post('/specialty/add', [SpecialtiesController::class, 'addSpecialty']);
    Route::get('/specialties', [SpecialtiesController::class, 'displaySpecialties']);
    Route::post('/daysched/add', [BusinessSchedulesController::class, 'addDateSchedule']);
    Route::get('/daysched', [BusinessSchedulesController::class, 'displayBusinessSchedules']);
    Route::get('/assign', [JoinedController::class, 'assignedStaffSchedules']);
    Route::get('/remittance', [JoinedController::class, 'remittanceReport']);
    Route::post('/employee/commission/add', [EmployeeCommissionController::class, 'addCommission']);
    Route::post('/report/update/{id}', [IncidentReportsController::class, 'updateIncidentReport']);
    Route::get('/report', [JoinedController::class, 'displayIncidentReports']);
    Route::post('/walk-in/staff/auth', [WalkinAuthorizationController::class, 'authorizeStaff']);
    Route::get('/walk-in/staff', [JoinedController::class, 'authorizedStaff']);
    Route::post('/walk-in/staff/auth/update/{id}', [WalkinAuthorizationController::class, 'updateAuthorization']);
    Route::get('/appointment/payment', [JoinedController::class, 'billWithPayment']);

    Route::post('/services/update-all', [JoinedController::class, 'updateServiceDetails']);
    Route::post('/employees/update-all', [JoinedController::class, 'updateEmployeeDetails']);


    //customer side
    Route::get('/appointments', [JoinedController::class, 'userAppointments']);
    Route::get('/services', [ServicesController::class, 'services']);
    Route::get('/services/usages', [JoinedController::class, 'serviceWithUsage']);
    Route::post('/booking/complete', [JoinedController::class, 'completeBooking']);
    Route::get('/staff-list', [JoinedController::class, 'staffList']);
    Route::post('/feedbacks/submit', [FeedbackController::class, 'submitFeedback']);
    Route::post('/user/{id}/password', [UserController::class, 'updatePassword']);
    Route::post('/user/{id}/phone', [UserController::class, 'updateNumber']);
    Route::post('/feedbacks/staff/submit', [StaffFeedbackController::class, 'submitStaffFeedback']);
    Route::post('/payment/remaining', [JoinedController::class, 'remainingBalancePayment']);
    
    


    //staff side
    Route::get('/staff/{staffId}/appointments', [JoinedController::class, 'getStaffAppointments']);
    // Route::put('/staff/transaction/{transactionId}/status', [JoinedController::class, 'updateTransactionStatus']);
    Route::put('/staff/transaction/{transactionId}/complete', [JoinedController::class, 'completeService']);
    Route::put('/staff/transaction/{transactionId}/update', [JoinedController::class, 'updateServiceWithInventory']);
    Route::get('/service/{serviceId}/product-usages', [JoinedController::class, 'getServiceProductUsages']);
    Route::get('/test/service/{serviceId}/product-usages', [JoinedController::class, 'testServiceProductUsages']);
    Route::post('/assign/add', [AssignStaffController::class, 'staffAssignment']);
    Route::post('/profile/{id}/add', [UserController::class, 'addProfileImage']);
    Route::post('/remittance/submit', [RemittanceController::class, 'submitRemittance']);
    Route::get('/employee/commission', [JoinedController::class, 'employeeCommissions']);
    Route::get('/transactions', [JoinedController::class, 'transactionWithAssigned']);
    Route::post('/report/submit', [IncidentReportsController::class, 'submitIncidentReport']);
    Route::post('/walk-in/add', [WalkInController::class, 'submitWalkIn']);
    Route::get('/walk-in', [JoinedController::class, 'displayWalkIns']);
    Route::post('/walk-in/update/{id}', [WalkInController::class, 'updateWalkIn']);
    Route::post('/walk-in/transaction/add' , [WalkInTransactionController::class, 'addWalkInTransaction']);
    Route::put('/staff/appointment/{appointmentId}/update', [JoinedController::class, 'updateAppointmentServices']);
    Route::post('/report/add', [IncidentReportsController::class, 'submitIncidentReport']);

});

//dipa sure
Route::post('/profile/add', [UserController::class, 'addProfileImage']);
Route::post('/refund/submit', [RefundsController::class, 'submitRefund']);
Route::post('/refund/update', [RefundsController::class, 'updateRefund']);
Route::post('/service/haircolors/add', [ServiceHairColorsController::class, 'addAvailableColors']);

//goods na ni
Route::get('/services/price/adjustment', [JoinedController::class, 'serviecsWithPriceAdjustments']);
Route::get('/services/price/adjustment/{serviceId}', [JoinedController::class, 'getServicePriceAdjustments']);
Route::get('/service/haircolors', [JoinedController::class, 'serviceHairColor']);
Route::get('/haircolors', [HairColorsController::class, 'displayHairColors']);
Route::get('/transact', [JoinedController::class, 'transactionWithAppointments']);


Route::get('/appointment/payment-details/{appointmentId}', [JoinedController::class, 'getPaymentDetails']);
Route::post('/appointment/cancel-with-refund', [JoinedController::class, 'cancelWithRefund']);

Route::get('/appointment/{id}', [JoinedController::class, 'getAppointmentDetails']);

Route::get('/expenses', [JoinedController::class, 'displayExpenses']);
Route::post('/expenses/add', [ExpensesController::class, 'addExpense']);

Route::post('/otp/send', [OTPController::class, 'sendOTP']);
Route::post('/otp/verify', [OTPController::class, 'verifyOTP']);
Route::post('/otp/resend', [OTPController::class, 'resendOTP']);


