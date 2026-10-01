<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

class HistoricalDataSeeder extends Seeder
{
    /**
     * Historical period: 6 months back from today.
     */
    protected Carbon $startDate;
    protected Carbon $endDate;

    public function run(): void
    {
        // ✅ Change this range to fit your historical needs
        $this->startDate = Carbon::now()->subMonths(6)->startOfMonth();
        $this->endDate   = Carbon::now();

        DB::transaction(function () {
            $users        = $this->seedUsers();
            $specialties  = $this->seedSpecialties();
            $staffSpecs   = $this->seedStaffSpecialties($users, $specialties);
            $services     = $this->seedServices();
            $hairColors   = $this->seedHairColors();
            $this->seedServiceHairColors($services, $hairColors);
            $this->seedServiceSpecialties($services, $specialties);
            $products     = $this->seedProducts();
            $inventories  = $this->seedInventories($products);
            $this->seedServiceProductUsages($services, $products);
            $schedules    = $this->seedBusinessSchedules();
            $this->seedAssignStaff($users, $schedules);
            $this->seedWalkinAuthorizations($users);

            // ✅ These must run in order
            $appointments = $this->seedAppointments($users);
            $transactions = $this->seedTransactions($appointments, $services, $users);
            $billings     = $this->seedBillings($appointments);
            $payments     = $this->seedPayments($billings);
            $this->seedEmployeeCommissions($transactions, $users);
            $this->seedInventoryTransactions($inventories, $transactions);
            $this->seedFeedback($users, $appointments);
            $this->seedStaffFeedback($users);
            $walkIns      = $this->seedWalkIns($users, $services);
            $this->seedWalkInTransactions($walkIns, $inventories);
            $this->seedExpenses($users);
            $this->seedRemittances($schedules, $users);
            $this->seedIncidentReports($users, $transactions, $inventories);
            $this->seedRefunds($payments, $appointments);
            $this->seedAppointmentRequests($users, $appointments);
        });

        $this->command->info('✅ Historical data seeded successfully.');
    }

    /* ============================================================
     |  USERS
     ============================================================ */
    protected function seedUsers(): array
    {
        $password = Hash::make('password123');

        // Owner
        $ownerId = DB::table('users')->insertGetId([
            'first_name'         => 'Maria',
            'last_name'          => 'Santos',
            'profile_image'      => null,
            'email'              => 'owner@salon.com',
            'email_verified_at'  => now(),
            'password'           => $password,
            'phone_number'       => '09171234567',
            'role'               => 'owner',
            'active_status'      => true,
            'remember_token'     => Str::random(10),
            'created_at'         => $this->startDate,
            'updated_at'         => $this->startDate,
        ]);

        // Staff
        $staffData = [
            ['Anna',   'Reyes',     '09181111111'],
            ['Bea',    'Cruz',      '09182222222'],
            ['Carla',  'Mendoza',   '09183333333'],
            ['Diana',  'Garcia',    '09184444444'],
            ['Ella',   'Torres',    '09185555555'],
        ];

        $staffIds = [];
        foreach ($staffData as $i => [$fn, $ln, $phone]) {
            $staffIds[] = DB::table('users')->insertGetId([
                'first_name'        => $fn,
                'last_name'         => $ln,
                'profile_image'     => null,
                'email'             => strtolower($fn) . '.staff@salon.com',
                'email_verified_at' => now(),
                'password'          => $password,
                'phone_number'      => $phone,
                'role'              => 'staff',
                'active_status'     => true,
                'remember_token'    => Str::random(10),
                'created_at'        => $this->startDate,
                'updated_at'        => $this->startDate,
            ]);
        }

        // Customers
        $customerNames = [
            ['Liza',    'Ramos'],   ['Grace',   'Lim'],
            ['Rina',    'Tan'],     ['Sofia',   'Bautista'],
            ['Mika',    'Villanueva'], ['Joy',  'Aquino'],
            ['Aira',    'Navarro'], ['Trisha',  'Castro'],
            ['Kim',     'Domingo'], ['Nina',    'Flores'],
            ['Paula',   'Reyes'],   ['Hannah',  'Gonzales'],
        ];

        $customerIds = [];
        foreach ($customerNames as $i => [$fn, $ln]) {
            $customerIds[] = DB::table('users')->insertGetId([
                'first_name'        => $fn,
                'last_name'         => $ln,
                'profile_image'     => null,
                'email'             => strtolower($fn . $ln) . '@example.com',
                'email_verified_at' => now(),
                'password'          => $password,
                'phone_number'      => '0919' . str_pad((string)($i + 1), 7, '0', STR_PAD_LEFT),
                'role'              => 'customer',
                'active_status'     => true,
                'remember_token'    => Str::random(10),
                'created_at'        => $this->startDate,
                'updated_at'        => $this->startDate,
            ]);
        }

        return [
            'owner'     => $ownerId,
            'staff'     => $staffIds,
            'customers' => $customerIds,
            'all'       => array_merge([$ownerId], $staffIds, $customerIds),
        ];
    }

