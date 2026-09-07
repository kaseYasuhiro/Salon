<?php

namespace App\Http\Controllers;
use App\Models\Products;
use App\Models\ServiceProductUsage;
use App\Models\Inventory;
use App\Models\Services;
use App\Models\Transaction;
use App\Models\Appointments;
use App\Models\User;
use App\Models\Billing;
use App\Models\Payments;
use App\Models\InventoryTransaction;
use App\Models\Specialties;
use App\Models\StaffSpecialties;
use App\Models\ServiceSpecialties;
use App\Models\StaffSchedules;
use App\Models\AssignStaff;
use App\Models\Feedback;
use App\Models\StaffFeedback;
use App\Models\Remittance;
use App\Models\EmployeeCommission;
use App\Models\IncidentReports;
use App\Models\WalkIn;
use App\Models\WalkInTransaction;
use App\Models\WalkinAuthorization;
use App\Models\ServicePriceAdjustments;
use App\Models\Refunds;
use App\Models\HairColors;
use App\Models\ServiceHairColors;
use App\Models\Expenses;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;

class JoinedController extends Controller
{

    //display functions involving multiple tables
    public function serviceWithUsages()
    {
        return Services::with('ServiceProductUsage')->get();
    }

    public function serviceWithUsage()
    {
        return Services::with('serviceProductUsage.Products')->get();
    }

    public function invDisplay()
    {
        return Inventory::with('Products')->get();
    }

    public function usageWithPoducts()
    {
        return ServiceProductUsage::with('Products')->get();
    }

    public function staffWithSpecialties()
    {
        return User::where('role', ['staff'])->with(['staffSpecialties.specialties'])->get();
    }

    public function serviceWithSpecialties()
    {
        return ServiceSpecialties::with('specialties')->get();
    }

    public function getStaffSchedules()
    {
        return User::where('role', ['staff'])->with('staffSchedules')->get();
    }

    public function assignedStaffSchedules()
    {
        return AssignStaff::with(['user', 'businessSchedules'])->get();
    }

    public function viewFeedbacks()
    {
        return Feedback::with(['user', 'appointment'])->get();
    }

    public function displayStaffReviews()
    {
        return StaffFeedback::with('user')->get();
    }

    public function transactionWithAssigned()
    {
        return Transaction::with(['user', 'services'])->get();
    }

    public function remittanceReport()
    {
        return Remittance::with('businessSchedules')->get();
    }

    public function employeeCommissions()
    {
        return EmployeeCommission::with('user')->get();
    }

    public function displayIncidentReports()
    {
        return IncidentReports::with(['user', 'inventory', 'transaction'])->get();
    }

    public function inventoryTransactions()
    {
        return InventoryTransaction::with(['inventory', 'transaction'])->get();
    }

    public function displayWalkIns()
    {
        return WalkIn::with(['services', 'user'])->get();
    }

    public function displayWalkinTransactions()
    {
        return WalkInTransaction::with(['walkIn', 'inventory'])->get();
    }

    public function authorizedStaff()
    {
        return WalkinAuthorization::with('user')->get();
    }

    public function serviecsWithPriceAdjustments()
    {
        return Services::with('servicePriceAdjustments')->get();
    }

    public function allRefunds()
    {
        return Refunds::with(['payments', 'appointments'])->get();
    }

    public function serviceHairColor()
    {
        return ServiceHairColors::with(['hairColors'])->get();
    }

    public function transactionWithAppointments()
    {
        return Appointments::with(['transaction', 'user'])->get();
    }

    public function displayExpenses()
    {
        return Expenses::With('user')->get();
    }

    public function getServicePriceAdjustments($serviceId)
    {
        $adjustments = ServicePriceAdjustments::where('service_id', $serviceId)->get();
        
        if ($adjustments->isEmpty()) {
            return response()->json([]);
        }
        
        return response()->json($adjustments);
    }



    //CRUD functions involving multiple tables
    public function addProductsToInventory(Request $request)
    {
        $request->validate([
            'product_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'unit' => ['required', 'string'],
            'unit_size' => ['required', 'numeric'],
            'estimated_usages_per_unit' => ['required', 'numeric'],

            'product_quantity' => ['required', 'numeric'],
            'current_usages' => ['required', 'numeric'],
            'reorder_level' => ['required', 'numeric'],
            'expiration_date' => ['required', 'date', 'date_format:Y-m-d']
        ]);

        $product = Products::create([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit
        ]);
        
        $inventory = Inventory::create([
            'product_id' => $product->id,
            'product_quantity' => $request->product_quantity,
            'current_usages' => $request->current_usages,
            'reorder_level' => $request->reorder_level,
            'expiration_date' => $request->expiration_date
        ]);

        return response()->json([
            'message' => "Product Added to Inventory."
        ], 200);
    }

    // public function updateProductsOnInventory(Request $request, $id)
    // {
    //     $request->validate([
    //         'product_name' => ['required', 'string'],
    //         'description' => ['required', 'string'],
    //         'unit' => ['required', 'string'],
    //         'unit_size' => ['required', 'string'],
    //         'estimated_usages_per_unit' => ['required', 'numeric'],

    //         'product_quantity' => ['required', 'numeric'],
    //         'current_usages' => ['required', 'numeric'],
    //         'reorder_level' => ['required', 'numeric'],
    //         'expiration_date' => ['required', 'date', 'date_format:Y-m-d']
    //     ]);

    //     $product = Products::where('id', $id)->first();
    //     $inventory = Inventory::where('id', $id)->first();

