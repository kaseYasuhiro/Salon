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

    public function updateProductsOnInventory(Request $request, $id)
    {
        $request->validate([
            'product_name' => ['required', 'string'],
            'description' => ['required', 'string'],
            'unit' => ['required', 'string'],
            'unit_size' => ['required', 'string'],
            'estimated_usages_per_unit' => ['required', 'numeric'],

            'product_quantity' => ['required', 'numeric'],
            'current_usages' => ['required', 'numeric'],
            'reorder_level' => ['required', 'numeric'],
            'expiration_date' => ['required', 'date', 'date_format:m/d/Y']
        ]);

        $product = Products::where('id', $id)->first();
        $inventory = Inventory::where('id', $id)->first();

        $product->update([
            'product_name' => $request->product_name,
            'description' => $request->description,
            'unit' => $request->unit,
            'unit_size' => $request->unit_size,
            'estimated_usages_per_unit' => $request->estimated_usages_per_unit
        ]);

        $inventory->update([
            'product_quantity' => $request->product_quantity,
            'current_usages' => $request->current_usages,
            'reorder_level' => $request->reorder_level,
            'expiration_date' => $request->expiration_date
        ]);

        return response()->json([
            'message' => 'Inventory Updated Successfully'
        ], 200);
    }

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
                'service_status' => $transaction->service_status,
                'service_name' => $transaction->services->service_name ?? null,
                'duration_minutes' => $transaction->services->duration_minutes ?? 0,
                'price' => $transaction->services->price ?? '0',
            ];
        });
        
        return response()->json($result);
    }

    public function billWithPayment()
    {
        return Billing::with('payments')->get();
    }

    public function completeBooking(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'appointment_date' => ['required', 'date', 'date_format:Y-m-d'],
            'appointment_time' => ['required', 'date_format:H:i'],
            'status' => ['required', 'string'],
            'service_id' => ['required', 'numeric'],
            'assigned_employee_id' => ['required', 'numeric'],
            'service_status' => ['required', 'string'],
            'total_amount' => ['required', 'numeric'],
            'payment_type' => ['required', 'string', 'in:downpayment,full payment'],
            'payment_method' => ['required', 'string', 'in:gcash,cash']
        ]);

        // Create appointment with customer name and phone from user data
        $appointment = Appointments::create([
            'customer_id' => $user->id,
            'customer_name' => $user->first_name . ' ' . $user->last_name,
            'customer_phone' => $user->phone_number,
            'customer_email' => $user->email,
            'appointment_date' => $request->appointment_date,
            'appointment_time' => $request->appointment_time,
            'status' => $request->status,
        ]);

        // Create transaction
        $transaction = Transaction::create([
            'appointment_id' => $appointment->id,
            'service_id' => $request->service_id,
            'assigned_employee_id' => $request->assigned_employee_id,
            'service_status' => $request->service_status,
        ]);

        // Create billing
        $billing = Billing::create([
            'appointment_id' => $appointment->id,
            'total_amount' => $request->total_amount,
            'payment_type' => $request->payment_type
        ]);

        // Create payment
        $payment = Payments::create([
            'billing_id' => $billing->id,
            'payment_method' => $request->payment_method
        ]);

        return response()->json([
            'message' => 'Booking Completed Successfully',
            'appointment_id' => $appointment->id,
            'transaction_id' => $transaction->id,
            'billing_id' => $billing->id,
            'payment_id' => $payment->id
        ], 200);
    }


    public function allAppointments(Request $request)
    {   
        $user = $request->user();
        
        if (!in_array($user->role, ['admin', 'owner', 'staff'])) {
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
                'service_status' => $transaction->service_status,
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
            'appointment_time' => ['nullable', 'date_format:H:i:s'],
            'assigned_employee_id' => ['nullable', 'numeric', 'exists:users,id'], // Changed from staff_id
            'status' => ['nullable', 'string', 'in:pending,confirmed,completed,cancelled'],
            'service_status' => ['nullable', 'string', 'in:pending,in_progress,completed,cancelled'],
            'notes' => ['nullable', 'string']
        ]);

        try {
            DB::beginTransaction();

            // Find the appointment
            $appointment = Appointments::findOrFail($id);
            
            // Update appointment fields (only fields that exist in appointments table)
            if ($request->has('appointment_time')) {
                $appointment->appointment_time = $request->appointment_time;
            }
            if ($request->has('status')) {
                $appointment->status = $request->status;
            }
            if ($request->has('notes')) {
                $appointment->notes = $request->notes;
            }
            $appointment->save();

            // Find and update the related transaction
            $transaction = Transaction::where('appointment_id', $appointment->id)->first();
            
            if ($transaction) {
                // Update staff/employee assignment in transactions table
                if ($request->has('assigned_employee_id')) {
                    $transaction->assigned_employee_id = $request->assigned_employee_id;
                }
                
                // Update service status
                if ($request->has('service_status')) {
                    $transaction->service_status = $request->service_status;
                    
                    // If status is completed, set completed_at date
                    if ($request->service_status === 'completed') {
                        $transaction->completed_at = now();
                    } elseif ($request->service_status === 'pending' || $request->service_status === 'in_progress') {
                        $transaction->completed_at = null;
                    }
                }
                
                // Update notes if provided and if transactions table has notes field
                if ($request->has('notes')) {
                    $transaction->notes = $request->notes;
                }
                
                $transaction->save();
            } else {
                // If no transaction exists, create one
                $transaction = Transaction::create([
                    'appointment_id' => $appointment->id,
                    'service_id' => $request->service_id ?? 1, // You might need to adjust this
                    'assigned_employee_id' => $request->assigned_employee_id ?? null,
                    'service_status' => $request->service_status ?? 'pending',
                    'notes' => $request->notes ?? null
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
                'service_status' => $transaction->service_status ?? 'pending',
                'service_name' => $transaction->services->service_name ?? 'Service',
                'duration_minutes' => $transaction->services->duration_minutes ?? 0,
                'price' => $transaction->services->price ?? '0',
                'notes' => $transaction->notes,
                'transaction_id' => $transaction->id,
            ];
        });
        
        return response()->json($result);
    }

    public function updateTransactionStatus(Request $request, $transactionId)
    {
        $request->validate([
            'service_status' => ['required', 'string', 'in:pending,in_progress,completed,cancelled']
        ]);
        
        try {
            DB::beginTransaction();
            
            $transaction = Transaction::findOrFail($transactionId);
            $oldStatus = $transaction->service_status;
            $transaction->service_status = $request->service_status;
            
            if ($request->service_status === 'completed') {
                $transaction->completed_at = now();
                
                // Update appointment status
                if ($transaction->appointments) {
                    $transaction->appointments->status = 'completed';
                    $transaction->appointments->save();
                }
            }
            
            $transaction->save();
            
            // If status is changing to 'completed', update inventory
            if ($request->service_status === 'completed' && $oldStatus !== 'completed') {
                $serviceUsages = ServiceProductUsage::where('service_id', $transaction->service_id)->get();
                
                foreach ($serviceUsages as $usage) {
                    $inventory = Inventory::where('product_id', $usage->product_id)->first();
                    
                    if ($inventory) {
                        // Create inventory transaction
                        InventoryTransaction::create([
                            'inventory_id' => $inventory->id,
                            'transaction_id' => $transaction->id,
                            'quantity_change' => -$usage->estimated_usage,
                            'transaction_type' => 'service_completion'
                        ]);
                        
                        // Update inventory current_usages
                        $inventory->current_usages += $usage->estimated_usage;
                        $inventory->save();
                    }
                }
            }
            
            DB::commit();
            
            return response()->json([
                'message' => 'Service status updated successfully',
                'transaction' => $transaction
            ]);
            
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update service status',
                'error' => $e->getMessage()
            ], 500);
        }
    }



    public function completeService(Request $request, $transactionId)
    {
        $request->validate([
            'service_status' => ['required', 'string', 'in:completed']
        ]);

        try {
            DB::beginTransaction();

            $transaction = Transaction::findOrFail($transactionId);
            
            $transaction->service_status = 'completed';
            $transaction->completed_at = now();
            $transaction->save();

            $appointment = $transaction->appointments;
            if ($appointment) {
                $appointment->status = 'completed';
                $appointment->save();
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
                'transaction' => $transaction
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

    public function updateServiceWithInventory(Request $request, $transactionId)
    {
        $request->validate([
            'status' => ['nullable', 'string', 'in:pending,confirmed,completed,cancelled'],
            'service_status' => ['nullable', 'string', 'in:pending,in_progress,completed,cancelled'],
            'product_usages' => ['nullable', 'array'],
            'notes' => ['nullable', 'string'],
            'product_usages.*.inventory_id' => ['required', 'numeric', 'exists:inventories,id'],
            'product_usages.*.quantity_change' => ['required', 'numeric', 'min:0']
        ]);

        try {
            DB::beginTransaction();

            // Find the transaction
            $transaction = Transaction::findOrFail($transactionId);
            

            if ($request->has('notes')) {
                $transaction->notes = $request->notes;
            }
            
            // Update transaction service status
            if ($request->has('service_status')) {
                $transaction->service_status = $request->service_status;
                if ($request->service_status === 'completed') {
                    $transaction->completed_at = now();
                }
                $transaction->save();
            }

            // Update appointment status
            $appointment = $transaction->appointments;
            if ($appointment && $request->has('status')) {
                $appointment->status = $request->status;
                $appointment->save();
            }

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

            DB::commit();

            // Get updated product usages
            $productUsages = DB::table('service_product_usages as spu')
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

            return response()->json([
                'message' => 'Service updated successfully',
                'transaction' => $transaction,
                'product_usages' => $productUsages
            ], 200);

        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Service update error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Failed to update service',
                'error' => $e->getMessage()
            ], 500);
        }
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
    

    
}