    /* ============================================================
     |  SPECIALTIES
     ============================================================ */
    protected function seedSpecialties(): array
    {
        $names = ['Haircut', 'Hair Coloring', 'Rebond', 'Perm', 'Treatment', 'Styling', 'Nails', 'Makeup'];
        $ids = [];
        foreach ($names as $name) {
            $ids[] = DB::table('specialties')->insertGetId([
                'specialty_name' => $name,
                'created_at'     => $this->startDate,
                'updated_at'     => $this->startDate,
            ]);
        }
        return $ids;
    }

    protected function seedStaffSpecialties(array $users, array $specialties): array
    {
        $pivotIds = [];
        foreach ($users['staff'] as $staffId) {
            // each staff gets 2-4 random specialties
            $picked = collect($specialties)->random(rand(2, 4));
            foreach ($picked as $specId) {
                $pivotIds[] = DB::table('staff_specialties')->insertGetId([
                    'staff_id'     => $staffId,
                    'specialty_id' => $specId,
                    'is_active'    => true,
                    'created_at'   => $this->startDate,
                    'updated_at'   => $this->startDate,
                ]);
            }
        }
        return $pivotIds;
    }

    /* ============================================================
     |  SERVICES
     ============================================================ */
    protected function seedServices(): array
    {
        $services = [
            ['Haircut - Basic',         'Standard haircut for all lengths',           150,  30,  false, false],
            ['Haircut - Premium',       'Premium haircut with wash and blowdry',      350,  45,  false, false],
            ['Hair Coloring - Full',    'Full head hair color application',           1500, 120, false, true],
            ['Hair Coloring - Roots',   'Root touch-up coloring',                     800,  90,  false, true],
            ['Rebond - Short',          'Straightening treatment for short hair',     2500, 180, false, false],
            ['Rebond - Long',           'Straightening treatment for long hair',      4000, 240, false, false],
            ['Perm - Digital',          'Digital perm service',                       3000, 180, false, false],
            ['Hair Spa Treatment',      'Deep conditioning hair spa',                 600,  60,  false, false],
            ['Blowdry & Style',         'Blowdry and styling service',                250,  30,  false, false],
            ['Manicure',                'Basic manicure service',                     200,  45,  false, false],
            ['Pedicure',                'Basic pedicure service',                     250,  45,  false, false],
        ];

        $ids = [];
        foreach ($services as [$name, $desc, $price, $duration, $multi, $reqColor]) {
            $created = $this->randomDate();
            $ids[] = DB::table('services')->insertGetId([
                'service_name'      => $name,
                'description'       => $desc,
                'price'             => $price,
                'duration_minutes'  => $duration,
                'is_multitaskable'  => $multi,
                'reqHairColor'      => $reqColor,
                'service_status'    => 'active',
                'created_at'        => $created,
                'updated_at'        => $created,
            ]);
        }
        return $ids;
    }