    //     $product->update([
    //         'product_name' => $request->product_name,
    //         'description' => $request->description,
    //         'unit' => $request->unit,
    //         'unit_size' => $request->unit_size,
    //         'estimated_usages_per_unit' => $request->estimated_usages_per_unit
    //     ]);

    //     $inventory->update([
    //         'product_quantity' => $request->product_quantity,
    //         'current_usages' => $request->current_usages,
    //         'reorder_level' => $request->reorder_level,
    //         'expiration_date' => $request->expiration_date
    //     ]);

    //     return response()->json([
    //         'message' => 'Inventory Updated Successfully'
    //     ], 200);
    // }

    public function deleteProductsFromInventory($id)
    {
        $product = Products::where('id', $id)->first();
        $inventory = Inventory::where('id', id)->first();

        $product->delete();
        $inventory->delete();

        return response()->json([
            'message' => 'Item Deleted Successfully'
        ], 200);
    }


    public function userAppointments(Request $request)
    {   
        $user = $request->user();
        
        $transactions = Transaction::whereHas('appointments', function($query) use ($user) {
            $query->where('customer_id', $user->id);
        })->with(['appointments', 'services'])->get();
        
        // Format the response
        $result = $transactions->map(function($transaction) {
            return [
                'id' => $transaction->appointments->id,
                'customer_id' => $transaction->appointments->customer_id,
                'appointment_date' => $transaction->appointments->appointment_date,
                'appointment_time' => $transaction->appointments->appointment_time,
                'status' => $transaction->appointments->status,
                'service_name' => $transaction->services->service_name ?? null,
                'duration_minutes' => $transaction->services->duration_minutes ?? 0,
                'price' => $transaction->services->price ?? '0',
            ];
        });
        
        return response()->json($result);
    }

    public function billWithPayment()
    {
        return Payments::with('billing')->get();
    }