    /* ============================================================
     |  HAIR COLORS
     ============================================================ */
    protected function seedHairColors(): array
    {
        $colors = [
            ['Natural Black', '#1C1C1C'],
            ['Dark Brown',    '#3B2F2F'],
            ['Chestnut',      '#954535'],
            ['Honey Blonde',  '#D4A76A'],
            ['Platinum',      '#E5E4E2'],
            ['Burgundy',      '#800020'],
            ['Ash Gray',      '#B2BEB5'],
            ['Copper',        '#B87333'],
        ];
        $ids = [];
        foreach ($colors as [$name, $code]) {
            $ids[] = DB::table('hair_colors')->insertGetId([
                'color_name' => $name,
                'color_code' => $code,
                'is_active'  => true,
                'created_at' => $this->startDate,
                'updated_at' => $this->startDate,
            ]);
        }
        return $ids;
    }

    protected function seedServiceHairColors(array $services, array $hairColors): void
    {
        // Only services with reqHairColor = true get hair colors
        $colorServices = DB::table('services')
            ->where('reqHairColor', true)
            ->pluck('id');

        foreach ($colorServices as $serviceId) {
            foreach (collect($hairColors)->random(rand(3, 6)) as $colorId) {
                DB::table('service_hair_colors')->insert([
                    'service_id'    => $serviceId,
                    'hair_color_id' => $colorId,
                    'created_at'    => $this->startDate,
                    'updated_at'    => $this->startDate,
                ]);
            }
        }
    }

    protected function seedServiceSpecialties(array $services, array $specialties): void
    {
        foreach ($services as $serviceId) {
            foreach (collect($specialties)->random(rand(1, 2)) as $specId) {
                DB::table('service_specialties')->insert([
                    'service_id'   => $serviceId,
                    'specialty_id' => $specId,
                    'created_at'   => $this->startDate,
                    'updated_at'   => $this->startDate,
                ]);
            }
        }
    }

    /* ============================================================
     |  PRODUCTS & INVENTORY
     ============================================================ */
    protected function seedProducts(): array
    {
        $products = [
            ['Shampoo Professional',  'Salon-grade shampoo',           'ml',     500,  100],
            ['Conditioner Pro',       'Deep conditioner',              'ml',     500,  100],
            ['Hair Color - Black',    'Permanent black dye',           'ml',     100,  10],
            ['Hair Color - Brown',    'Permanent brown dye',           'ml',     100,  10],
            ['Hair Color - Blonde',   'Bleach blonde dye',             'ml',     100,  10],
            ['Rebond Cream',          'Straightening cream',           'gr',     500,  20],
            ['Neutralizer',           'Rebond neutralizer',            'ml',     500,  20],
            ['Hair Spa Mask',         'Deep treatment mask',           'gr',     250,  10],
            ['Developer 20vol',       'Hair color developer',          'ml',     500,  50],
            ['Cotton Roll',           'Disposable cotton',             'sachet', 1,    1],
            ['Gloves Pair',           'Disposable gloves',             'sachet', 1,    1],
            ['Foil Sheets',           'Hair coloring foil',            'sachet', 1,    1],
        ];

        $ids = [];
        foreach ($products as [$name, $desc, $unit, $size, $usages]) {
            $created = $this->randomDate();
            $ids[] = DB::table('products')->insertGetId([
                'product_name'              => $name,
                'description'               => $desc,
                'unit'                      => $unit,
                'unit_size'                 => $size,
                'estimated_usages_per_unit' => $usages,
                'product_image'             => null,
                'is_active'                 => true,
                'created_at'                => $created,
                'updated_at'                => $created,
            ]);
        }
        return $ids;
    }

    protected function seedInventories(array $products): array
    {
        $ids = [];
        foreach ($products as $productId) {
            $created = $this->randomDate();
            $ids[] = DB::table('inventories')->insertGetId([
                'product_id'        => $productId,
                'product_quantity'  => rand(20, 100),
                'current_usages'    => rand(0, 50),
                'reorder_level'     => rand(5, 15),
                'expiration_date'   => Carbon::now()->addMonths(rand(3, 18))->toDateString(),
                'created_at'        => $created,
                'updated_at'        => $created,
            ]);
        }
        return $ids;
    }

    protected function seedServiceProductUsages(array $services, array $products): void
    {
        foreach ($services as $serviceId) {
            // Each service uses 1-4 products
            foreach (collect($products)->random(rand(1, 4)) as $productId) {
                DB::table('service_product_usages')->insert([
                    'service_id'       => $serviceId,
                    'product_id'       => $productId,
                    'estimated_usage'  => rand(1, 10),
                    'created_at'       => $this->startDate,
                    'updated_at'       => $this->startDate,
                ]);
            }
        }
    }

    /* ============================================================
     |  BUSINESS SCHEDULES
     ============================================================ */
    protected function seedBusinessSchedules(): array
    {
        $ids = [];
        $cursor = $this->startDate->copy();

        while ($cursor->lte($this->endDate)) {
            $isOpen = ! $cursor->isSunday(); // closed on Sundays
            $ids[$cursor->toDateString()] = DB::table('business_schedules')->insertGetId([
                'business_date' => $cursor->toDateString(),
                'open_time'     => '09:00:00',
                'close_time'    => '19:00:00',
                'is_open'       => $isOpen,
                'created_at'    => $cursor->copy(),
                'updated_at'    => $cursor->copy(),
            ]);
            $cursor->addDay();
        }
        return $ids;
    }

    protected function seedAssignStaff(array $users, array $schedules): void
    {
        foreach ($schedules as $date => $scheduleId) {
            $isOpen = DB::table('business_schedules')->where('id', $scheduleId)->value('is_open');
            if (! $isOpen) continue;

            // Assign 2-4 staff per business day
            foreach (collect($users['staff'])->random(rand(2, 4)) as $staffId) {
                DB::table('assign_staff')->insert([
                    'staff_id'         => $staffId,
                    'business_date_id' => $scheduleId,
                    'created_at'       => Carbon::parse($date),
                    'updated_at'       => Carbon::parse($date),
                ]);
            }
        }
    }

    protected function seedWalkinAuthorizations(array $users): void
    {
        foreach ($users['staff'] as $staffId) {
            DB::table('walkin_authorizations')->insert([
                'staff_id'                 => $staffId,
                'isAuthorizedForWalkIn'    => (bool) rand(0, 1),
                'created_at'               => $this->startDate,
                'updated_at'               => $this->startDate,
            ]);
        }
    }

    /* ============================================================
     |  APPOINTMENTS
     ============================================================ */
    protected function seedAppointments(array $users): array
    {
        $appointments = [];
        $cursor = $this->startDate->copy();

        // Generate ~5-15 appointments per open day
        while ($cursor->lte($this->endDate)) {
            if (! $cursor->isSunday()) {
                $count = rand(5, 15);
                for ($i = 0; $i < $count; $i++) {
                    $created = $cursor->copy()->setTime(rand(8, 17), [0, 15, 30, 45][rand(0, 3)]);
                    $status  = $this->randomAppointmentStatus($cursor);
                    $customerId = collect($users['customers'])->random();

                    // If cancelled, add cancellation info
                    $cancellationData = [];
                    if (in_array($status, ['cancelled', 'no-show'])) {
                        $cancellationData = [
                            'cancellation_reason' => collect(['Personal emergency', 'Feeling unwell', 'Schedule conflict', 'No longer needed'])->random(),
                            'cancelled_by'        => $customerId,
                            'cancelled_at'        => $created->copy()->addDays(rand(0, 2))->toDateString(),
                        ];
                    }

                    $appointments[] = [
                        'id'               => DB::table('appointments')->insertGetId(array_merge([
                            'customer_id'        => $customerId,
                            'appointment_date'   => $cursor->toDateString(),
                            'appointment_time'   => $created->format('H:i:s'),
                            'status'             => $status,
                            'grace_period_minutes' => 30,
                            'created_at'         => $created,
                            'updated_at'         => $created,
                        ], $cancellationData)),
                        'date'    => $cursor->copy(),
                        'status'  => $status,
                        'customer_id' => $customerId,
                    ];
                }
            }
            $cursor->addDay();
        }
        return $appointments;
    }