    public function completeBooking(Request $request)
    {
        $user = $request->user();

        // Log the incoming request data for debugging
        \Log::info('Complete Booking Request Data:', $request->all());
        
        // Get service IDs from the request
        $serviceIds = [];
        
        // Check if service_ids is sent as an array (from FormData with service_ids[])
        if ($request->has('service_ids') && is_array($request->input('service_ids'))) {
            $serviceIds = $request->input('service_ids');
        } 
        // Check if service_ids is sent as a JSON string
        else if ($request->has('service_ids') && is_string($request->input('service_ids'))) {
            $decoded = json_decode($request->input('service_ids'), true);
            if (is_array($decoded)) {
                $serviceIds = $decoded;
            } else {
                $serviceIds = [$request->input('service_ids')];
            }
        }
        // Fallback to single service_id
        else if ($request->has('service_id')) {
            $serviceIds = [$request->service_id];
        }

        // Log the parsed service IDs
        \Log::info('Parsed Service IDs:', $serviceIds);
        \Log::info('Number of services:', ['count' => count($serviceIds)]);

        if (empty($serviceIds)) {
            return response()->json([
                'message' => 'Validation Error',
                'errors' => ['service_ids' => ['The service ids field is required.']]
            ], 422);
        }

        // Validate the request
        $request->validate([
            'appointment_date' => ['required', 'date', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'status' => ['required', 'string'],
            'assigned_employee_id' => ['required', 'numeric'],
            'hair_length' => ['nullable', 'string'],
            'hair_thickness' => ['nullable', 'string'],
            'preferred_color' => ['nullable', 'string'],
            'total_amount' => ['required', 'numeric'],
            'payment_type' => ['required', 'string', 'in:downpayment,remaining'],
            'payment_method' => ['required', 'string', 'in:gcash,cash'],
            'payment_proof' => ['required', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048']
        ]);

        // Validate each service ID exists
        foreach ($serviceIds as $serviceId) {
            if (!\DB::table('services')->where('id', $serviceId)->exists()) {
                return response()->json([
                    'message' => 'Validation Error',
                    'errors' => ['service_ids' => ['One or more service IDs are invalid.']]
                ], 422);
            }
        }

        // Create appointment
        $appointment = Appointments::create([
            'customer_id' => $user->id,
            'customer_name' => $user->first_name . ' ' . $user->last_name,
            'customer_phone' => $user->phone_number,
            'customer_email' => $user->email,
            'appointment_date' => $request->appointment_date,
            'appointment_time' => $request->appointment_time,
            'status' => $request->status,
        ]);

        // Create multiple transactions - one for each service
        $transactions = [];
        foreach ($serviceIds as $serviceId) {
            \Log::info('Creating transaction for service ID:', ['service_id' => $serviceId]);
            $transaction = Transaction::create([
                'appointment_id' => $appointment->id,
                'service_id' => $serviceId,
                'assigned_employee_id' => $request->assigned_employee_id,
                'hair_length' => $request->hair_length,
                'hair_thickness' => $request->hair_thickness,
                'preferred_color' => $request->preferred_color
            ]);
            $transactions[] = $transaction;
        }

        // Create billing
        $billing = Billing::create([
            'appointment_id' => $appointment->id,
            'total_amount' => $request->total_amount,
            'payment_type' => $request->payment_type
        ]);

        // Handle payment proof upload
        $paymentProofPath = null;
        if ($request->hasFile('payment_proof')) {
            $file = $request->file('payment_proof');
            $filename = time() . '_' . $user->id . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('payment_proofs', $filename, 'public');
            $paymentProofPath = '/storage/' . $path;
        }

        // Create payment
        $payment = Payments::create([
            'billing_id' => $billing->id,
            'payment_method' => $request->payment_method,
            'payment_proof' => $paymentProofPath,
        ]);

        return response()->json([
            'message' => 'Booking Completed Successfully',
            'appointment_id' => $appointment->id,
            'transaction_ids' => array_column($transactions, 'id'),
            'billing_id' => $billing->id,
            'payment_id' => $payment->id,
            'payment_proof' => $paymentProofPath,
            'services_count' => count($transactions),
            'service_ids' => $serviceIds // Include this for debugging
        ], 200);
    }

    public function remainingBalancePayment(Request $request)
    {
        $request->validate([
            'appointment_id' => ['required', 'numeric'],
            'total_amount' => ['required', 'numeric'],
            'payment_type' => ['required', 'string', 'in:remaining'],
            'payment_method' => ['required', 'string', 'in:gcash,cash'],
            'payment_proof' => ['required', 'image', 'mimes:jpeg,png,jpg,gif', 'max:2048']
        ]);

        // Get the authenticated user
        $user = $request->user('sanctum');
        
        // If user is not authenticated, return error
        if (!$user) {
            return response()->json([
                'message' => 'Unauthenticated. Please log in again.'
            ], 401);
        }

        $billing = Billing::create([
            'appointment_id' => $request->appointment_id,
            'total_amount' => $request->total_amount,
            'payment_type' => $request->payment_type
        ]);

        // Handle payment proof upload
        $paymentProofPath = null;
        if ($request->hasFile('payment_proof')) {
            $file = $request->file('payment_proof');
            $filename = time() . '_' . $user->id . '.' . $file->getClientOriginalExtension();
            $path = $file->storeAs('payment_proofs', $filename, 'public');
            $paymentProofPath = '/storage/' . $path;
        }

        // Create payment
        $payment = Payments::create([
            'billing_id' => $billing->id,
            'payment_method' => $request->payment_method,
            'payment_proof' => $paymentProofPath,
        ]);

        return response()->json([
            'message' => 'Remaining Balance Paid Successfully',
            'billing_id' => $billing->id,
            'payment_id' => $payment->id
        ], 200);
    }


    public function allAppointments(Request $request)
    {   
        $user = $request->user();
        
        if (!in_array($user->role, ['admin', 'owner', 'staff', 'customer'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }
        
        $transactions = Transaction::with(['appointments', 'services', 'user'])
            ->orderBy('created_at', 'desc')
            ->get();
        
        $result = $transactions->map(function($transaction) {
            $appointment = $transaction->appointments;
            
            // Get customer data from users table
            $customer = null;
            if ($appointment && $appointment->customer_id) {
                $customer = User::find($appointment->customer_id);
            }
            
            return [
                'id' => $transaction->id,
                'appointment_id' => $appointment->id ?? null,
                'service_id' => $transaction->service_id,
                'customer_name' => $customer ? $customer->first_name . ' ' . $customer->last_name : 'Walk-in Customer',
                'customer_phone' => $customer ? $customer->phone_number : 'N/A',
                'customer_email' => $customer ? $customer->email : 'N/A',
                'appointment_date' => $appointment->appointment_date ?? null,
                'appointment_time' => $appointment->appointment_time ?? null,
                'status' => $appointment->status ?? null,
                'assigned_employee_id' => $transaction->assigned_employee_id ?? null,
                'service_name' => $transaction->services->service_name ?? null,
                'duration_minutes' => $transaction->services->duration_minutes ?? 0,
                'price' => $transaction->services->price ?? '0',
            ];
        });
        
        return response()->json($result);
    }

    // In your controller
    public function staffList()
    {
        return User::where('role', 'staff')
            ->select('id', 'first_name', 'last_name')
            ->get()
            ->map(function($staff) {
                return [
                    'id' => $staff->id,
                    'name' => $staff->first_name . ' ' . $staff->last_name
                ];
            });
    }

    public function updateAppointment(Request $request, $id)
    {
        $request->validate([
            'appointment_date' => ['nullable', 'date', 'date_format:Y-m-d'],
            'appointment_time' => ['nullable', 'date_format:H:i:s'],
            'assigned_employee_id' => ['nullable', 'numeric', 'exists:users,id'], 
            'status' => ['nullable', 'string', 'in:pending,confirmed,completed,cancelled']
        ]);

        try {
            DB::beginTransaction();

            // Find the appointment
            $appointment = Appointments::findOrFail($id);
            
            // Update appointment fields
            if ($request->has('appointment_date')) {
                $appointment->appointment_date = $request->appointment_date;
            }
            if ($request->has('appointment_time')) {
                $appointment->appointment_time = $request->appointment_time;
            }
            if ($request->has('status')) {
                $appointment->status = $request->status;
            }
            $appointment->save();

            // Find and update the related transaction
            $transaction = Transaction::where('appointment_id', $appointment->id)->first();
            
            if ($transaction) {
                // Update staff/employee assignment in transactions table
                if ($request->has('assigned_employee_id')) {
                    $transaction->assigned_employee_id = $request->assigned_employee_id;
                }
                
                $transaction->save();
            } else {
                // If no transaction exists, create one
                $transaction = Transaction::create([
                    'appointment_id' => $appointment->id,
                    'service_id' => $request->service_id ?? 1,
                    'assigned_employee_id' => $request->assigned_employee_id ?? null
                ]);
            }

            DB::commit();

            // Load relationships for response
            $appointment->load('transaction');
            
            // Get staff name for the response
            $staffName = null;
            if ($transaction && $transaction->assigned_employee_id) {
                $staff = User::find($transaction->assigned_employee_id);
                $staffName = $staff ? $staff->first_name . ' ' . $staff->last_name : null;
            }

            return response()->json([
                'message' => 'Appointment Updated Successfully',
                'appointment' => $appointment,
                'transaction' => $transaction,
                'staff_name' => $staffName,
                'assigned_employee_id' => $transaction->assigned_employee_id
            ], 200);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update appointment',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function getStaff()
    {
        $staff = User::where('role', 'staff')
            ->select('id', 'first_name', 'last_name', 'role')
            ->get()
            ->map(function($staff) {
                return [
                    'id' => $staff->id,
                    'name' => $staff->first_name . ' ' . $staff->last_name,
                    'role' => 'Staff'
                ];
            });
        
        return response()->json($staff);
    }
    
    // Optional: Add method to get appointment with transaction details
    public function getAppointmentWithDetails($id)
    {
        $appointment = Appointments::with('transaction')->findOrFail($id);
        
        // Get staff name from transaction if assigned
        if ($appointment->transaction && $appointment->transaction->assigned_employee_id) {
            $staff = User::find($appointment->transaction->assigned_employee_id);
            $appointment->staff_name = $staff ? $staff->first_name . ' ' . $staff->last_name : null;
            $appointment->staff_id = $appointment->transaction->assigned_employee_id;
        }
        
        return response()->json($appointment);
    }



    public function getStaffAppointments($staffId)
    {
        $transactions = Transaction::where('transactions.assigned_employee_id', $staffId)
            ->join('appointments', 'transactions.appointment_id', '=', 'appointments.id')
            ->leftJoin('users', 'appointments.customer_id', '=', 'users.id')  // Join users table
            ->with(['appointments', 'services'])
            ->orderBy('appointments.appointment_date', 'asc')
            ->orderBy('appointments.appointment_time', 'asc')
            ->select('transactions.*')
            ->get();
        
        $result = $transactions->map(function($transaction) use ($transactions) {
            $appointment = $transaction->appointments;
            
            // Get customer data from users table
            $customer = null;
            if ($appointment && $appointment->customer_id) {
                $customer = User::find($appointment->customer_id);
            }
            
            return [
                'id' => $appointment->id ?? null,
                'service_id' => $transaction->service_id,
                'customer_name' => $customer ? $customer->first_name . ' ' . $customer->last_name : 'Walk-in Customer',
                'customer_phone' => $customer ? $customer->phone_number : 'N/A',
                'customer_email' => $customer ? $customer->email : 'N/A',
                'appointment_date' => $appointment->appointment_date ?? null,
                'appointment_time' => $appointment->appointment_time ?? null,
                'status' => $appointment->status ?? null,
                'service_name' => $transaction->services->service_name ?? 'Service',
                'duration_minutes' => $transaction->services->duration_minutes ?? 0,
                'price' => $transaction->services->price ?? '0',
                'notes' => $transaction->notes,
                'transaction_id' => $transaction->id,
                // Hair details from the transaction
                'hair_length' => $transaction->hair_length ?? null,
                'hair_thickness' => $transaction->hair_thickness ?? null,
                'preferred_color' => $transaction->preferred_color ?? null,
            ];
        });
        
        return response()->json($result);
    }

    // public function updateTransactionStatus(Request $request, $transactionId)
    // {
    //     $request->validate([
    //         'service_status' => ['required', 'string', 'in:pending,in_progress,completed,cancelled']
    //     ]);
        
    //     try {
    //         DB::beginTransaction();
            
    //         $transaction = Transaction::findOrFail($transactionId);
    //         $oldStatus = $transaction->service_status;
    //         $transaction->service_status = $request->service_status;
            
    //         if ($request->service_status === 'completed') {
    //             $transaction->completed_at = now();
                
    //             // Update appointment status
    //             if ($transaction->appointments) {
    //                 $transaction->appointments->status = 'completed';
    //                 $transaction->appointments->save();
    //             }
    //         }
            
    //         $transaction->save();
            
    //         // If status is changing to 'completed', update inventory
    //         if ($request->service_status === 'completed' && $oldStatus !== 'completed') {
    //             $serviceUsages = ServiceProductUsage::where('service_id', $transaction->service_id)->get();
                
    //             foreach ($serviceUsages as $usage) {
    //                 $inventory = Inventory::where('product_id', $usage->product_id)->first();
                    
    //                 if ($inventory) {
    //                     // Create inventory transaction
    //                     InventoryTransaction::create([
    //                         'inventory_id' => $inventory->id,
    //                         'transaction_id' => $transaction->id,
    //                         'quantity_change' => -$usage->estimated_usage,
    //                         'transaction_type' => 'service_completion'
    //                     ]);
                        
    //                     // Update inventory current_usages
    //                     $inventory->current_usages += $usage->estimated_usage;
    //                     $inventory->save();
    //                 }
    //             }
    //         }
            
    //         DB::commit();
            
    //         return response()->json([
    //             'message' => 'Service status updated successfully',
    //             'transaction' => $transaction
    //         ]);
            
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         return response()->json([
    //             'message' => 'Failed to update service status',
    //             'error' => $e->getMessage()
    //         ], 500);
    //     }
    // }



    public function completeService(Request $request, $transactionId)
    {
        $request->validate([
            'status' => ['required', 'string', 'in:completed'] // Changed from service_status to status
        ]);

        try {
            DB::beginTransaction();

            $transaction = Transaction::findOrFail($transactionId);
            
            // Remove service_status update since we're deprecating it
            // $transaction->service_status = 'completed'; // REMOVED
            $transaction->completed_at = now();
            $transaction->save();

            // Update appointment status to completed
            $appointment = $transaction->appointments;
            if ($appointment) {
                $appointment->status = 'completed';
                $appointment->save();
            }

            // Update all transactions for this appointment to completed
            // This ensures all services in the appointment are marked as completed
            $allTransactions = Transaction::where('appointment_id', $appointment->id)->get();
            foreach ($allTransactions as $trans) {
                $trans->completed_at = now();
                $trans->save();
            }

            $serviceUsages = ServiceProductUsage::where('service_id', $transaction->service_id)->get();
            
            foreach ($serviceUsages as $usage) {
                $inventory = Inventory::where('product_id', $usage->product_id)->first();
                
                if ($inventory && $inventory->product) {
                    $estimatedUsagesPerUnit = $inventory->product->estimated_usages_per_unit;
                    $estimatedUsage = $usage->estimated_usage;
                    $remainingUsage = $estimatedUsage;
                    
                    while ($remainingUsage > 0) {
                        // Check how many usages left in current bottle
                        $usagesLeft = $inventory->current_usages;
                        
                        if ($usagesLeft <= 0) {
                            // Current bottle is empty, need to open a new one
                            if ($inventory->product_quantity > 0) {
                                // Decrement product quantity by 1
                                $inventory->product_quantity -= 1;
                                // Reset current_usages to full amount
                                $inventory->current_usages = $estimatedUsagesPerUnit;
                                
                                // Record unit consumption
                                InventoryTransaction::create([
                                    'inventory_id' => $inventory->id,
                                    'transaction_id' => $transaction->id,
                                    'quantity_change' => -1,
                                    'transaction_type' => 'usage'
                                ]);
                                
                                continue; // Re-evaluate with the new bottle
                            } else {
                                break;
                            }
                        }
                        
                        // Calculate how much we can use from current bottle
                        $canUse = min($remainingUsage, $usagesLeft);
                        
                        // DECREASE current_usages (using up the product)
                        $inventory->current_usages -= $canUse;
                        $remainingUsage -= $canUse;
                    }
                    
                    $inventory->save();
                    
                    // Record usage transaction
                    InventoryTransaction::create([
                        'inventory_id' => $inventory->id,
                        'transaction_id' => $transaction->id,
                        'quantity_change' => -$estimatedUsage,
                        'transaction_type' => 'usage'
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Service completed successfully',
                'transaction' => $transaction,
                'appointment' => $appointment
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Service completion error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to complete service',
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function updateServiceWithInventory(Request $request, $transactionId = null)
    {
        $request->validate([
            'status' => ['nullable', 'string', 'in:pending,confirmed,completed,cancelled'],
            'product_usages' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'product_usages.*.inventory_id' => ['required', 'numeric', 'exists:inventories,id'],
            'product_usages.*.quantity_change' => ['required', 'numeric', 'min:0']
        ]);

        try {
            DB::beginTransaction();

            // If transactionId is provided, update a single transaction
            // If not, update all transactions for the appointment
            if ($transactionId) {
                $transactions = Transaction::where('id', $transactionId)->get();
            } else {
                // Get appointment_id from request
                $request->validate([
                    'appointment_id' => ['required', 'numeric', 'exists:appointments,id']
                ]);
                
                // Get all transactions for this appointment
                $transactions = Transaction::where('appointment_id', $request->appointment_id)->get();
            }

            if ($transactions->isEmpty()) {
                return response()->json([
                    'message' => 'No transactions found to update'
                ], 404);
            }

            $updatedTransactions = [];
            $appointment = null;

            // Update each transaction
            foreach ($transactions as $transaction) {
                // Store reference to appointment (same for all transactions)
                if (!$appointment) {
                    $appointment = $transaction->appointments;
                }

                // Update notes
                if ($request->has('notes')) {
                    $transaction->notes = $request->notes;
                }
                
                // REMOVED: Update transaction service_status since we're deprecating it
                // The transaction's service_status is no longer being updated
                
                $transaction->save();

                // Update inventory based on quantity changes
                if ($request->has('product_usages')) {
                    foreach ($request->product_usages as $productUsage) {
                        $inventory = Inventory::find($productUsage['inventory_id']);
                        if ($inventory && $productUsage['quantity_change'] > 0) {
                            $quantityUsed = $productUsage['quantity_change'];
                            
                            // Get product details
                            $product = DB::table('products')->where('id', $inventory->product_id)->first();
                            
                            if (!$product) {
                                continue;
                            }
                            
                            $estimatedUsagesPerUnit = $product->estimated_usages_per_unit;
                            $remainingUsage = $quantityUsed;
                            
                            while ($remainingUsage > 0) {
                                // Check how many usages left in current bottle
                                $usagesLeft = $inventory->current_usages;
                                
                                if ($usagesLeft <= 0) {
                                    // Current bottle is empty, need to open a new one
                                    if ($inventory->product_quantity > 0) {
                                        // Decrement product quantity by 1
                                        $inventory->product_quantity -= 1;
                                        // Reset current_usages to full amount
                                        $inventory->current_usages = $estimatedUsagesPerUnit;
                                        
                                        // Record unit consumption
                                        DB::table('inventory_transactions')->insert([
                                            'inventory_id' => $inventory->id,
                                            'transaction_id' => $transaction->id,
                                            'quantity_change' => -1,
                                            'transaction_type' => 'usage',
                                            'created_at' => now(),
                                            'updated_at' => now()
                                        ]);
                                        
                                        continue; // Re-evaluate with the new bottle
                                    } else {
                                        // No more bottles available
                                        break;
                                    }
                                }
                                
                                // Calculate how much we can use from current bottle
                                $canUse = min($remainingUsage, $usagesLeft);
                                
                                // DECREASE current_usages (using up the product)
                                $inventory->current_usages -= $canUse;
                                $remainingUsage -= $canUse;
                            }
                            
                            // Create inventory transaction record for the usage
                            DB::table('inventory_transactions')->insert([
                                'inventory_id' => $inventory->id,
                                'transaction_id' => $transaction->id,
                                'quantity_change' => -$quantityUsed,
                                'transaction_type' => 'usage',
                                'created_at' => now(),
                                'updated_at' => now()
                            ]);
                            
                            $inventory->save();
                            
                            // Log for debugging
                            \Log::info("Inventory updated", [
                                'product' => $product->product_name,
                                'quantity_used' => $quantityUsed,
                                'new_current_usages' => $inventory->current_usages,
                                'new_product_quantity' => $inventory->product_quantity
                            ]);
                        }
                    }
                }

                $updatedTransactions[] = $transaction->id;
            }

            // Update appointment status (once for all transactions)
            if ($appointment && $request->has('status')) {
                $appointment->status = $request->status;
                $appointment->save();
            }

            DB::commit();

            // Get updated product usages for the first transaction's service (or all services)
            $productUsages = [];
            foreach ($transactions as $transaction) {
                $usages = DB::table('service_product_usages as spu')
                    ->leftJoin('products as p', 'spu.product_id', '=', 'p.id')
                    ->leftJoin('inventories as i', 'spu.product_id', '=', 'i.product_id')
                    ->where('spu.service_id', $transaction->service_id)
                    ->select(
                        'spu.id',
                        'spu.product_id',
                        'spu.estimated_usage',
                        'p.product_name',
                        'p.estimated_usages_per_unit',
                        'i.id as inventory_id',
                        'i.product_quantity as current_quantity',
                        'i.current_usages'
                    )
                    ->get()
                    ->map(function($item) {
                        return [
                            'id' => $item->id,
                            'product_id' => $item->product_id,
                            'product_name' => $item->product_name ?? 'Unknown Product',
                            'estimated_usage' => $item->estimated_usage,
                            'estimated_usages_per_unit' => $item->estimated_usages_per_unit ?? 0,
                            'inventory_id' => $item->inventory_id,
                            'current_quantity' => $item->current_quantity ?? 0,
                            'current_usages' => $item->current_usages ?? 0
                        ];
                    });
                
                $productUsages = array_merge($productUsages, $usages->toArray());
            }

            return response()->json([
                'message' => 'Service(s) updated successfully',
                'updated_transactions' => $updatedTransactions,
                'transactions_count' => count($updatedTransactions),
                'product_usages' => $productUsages
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Service update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update service(s)',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function updateAppointmentServices(Request $request, $appointmentId)
    {
        // Add appointment_id to the request so the main function can use it
        $request->merge(['appointment_id' => $appointmentId]);
        
        // Call the existing function without transactionId
        return $this->updateServiceWithInventory($request, null);
    }

    
    public function getServiceProductUsages($serviceId)
    {
        try {
            $productUsages = DB::table('service_product_usages as spu')
                ->join('products as p', 'spu.product_id', '=', 'p.id')
                ->leftJoin('inventories as i', 'spu.product_id', '=', 'i.product_id')
                ->where('spu.service_id', $serviceId)
                ->select(
                    'spu.id',
                    'spu.product_id',
                    'spu.estimated_usage',
                    'p.product_name',
                    'i.id as inventory_id',
                    'i.product_quantity as current_quantity',
                    'i.current_usages'
                )
                ->get()
                ->map(function($item) {
                    return [
                        'id' => $item->id,
                        'product_id' => $item->product_id,
                        'product_name' => $item->product_name,  // This should now be from products table
                        'estimated_usage' => $item->estimated_usage,
                        'inventory_id' => $item->inventory_id,
                        'current_quantity' => $item->current_quantity ?? 0,
                        'current_usages' => $item->current_usages ?? 0
                    ];
                });
            
            return response()->json($productUsages);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching product usages: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch product usages',
                'error' => $e->getMessage()
            ], 500);
        }
    }


    public function testServiceProductUsages($serviceId)
    {
        $usages = DB::table('service_product_usages')
            ->where('service_id', $serviceId)
            ->get();
        
        $products = DB::table('products')->get();
        
        return response()->json([
            'service_id' => $serviceId,
            'product_usages' => $usages,
            'all_products' => $products,
            'count' => $usages->count()
        ]);
    }

    public function updateServiceDetails(Request $request)
    {
        $request->validate([
            'service_id' => ['required', 'numeric'],
            'specialty_id' => ['nullable', 'numeric'],
            'product_id' => ['nullable', 'numeric'],
            'estimated_usage' => ['nullable', 'numeric'],
            'hair_color_ids' => ['nullable', 'array'], // New field for hair colors
            'hair_color_ids.*' => ['numeric', 'exists:hair_colors,id'] // Validate each hair color ID
        ]);

        $serviceId = $request->service_id;
        $specialtyId = $request->specialty_id;
        $productId = $request->product_id;
        $estimatedUsage = $request->estimated_usage;
        $hairColorIds = $request->hair_color_ids; // Array of hair color IDs

        $results = [
            'specialty_added' => false,
            'product_usage_added' => false,
            'hair_colors_updated' => false,
            'messages' => []
        ];

        // 1. Add Service Specialty if provided
        if ($specialtyId) {
            try {
                // Check if specialty already exists for this service
                $existing = ServiceSpecialties::where('service_id', $serviceId)
                    ->where('specialty_id', $specialtyId)
                    ->first();

                if (!$existing) {
                    ServiceSpecialties::create([
                        'service_id' => $serviceId,
                        'specialty_id' => $specialtyId
                    ]);
                    $results['specialty_added'] = true;
                    $results['messages'][] = 'Specialty added successfully.';
                } else {
                    $results['messages'][] = 'Specialty already exists for this service.';
                }
            } catch (\Exception $e) {
                $results['messages'][] = 'Error adding specialty: ' . $e->getMessage();
            }
        }

        // 2. Add Product Usage if provided
        if ($productId && $estimatedUsage) {
            try {
                // Check if product usage already exists for this service
                $existing = ServiceProductUsage::where('service_id', $serviceId)
                    ->where('product_id', $productId)
                    ->first();

                if (!$existing) {
                    ServiceProductUsage::create([
                        'service_id' => $serviceId,
                        'product_id' => $productId,
                        'estimated_usage' => $estimatedUsage
                    ]);
                    $results['product_usage_added'] = true;
                    $results['messages'][] = 'Product usage added successfully.';
                } else {
                    $results['messages'][] = 'Product usage already exists for this service.';
                }
            } catch (\Exception $e) {
                $results['messages'][] = 'Error adding product usage: ' . $e->getMessage();
            }
        }

        // 3. Update Hair Colors if provided
        if ($hairColorIds !== null) {
            try {
                // First, get the service to check if reqHairColor is true
                $service = Services::find($serviceId);
                
                if (!$service) {
                    $results['messages'][] = 'Service not found.';
                } else if (!$service->reqHairColor) {
                    $results['messages'][] = 'This service does not require hair colors. Please enable "Requires Hair Color" first.';
                } else {
                    // Sync the hair colors for this service
                    // Delete existing associations
                    ServiceHairColors::where('service_id', $serviceId)->delete();
                    
                    // Add new associations
                    foreach ($hairColorIds as $colorId) {
                        ServiceHairColors::create([
                            'service_id' => $serviceId,
                            'hair_color_id' => $colorId
                        ]);
                    }
                    
                    $results['hair_colors_updated'] = true;
                    $results['messages'][] = 'Hair colors updated successfully. (' . count($hairColorIds) . ' colors selected)';
                }
            } catch (\Exception $e) {
                $results['messages'][] = 'Error updating hair colors: ' . $e->getMessage();
            }
        }

        // Return response
        $success = $results['specialty_added'] || $results['product_usage_added'] || $results['hair_colors_updated'];
        $statusCode = $success ? 200 : 400;
        $statusMessage = $success ? 'Changes saved successfully' : 'No changes were saved';

        return response()->json([
            'message' => $statusMessage,
            'success' => $success,
            'results' => $results
        ], $statusCode);
    }
    

    public function updateEmployeeDetails(Request $request)
    {
        $request->validate([
            'employee_id' => ['required', 'numeric'],
            'specialty_id' => ['nullable', 'numeric'],
            'specialty_active' => ['nullable', 'boolean'],
            'commission_amount' => ['nullable', 'numeric'],
            'walk_in_authorized' => ['nullable', 'boolean']
        ]);

        $employeeId = $request->employee_id;
        $specialtyId = $request->specialty_id;
        $specialtyActive = $request->specialty_active ?? true;
        $commissionAmount = $request->commission_amount;
        $walkInAuthorized = $request->walk_in_authorized;

        $results = [
            'specialty_added' => false,
            'commission_added' => false,
            'walk_in_updated' => false,
            'messages' => []
        ];

        // 1. Add Staff Specialty if provided
        if ($specialtyId) {
            try {
                // Check if specialty already exists for this staff
                $existing = StaffSpecialties::where('staff_id', $employeeId)
                    ->where('specialty_id', $specialtyId)
                    ->first();

                if (!$existing) {
                    StaffSpecialties::create([
                        'staff_id' => $employeeId,
                        'specialty_id' => $specialtyId,
                        'is_active' => $specialtyActive ? 1 : 0
                    ]);
                    $results['specialty_added'] = true;
                    $results['messages'][] = 'Specialty added successfully.';
                } else {
                    // Update existing specialty
                    $existing->update([
                        'is_active' => $specialtyActive ? 1 : 0
                    ]);
                    $results['specialty_added'] = true;
                    $results['messages'][] = 'Specialty updated successfully.';
                }
            } catch (\Exception $e) {
                $results['messages'][] = 'Error adding specialty: ' . $e->getMessage();
            }
        }

        // 2. Add/Update Commission if provided
        if ($commissionAmount !== null && $commissionAmount > 0) {
            try {
                // Check if commission already exists for this employee
                $existing = EmployeeCommission::where('employee_id', $employeeId)->first();

                if (!$existing) {
                    EmployeeCommission::create([
                        'employee_id' => $employeeId,
                        'commission_amount' => $commissionAmount
                    ]);
                    $results['commission_added'] = true;
                    $results['messages'][] = 'Commission added successfully.';
                } else {
                    $existing->update([
                        'commission_amount' => $commissionAmount
                    ]);
                    $results['commission_added'] = true;
                    $results['messages'][] = 'Commission updated successfully.';
                }
            } catch (\Exception $e) {
                $results['messages'][] = 'Error adding commission: ' . $e->getMessage();
            }
        }

        // 3. Update Walk-in Authorization if provided
        if ($walkInAuthorized !== null) {
            try {
                // Check if walk-in authorization exists for this staff
                $existing = WalkinAuthorization::where('staff_id', $employeeId)->first();

                if (!$existing) {
                    WalkinAuthorization::create([
                        'staff_id' => $employeeId,
                        'isAuthorizedForWalkin' => $walkInAuthorized ? 1 : 0
                    ]);
                    $results['walk_in_updated'] = true;
                    $results['messages'][] = 'Walk-in authorization created successfully.';
                } else {
                    $existing->update([
                        'isAuthorizedForWalkin' => $walkInAuthorized ? 1 : 0
                    ]);
                    $results['walk_in_updated'] = true;
                    $results['messages'][] = 'Walk-in authorization updated successfully.';
                }
            } catch (\Exception $e) {
                $results['messages'][] = 'Error updating walk-in authorization: ' . $e->getMessage();
            }
        }

        // Return response
        $success = $results['specialty_added'] || $results['commission_added'] || $results['walk_in_updated'];
        $statusCode = $success ? 200 : 400;
        $statusMessage = $success ? 'Changes saved successfully' : 'No changes were saved';

        return response()->json([
            'message' => $statusMessage,
            'success' => $success,
            'results' => $results
        ], $statusCode);
    }


    public function getPaymentDetails($appointmentId)
    {
        $payment = Payments::with('billing')
            ->whereHas('billing', function($query) use ($appointmentId) {
                $query->where('appointment_id', $appointmentId);
            })
            ->first();
        
        if (!$payment) {
            return response()->json(['message' => 'No payment found for this appointment'], 404);
        }
        
        return response()->json($payment);
    }

    
    public function cancelWithRefund(Request $request)
    {
        $request->validate([
            'appointment_id' => ['required', 'numeric'],
            'payment_id' => ['required', 'numeric'],
            'cancellation_reason' => ['required', 'string'],
            'refund_method' => ['required', 'string', 'in:cash,gcash'],
            'refund_amount' => ['required', 'numeric']
        ]);

        // Update appointment status
        $appointment = Appointments::find($request->appointment_id);
        if (!$appointment) {
            return response()->json(['message' => 'Appointment not found'], 404);
        }

        $appointment->update([
            'status' => 'cancelled',
            'cancellation_reason' => $request->cancellation_reason,
            'cancelled_by' => auth()->id(),
            'cancelled_at' => now()
        ]);

        // Create refund record
        Refunds::create([
            'payment_id' => $request->payment_id,
            'appointment_id' => $request->appointment_id,
            'refund_amount' => $request->refund_amount,
            'refund_method' => $request->refund_method,
            'refund_reason' => $request->cancellation_reason,
            'status' => 'pending',
            'processed_at' => now()
        ]);

        return response()->json([
            'message' => 'Appointment cancelled and refund processed successfully',
            'appointment' => $appointment
        ], 200);
    }

    public function getAppointmentDetails($id)
    {
        try {
            // Find the appointment by ID
            $appointment = Appointments::with(['transaction', 'user'])->find($id);
            
            if (!$appointment) {
                return response()->json([
                    'message' => 'Appointment not found'
                ], 404);
            }
            
            // Get the transactions for this appointment
            $transactions = Transaction::where('appointment_id', $id)->get();
            
            // Get the customer/user details
            $customer = User::find($appointment->customer_id);
            
            // Get the staff name from the first transaction
            $staffName = 'Unassigned';
            if ($transactions->isNotEmpty()) {
                $firstTransaction = $transactions->first();
                if ($firstTransaction->assigned_employee_id) {
                    $staff = User::find($firstTransaction->assigned_employee_id);
                    if ($staff) {
                        $staffName = $staff->first_name . ' ' . $staff->last_name;
                    }
                }
            }
            
            // Format services data
            $services = [];
            $totalPrice = 0;
            $totalDuration = 0;
            
            foreach ($transactions as $transaction) {
                $service = Services::find($transaction->service_id);
                if ($service) {
                    $price = floatval($service->price);
                    $duration = intval($service->duration_minutes);
                    $totalPrice += $price;
                    $totalDuration += $duration;
                    
                    $services[] = [
                        'id' => $transaction->id,
                        'service_id' => $service->id,
                        'service_name' => $service->service_name,
                        'duration_minutes' => $duration,
                        'price' => $price,
                        'service_status' => $transaction->service_status ?? 'pending'
                    ];
                }
            }
            
            // Build the response
            $response = [
                'id' => $appointment->id,
                'appointment_id' => $appointment->id,
                'customer_name' => $customer ? $customer->first_name . ' ' . $customer->last_name : 'Walk-in Customer',
                'customer_phone' => $customer ? $customer->phone_number : 'N/A',
                'customer_email' => $customer ? $customer->email : 'N/A',
                'appointment_date' => $appointment->appointment_date,
                'appointment_time' => $appointment->appointment_time,
                'status' => $appointment->status,
                'staff_name' => $staffName,
                'services' => $services,
                'service_names' => array_column($services, 'service_name'),
                'total_price' => $totalPrice,
                'total_duration' => $totalDuration,
                'service_name' => implode(' + ', array_column($services, 'service_name')),
                'duration_minutes' => $totalDuration,
                'price' => number_format($totalPrice, 2),
                'created_at' => $appointment->created_at,
                'updated_at' => $appointment->updated_at
            ];
            
            return response()->json($response);
            
        } catch (\Exception $e) {
            \Log::error('Error fetching appointment details: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to fetch appointment details',
                'error' => $e->getMessage()
            ], 500);
        }
    }


}