    protected function randomAppointmentStatus(Carbon $date): string
    {
        // If future date → pending/confirmed only
        if ($date->isFuture()) {
            return collect(['pending', 'confirmed'])->random();
        }

        $roll = rand(1, 100);
        return match (true) {
            $roll <= 75 => 'completed',
            $roll <= 85 => 'confirmed',
            $roll <= 92 => 'cancelled',
            $roll <= 97 => 'no-show',
            default     => 'pending',
        };
    }

    /* ============================================================
     |  TRANSACTIONS
     ============================================================ */
    protected function seedTransactions(array $appointments, array $services, array $users): array
    {
        $transactions = [];
        foreach ($appointments as $appt) {
            // Only completed appointments generate transactions
            if ($appt['status'] !== 'completed') continue;

            $serviceId = collect($services)->random();
            $staffId   = collect($users['staff'])->random();

            $completedAt = $appt['date']->copy()->addHours(rand(1, 4));

            $hairLengths   = ['short', 'medium', 'long', 'extra-long'];
            $hairThickness = ['thin', 'medium', 'thick'];

            $transactions[] = [
                'id' => DB::table('transactions')->insertGetId([
                    'appointment_id'       => $appt['id'],
                    'service_id'           => $serviceId,
                    'assigned_employee_id' => $staffId,
                    'notes'                => collect([null, 'Customer requested extra care', 'Allergic to strong chemicals', 'First time customer'])->random(),
                    'hair_length'          => collect($hairLengths)->random(),
                    'hair_thickness'       => collect($hairThickness)->random(),
                    'preferred_color'      => collect([null, 'Black', 'Brown', 'Blonde', 'Burgundy'])->random(),
                    'completed_at'         => $completedAt->toDateString(),
                    'created_at'           => $appt['date'],
                    'updated_at'           => $completedAt,
                ]),
                'service_id'   => $serviceId,
                'staff_id'     => $staffId,
                'appointment_id' => $appt['id'],
                'date'         => $appt['date'],
            ];
        }
        return $transactions;
    }

    /* ============================================================
     |  BILLINGS & PAYMENTS
     ============================================================ */
    protected function seedBillings(array $appointments): array
    {
        $billings = [];
        foreach ($appointments as $appt) {
            if (! in_array($appt['status'], ['completed', 'confirmed'])) continue;

            $total = rand(200, 5000);
            $paid  = $appt['status'] === 'completed' ? $total : (int) round($total * 0.3);
            $balance = $total - $paid;

            $created = $appt['date']->copy();
            $billings[] = [
                'id' => DB::table('billings')->insertGetId([
                    'appointment_id' => $appt['id'],
                    'total_amount'   => $total,
                    'paid_amount'    => $paid,
                    'balance'        => $balance,
                    'payment_type'   => $balance == 0 ? 'full' : ($paid > 0 ? 'downpayment' : 'remaining'),
                    'created_at'     => $created,
                    'updated_at'     => $created,
                ]),
                'total' => $total,
                'paid'  => $paid,
                'date'  => $created,
                'appointment_id' => $appt['id'],
            ];
        }
        return $billings;
    }

    protected function seedPayments(array $billings): array
    {
        $payments = [];
        foreach ($billings as $billing) {
            $remaining = $billing['paid'];
            if ($remaining <= 0) continue;

            // Split payments if downpayment
            $numPayments = $billing['paid'] < $billing['total'] ? 2 : 1;
            $amountPerPayment = (int) round($remaining / $numPayments);

            for ($i = 0; $i < $numPayments; $i++) {
                $paidAt = $billing['date']->copy()->addDays($i);
                $method = collect(['cash', 'GCash'])->random();

                $payments[] = [
                    'id' => DB::table('payments')->insertGetId([
                        'billing_id'     => $billing['id'],
                        'payment_method' => $method,
                        'payment_proof'  => $method === 'GCash' ? 'proofs/gcash_' . Str::random(8) . '.jpg' : null,
                        'created_at'     => $paidAt,
                        'updated_at'     => $paidAt,
                    ]),
                    'date' => $paidAt,
                ];
            }
        }
        return $payments;
    }

    /* ============================================================
     |  EMPLOYEE COMMISSIONS
     ============================================================ */
    protected function seedEmployeeCommissions(array $transactions, array $users): void
    {
        foreach ($transactions as $txn) {
            // 10% commission on service
            $servicePrice = DB::table('services')->where('id', $txn['service_id'])->value('price');
            $commission = round($servicePrice * 0.10, 2);

            DB::table('employee_commissions')->insert([
                'employee_id'       => $txn['staff_id'],
                'commission_amount' => $commission,
                'created_at'        => $txn['date'],
                'updated_at'        => $txn['date'],
            ]);
        }
    }

    /* ============================================================
     |  INVENTORY TRANSACTIONS
     ============================================================ */
    protected function seedInventoryTransactions(array $inventories, array $transactions): void
    {
        foreach ($transactions as $txn) {
            // Randomly consume 1-2 inventory items per transaction
            foreach (collect($inventories)->random(rand(1, 2)) as $invId) {
                DB::table('inventory_transactions')->insert([
                    'inventory_id'      => $invId,
                    'transaction_id'    => $txn['id'],
                    'quantity_change'   => -rand(1, 10),
                    'transaction_type'  => 'usage',
                    'created_at'        => $txn['date'],
                    'updated_at'        => $txn['date'],
                ]);
            }
        }

        // Also add some restocks spread across time
        $cursor = $this->startDate->copy();
        while ($cursor->lte($this->endDate)) {
            if (rand(1, 100) <= 20) { // ~20% chance per day
                foreach (collect($inventories)->random(rand(1, 3)) as $invId) {
                    DB::table('inventory_transactions')->insert([
                        'inventory_id'     => $invId,
                        'transaction_id'   => null, // restock isn't tied to a transaction
                        'quantity_change'  => rand(20, 50),
                        'transaction_type' => 'restock',
                        'created_at'       => $cursor->copy(),
                        'updated_at'       => $cursor->copy(),
                    ]);
                }
            }
            $cursor->addDay();
        }
    }

    /* ============================================================
     |  FEEDBACK
     ============================================================ */
    protected function seedFeedback(array $users, array $appointments): void
    {
        foreach ($appointments as $appt) {
            if ($appt['status'] !== 'completed') continue;
            if (rand(1, 100) > 60) continue; // 60% of completed get feedback

            DB::table('feedback')->insert([
                'customer_id'    => $appt['customer_id'],
                'appointment_id' => $appt['id'],
                'rating'         => rand(30, 50) / 10, // 3.0 - 5.0
                'comments'       => collect([
                    'Great service!',
                    'Very satisfied.',
                    'Will come back again.',
                    'Staff was friendly.',
                    'Loved the result!',
                    'Could be better.',
                    'Okay experience.',
                ])->random(),
                'created_at'     => $appt['date']->copy()->addDay(),
                'updated_at'     => $appt['date']->copy()->addDay(),
            ]);
        }
    }

    protected function seedStaffFeedback(array $users): void
    {
        foreach ($users['staff'] as $staffId) {
            for ($i = 0; $i < rand(3, 10); $i++) {
                $date = $this->randomDate();
                DB::table('staff_feedback')->insert([
                    'staff_id'   => $staffId,
                    'rating'     => rand(30, 50) / 10,
                    'created_at' => $date,
                    'updated_at' => $date,
                ]);
            }
        }
    }

    /* ============================================================
     |  WALK-INS
     ============================================================ */
    protected function seedWalkIns(array $users, array $services): array
    {
        $walkIns = [];
        $names = ['Walk-in Customer 1', 'Walk-in Customer 2', 'Walk-in Customer 3', 'Walk-in Customer 4', 'Walk-in Customer 5'];

        $cursor = $this->startDate->copy();
        while ($cursor->lte($this->endDate)) {
            if (! $cursor->isSunday()) {
                $count = rand(1, 5);
                for ($i = 0; $i < $count; $i++) {
                    $created = $cursor->copy()->setTime(rand(9, 18), 0);
                    $isFinished = $cursor->isPast() ? (bool) rand(0, 1) : false;

                    $walkIns[] = [
                        'id' => DB::table('walk_ins')->insertGetId([
                            'customer_name' => collect($names)->random() . ' ' . Str::random(4),
                            'service_id'    => collect($services)->random(),
                            'stylist_id'    => collect($users['staff'])->random(),
                            'is_finished'   => $isFinished,
                            'amount_paid'   => $isFinished ? rand(150, 3000) : null,
                            'created_at'    => $created,
                            'updated_at'    => $created,
                        ]),
                        'date' => $created,
                    ];
                }
            }
            $cursor->addDay();
        }
        return $walkIns;
    }

    protected function seedWalkInTransactions(array $walkIns, array $inventories): void
    {
        foreach ($walkIns as $walkIn) {
            foreach (collect($inventories)->random(rand(1, 2)) as $invId) {
                DB::table('walk_in_transactions')->insert([
                    'walkin_id'       => $walkIn['id'],
                    'inventory_id'    => $invId,
                    'quantity_change' => -rand(1, 5),
                    'created_at'      => $walkIn['date'],
                    'updated_at'      => $walkIn['date'],
                ]);
            }
        }
    }

    /* ============================================================
     |  EXPENSES
     ============================================================ */
    protected function seedExpenses(array $users): void
    {
        $expenses = [
            ['Electricity Bill',  0,  2500],
            ['Water Bill',        0,  800],
            ['Rent',              0,  15000],
            ['Shampoo Restock',   50, 3500],
            ['Color Supplies',    30, 5000],
            ['Cleaning Supplies', 0,  500],
        ];

        $cursor = $this->startDate->copy();
        while ($cursor->lte($this->endDate)) {
            if (rand(1, 100) <= 15) {
                [$name, $stock, $amount] = collect($expenses)->random();
                DB::table('expenses')->insert([
                    'expense_name' => $name,
                    'stock_amount' => $stock,
                    'amount'       => $amount,
                    'expense_date' => $cursor->toDateString(),
                    'description'  => 'Auto-generated expense',
                    'recorded_by'  => $users['owner'],
                    'created_at'   => $cursor->copy(),
                    'updated_at'   => $cursor->copy(),
                ]);
            }
            $cursor->addDay();
        }
    }

    /* ============================================================
     |  REMITTANCES
     ============================================================ */
    protected function seedRemittances(array $schedules, array $users): void
    {
        foreach ($schedules as $date => $scheduleId) {
            if (rand(1, 100) <= 70) { // 70% of days have remittance
                DB::table('remittances')->insert([
                    'business_date_id'   => $scheduleId,
                    'user_id'            => collect($users['staff'])->random(),
                    'remittance_amount'  => rand(500, 8000),
                    'created_at'         => Carbon::parse($date)->endOfDay(),
                    'updated_at'         => Carbon::parse($date)->endOfDay(),
                ]);
            }
        }
    }

    /* ============================================================
     |  INCIDENT REPORTS
     ============================================================ */
    protected function seedIncidentReports(array $users, array $transactions, array $inventories): void
    {
        $types = ['damage', 'theft', 'others'];
        $cats  = ['product', 'service', 'other'];

        // ~15 incident reports
        for ($i = 0; $i < 15; $i++) {
            $date = $this->randomDate();
            $category = collect($cats)->random();

            DB::table('incident_reports')->insert([
                'date'            => $date->toDateString(),
                'incident_type'   => collect($types)->random(),
                'category'        => $category,
                'amount'          => rand(100, 3000),
                'description'     => 'Auto-generated incident report for testing purposes.',
                'staff_id'        => collect($users['staff'])->random(),
                'transaction_id'  => $category === 'service' && count($transactions) ? collect($transactions)->random()['id'] : null,
                'inventory_id'    => $category === 'product' ? collect($inventories)->random() : null,
                'status'          => collect(['reported', 'written-off', 'resolved'])->random(),
                'created_at'      => $date,
                'updated_at'      => $date,
            ]);
        }
    }

    /* ============================================================
     |  REFUNDS
     ============================================================ */
    protected function seedRefunds(array $payments, array $appointments): void
    {
        // Only refund ~5% of payments
        foreach ($payments as $payment) {
            if (rand(1, 100) > 5) continue;

            $appointment = collect($appointments)->firstWhere('id', function () use ($payment) {
                // find appointment via billing
                return true;
            });

            $apptId = DB::table('billings')->where('id', function () use ($payment) {
                return DB::table('payments')->where('id', $payment['id'])->value('billing_id');
            })->value('appointment_id');

            if (! $apptId) continue;

            DB::table('refunds')->insert([
                'payment_id'       => $payment['id'],
                'appointment_id'   => $apptId,
                'refund_amount'    => rand(100, 1000),
                'refund_method'    => collect(['Cash', 'GCash'])->random(),
                'reference_number' => 'REF-' . strtoupper(Str::random(8)),
                'refund_reason'    => collect(['Customer dissatisfied', 'Service not rendered', 'Duplicate payment', 'Cancelled appointment'])->random(),
                'status'           => collect(['pending', 'completed', 'rejected'])->random(),
                'processed_at'     => $payment['date']->copy()->addDays(rand(1, 5))->toDateString(),
                'created_at'       => $payment['date']->copy()->addDays(rand(1, 5)),
                'updated_at'       => $payment['date']->copy()->addDays(rand(1, 5)),
            ]);
        }
    }

    /* ============================================================
     |  APPOINTMENT REQUESTS
     ============================================================ */
    protected function seedAppointmentRequests(array $users, array $appointments): void
    {
        // Pick ~20 future/confirmed appointments to have requests
        $candidates = collect($appointments)->filter(fn ($a) => in_array($a['status'], ['pending', 'confirmed']))->take(20);

        foreach ($candidates as $appt) {
            $created = $appt['date']->copy()->subDays(rand(1, 5));

            DB::table('appointment_requests')->insert([
                'customer_id'     => $appt['customer_id'],
                'appointment_id'  => $appt['id'],
                'request_type'    => collect(['cancel', 'reschedule'])->random(),
                'reason'          => collect(['Emergency', 'Schedule conflict', 'Feeling unwell', 'Weather'])->random(),
                'preferred_date'  => rand(0, 1) ? $appt['date']->copy()->addDays(rand(1, 7))->toDateString() : null,
                'preferred_time'  => rand(0, 1) ? '14:00:00' : null,
                'request_status'  => collect(['pending', 'approved', 'rejected'])->random(),
                'reviewed_at'     => $created->copy()->addDay(),
                'created_at'      => $created,
                'updated_at'      => $created->copy()->addDay(),
            ]);
        }
    }

    /* ============================================================
     |  HELPERS
     ============================================================ */
    protected function randomDate(): Carbon
    {
        $days = $this->startDate->diffInDays($this->endDate);
        return $this->startDate->copy()->addDays(rand(0, $days))
            ->setTime(rand(9, 18), [0, 15, 30, 45][rand(0, 3)]);
    }
}