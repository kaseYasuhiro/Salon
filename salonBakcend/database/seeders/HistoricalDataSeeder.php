<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Seeds the last 2 months of salon data (100 appointments, plus a few upcoming days)
 * for every table in the salonbackcend2 schema:
 *
 * users, specialties, staff_specialties, walkin_authorizations,
 * products, inventories, services, service_specialties,
 * service_product_usages, business_schedules, assign_staff,
 * appointments, transactions, billings, payments, walk_ins,
 * walk_in_transactions, inventory_transactions, employee_commissions,
 * feedback, staff_feedback, remittances, expenses
 */
class HistoricalDataSeeder extends Seeder
{
    /** How far back the historical data starts. */
    protected const HISTORY_MONTHS = 2;

    /** Total number of appointments to seed (history + upcoming). */
    protected const APPOINTMENT_COUNT = 100;

    /** Of those, how many fall in the upcoming days (ignored when FUTURE_DAYS = 0). */
    protected const UPCOMING_APPOINTMENTS = 8;

    /** Number of upcoming days (after today) that get schedules + pending/confirmed bookings. 0 = none. */
    protected const FUTURE_DAYS = 7;

    /** Staff commission rate (0.40 = 40%). */
    protected const COMMISSION_RATE = 0.40;

    /** Downpayment portion of an appointment total. */
    protected const DOWNPAYMENT_RATE = 0.30;

    /** Month-day dates the salon is closed (besides Sundays). */
    protected const CLOSED_DATES = ['01-01', '12-25'];

    /** Preferred hair colour => dye product that gets consumed. */
    protected const COLOR_DYE = [
        'Natural Black' => 'Hair Color - Black',
        'Dark Brown'    => 'Hair Color - Brown',
        'Chestnut'      => 'Hair Color - Brown',
        'Burgundy'      => 'Hair Color - Brown',
        'Copper'        => 'Hair Color - Brown',
        'Honey Blonde'  => 'Hair Color - Blonde',
        'Platinum'      => 'Hair Color - Blonde',
        'Ash Gray'      => 'Hair Color - Blonde',
    ];

    protected Carbon $now;
    protected Carbon $startDate;
    protected Carbon $today;
    protected Carbon $lastDate;

    /** @var array<string,bool> 'Y-m-d' => is the salon open */
    protected array $openDays = [];
    /** @var array<string,int> 'Y-m-d' => business_schedules.id */
    protected array $scheduleIds = [];
    /** @var array<string,int[]> 'Y-m-d' => staff ids on duty */
    protected array $assignedByDate = [];
    /** @var array<string,float> 'Y-m-d' => cash collected that day (appointments + walk-ins) */
    protected array $cashByDate = [];

    protected array $specialtyIds = [];      // name => id
    protected array $staffIds = [];
    protected array $staffSpecialties = [];  // staffId => [specialtyId]
    protected array $walkInAuthorized = [];  // staffIds
    protected array $customerNames = [];     // customerId => full name

    protected array $productIds = [];        // name => id
    protected array $productNames = [];      // id => name
    protected array $productUsages = [];     // id => estimated_usages_per_unit
    protected array $inventoryByProduct = []; // productId => inventoryId
    protected array $lowStockInventoryIds = [];

    /** @var array<int,array> serviceId => [name, price, duration, reqColor, active, specialties[], usages[productId=>qty]] */
    protected array $serviceMeta = [];

    public function run(): void
    {
        $this->now       = Carbon::now();
        $this->startDate = $this->now->copy()->subMonths(self::HISTORY_MONTHS)->startOfDay();
        $this->today     = $this->now->copy()->startOfDay();
        $this->lastDate  = $this->today->copy()->addDays(self::FUTURE_DAYS);

        DB::transaction(function () {
            $users = $this->seedUsers();
            $this->seedSpecialties();
            $this->seedStaffSpecialties($users);
            $this->seedWalkinAuthorizations($users);

            $products = $this->seedProducts();
            $this->seedInventories($products);
            $this->seedServices(); // + service_specialties + service_product_usages

            $this->seedBusinessSchedules();
            $this->seedAssignStaff();

            // ⚠️ Order matters from here on
            $appointments            = $this->seedAppointments($users);
            [$transactions, $totals] = $this->seedTransactions($appointments);
            $billings                = $this->seedBillings($appointments, $totals);
            $this->seedPayments($billings);
            $walkIns                 = $this->seedWalkIns($users);

            $this->seedEmployeeCommissions($users);
            $this->seedInventoryTransactions($transactions);
            $this->seedWalkInTransactions($walkIns);
            $this->seedFeedback($appointments);
            $this->seedStaffFeedback($users);
            $this->seedRemittances(); // needs cash totals from payments + walk-ins
            $this->seedExpenses($users);
        });

        $this->command->info('✅ Historical data seeded successfully.');
    }

    /* ============================================================
     |  USERS
     ============================================================ */
    protected function seedUsers(): array
    {
        $password = Hash::make('password123');

        $ownerId = DB::table('users')->insertGetId([
            'first_name'        => 'Maria',
            'last_name'         => 'Santos',
            'profile_image'     => null,
            'email'             => 'owner@salon.com',
            'email_verified_at' => $this->startDate,
            'password'          => $password,
            'phone_number'      => '09171234567',
            'role'              => 'owner',
            'active_status'     => true,
            'remember_token'    => Str::random(10),
            'created_at'        => $this->startDate,
            'updated_at'        => $this->startDate,
        ]);

        // Order matters: see seedStaffSpecialties() / seedWalkinAuthorizations()
        $staffData = [
            ['Anna',   'Reyes',   '09181111111'],
            ['Bea',    'Cruz',    '09182222222'],
            ['Carla',  'Mendoza', '09183333333'], // all-rounder (Stylist + Barber, walk-in authorized)
            ['Diana',  'Garcia',  '09184444444'],
            ['Ella',   'Torres',  '09185555555'],
        ];

        $staffIds = [];
        foreach ($staffData as [$fn, $ln, $phone]) {
            $staffIds[] = DB::table('users')->insertGetId([
                'first_name'        => $fn,
                'last_name'         => $ln,
                'profile_image'     => null,
                'email'             => strtolower($fn) . '.staff@salon.com',
                'email_verified_at' => $this->startDate,
                'password'          => $password,
                'phone_number'      => $phone,
                'role'              => 'staff',
                'active_status'     => true,
                'remember_token'    => Str::random(10),
                'created_at'        => $this->startDate,
                'updated_at'        => $this->startDate,
            ]);
        }

        $customerNames = [
            ['Liza', 'Ramos'],      ['Grace', 'Lim'],       ['Rina', 'Tan'],
            ['Sofia', 'Bautista'],  ['Mika', 'Villanueva'], ['Joy', 'Aquino'],
            ['Aira', 'Navarro'],    ['Trisha', 'Castro'],   ['Kim', 'Domingo'],
            ['Nina', 'Flores'],     ['Paula', 'Reyes'],     ['Hannah', 'Gonzales'],
            ['Bianca', 'Ocampo'],   ['Camille', 'Rivera'],  ['Erika', 'Pascual'],
            ['Marco', 'Dizon'],     ['Paolo', 'Lacson'],    ['Jerome', 'Salazar'],
        ];

        $customerIds = [];
        foreach ($customerNames as $i => [$fn, $ln]) {
            $id = DB::table('users')->insertGetId([
                'first_name'        => $fn,
                'last_name'         => $ln,
                'profile_image'     => null,
                'email'             => strtolower(str_replace(' ', '', $fn . $ln)) . '@example.com',
                'email_verified_at' => $this->startDate,
                'password'          => $password,
                'phone_number'      => '0919' . str_pad((string) ($i + 1), 7, '0', STR_PAD_LEFT), // 11 chars
                'role'              => 'customer',
                'active_status'     => true,
                'remember_token'    => Str::random(10),
                'created_at'        => $this->startDate,
                'updated_at'        => $this->startDate,
            ]);
            $customerIds[]           = $id;
            $this->customerNames[$id] = "$fn $ln";
        }

        $this->staffIds = $staffIds;

        return [
            'owner'     => $ownerId,
            'staff'     => $staffIds,
            'customers' => $customerIds,
        ];
    }

    /* ============================================================
     |  SPECIALTIES
     ============================================================ */
    protected function seedSpecialties(): void
    {
        foreach (['Stylist', 'Barber'] as $name) {
            $this->specialtyIds[$name] = DB::table('specialties')->insertGetId([
                'specialty_name' => $name,
                'created_at'     => $this->startDate,
                'updated_at'     => $this->startDate,
            ]);
        }
    }

    protected function seedStaffSpecialties(array $users): void
    {
        // Same order as the staff list in seedUsers()
        $plan = [
            ['Stylist'],
            ['Stylist'],
            ['Stylist', 'Barber'],
            ['Barber'],
            ['Stylist', 'Barber'],
        ];

        $rows = [];
        foreach ($users['staff'] as $i => $staffId) {
            foreach ($plan[$i] as $specName) {
                $specId = $this->specialtyIds[$specName];
                $this->staffSpecialties[$staffId][] = $specId;
                $rows[] = [
                    'staff_id'     => $staffId,
                    'specialty_id' => $specId,
                    'is_active'    => true,
                    'created_at'   => $this->startDate,
                    'updated_at'   => $this->startDate,
                ];
            }
        }
        $this->bulkInsert('staff_specialties', $rows);
    }

    protected function seedWalkinAuthorizations(array $users): void
    {
        // Anna, Carla and Ella can take walk-ins (they cover both specialties between them)
        $authorized = [true, false, true, false, true];

        $rows = [];
        foreach ($users['staff'] as $i => $staffId) {
            if ($authorized[$i]) {
                $this->walkInAuthorized[] = $staffId;
            }
            $rows[] = [
                'staff_id'              => $staffId,
                'isAuthorizedForWalkIn' => $authorized[$i],
                'created_at'            => $this->startDate,
                'updated_at'            => $this->startDate,
            ];
        }
        $this->bulkInsert('walkin_authorizations', $rows);
    }

    /* ============================================================
     |  PRODUCTS & INVENTORY
     ============================================================ */
    protected function seedProducts(): array
    {
        // name, description, unit (ml|l|gr|sachet|mg), unit_size, estimated_usages_per_unit
        $products = [
            ['Shampoo Professional', 'Salon-grade shampoo',            'ml',     1000, 100],
            ['Conditioner Pro',      'Deep conditioner',               'ml',     1000, 100],
            ['Hair Color - Black',   'Permanent black dye',            'ml',     100,  10],
            ['Hair Color - Brown',   'Permanent brown dye',            'ml',     100,  10],
            ['Hair Color - Blonde',  'Bleach blonde dye',              'ml',     100,  10],
            ['Developer 20vol',      'Hair color developer',           'l',      1,    20],
            ['Rebond Cream',         'Hair straightening cream',       'gr',     500,  20],
            ['Neutralizer',          'Rebond neutralizer',             'ml',     500,  20],
            ['Hair Spa Mask',        'Deep treatment mask',            'gr',     250,  10],
            ['Keratin Solution',     'Smoothing keratin solution',     'ml',     500,  10],
            ['Hair Serum',           'Finishing serum',                'ml',     100,  20],
            ['Cellophane Gloss',     'Cellophane hair gloss',          'ml',     250,  10],
            ['Hot Oil Treatment',    'Hot oil hair treatment',         'ml',     500,  10],
            ['Cotton Roll',          'Disposable cotton',              'sachet', 1,    1],
            ['Gloves Pair',          'Disposable gloves',              'sachet', 1,    1],
        ];

        foreach ($products as [$name, $desc, $unit, $size, $usages]) {
            $id = DB::table('products')->insertGetId([
                'product_name'              => $name,
                'description'               => $desc,
                'unit'                      => $unit,
                'unit_size'                 => $size,
                'estimated_usages_per_unit' => $usages,
                'product_image'             => null,
                'is_active'                 => true,
                'created_at'                => $this->startDate,
                'updated_at'                => $this->startDate,
            ]);
            $this->productIds[$name] = $id;
            $this->productNames[$id] = $name;
            $this->productUsages[$id] = $usages;
        }

        return $this->productIds;
    }

    protected function seedInventories(array $products): void
    {
        // A few items are intentionally low on stock so reorder alerts have something to show
        $lowStock = ['Keratin Solution' => 3, 'Hair Color - Blonde' => 3, 'Neutralizer' => 4];

        foreach ($products as $name => $productId) {
            $usages = $this->productUsages[$productId];
            $id = DB::table('inventories')->insertGetId([
                'product_id'       => $productId,
                'product_quantity' => $lowStock[$name] ?? rand(20, 100),
                'current_usages'   => rand(0, max(0, $usages - 1)),
                'reorder_level'    => rand(5, 15),
                'expiration_date'  => $this->now->copy()->addMonths(rand(3, 18))->toDateString(),
                'created_at'       => $this->startDate,
                'updated_at'       => $this->startDate,
            ]);
            $this->inventoryByProduct[$productId] = $id;
            if (isset($lowStock[$name])) {
                $this->lowStockInventoryIds[] = $id;
            }
        }
    }

    /* ============================================================
     |  SERVICES
     ============================================================ */
    protected function seedServices(): void
    {
        // name, description, price, duration, is_multitaskable, reqHairColor, specialties, usages [product => qty], deactivated_by_product
        // Only "Haircut (Male)" is a Barber service. Everything else (incl. Haircut (Female)) is Stylist.
        $definitions = [
            ['Haircut (Male)',            'Classic men\'s haircut with wash and finish',        120,  30,  false, false, ['Barber'],
                ['Shampoo Professional' => 1, 'Cotton Roll' => 1], null],
            ['Haircut (Female)',          'Women\'s haircut with wash and blowdry',             150,  45,  false, false, ['Stylist'],
                ['Shampoo Professional' => 1, 'Conditioner Pro' => 1, 'Hair Serum' => 1], null],
            ['Brazillian Hair Rebond',    'Brazilian keratin straightening treatment',          2000, 240, true,  false, ['Stylist'],
                ['Keratin Solution' => 3, 'Rebond Cream' => 2, 'Neutralizer' => 2, 'Shampoo Professional' => 2, 'Conditioner Pro' => 1, 'Hair Serum' => 1, 'Gloves Pair' => 1], null],
            ['Hair Rebond (Cellopane)',   'Hair rebond with cellophane finish',                 1000, 210, true,  false, ['Stylist'],
                ['Rebond Cream' => 3, 'Neutralizer' => 3, 'Cellophane Gloss' => 1, 'Shampoo Professional' => 1, 'Conditioner Pro' => 1, 'Gloves Pair' => 1], null],
            ['Hair Color',                'Full head hair color application',                   600, 120, true,  true,  ['Stylist'],
                ['Hair Color - Black' => 2, 'Hair Color - Brown' => 2, 'Hair Color - Blonde' => 2, 'Developer 20vol' => 2, 'Gloves Pair' => 1, 'Shampoo Professional' => 1, 'Conditioner Pro' => 1], null],
            ['Hair Spa',                  'Deep conditioning hair spa',                         300,  60,  true,  false, ['Stylist'],
                ['Hair Spa Mask' => 2, 'Shampoo Professional' => 1, 'Conditioner Pro' => 1], null],
            ['Hair Cellopane',            'Cellophane gloss treatment for shine and tint',      600,  60,  true,  false, ['Stylist'],
                ['Cellophane Gloss' => 2, 'Shampoo Professional' => 1, 'Conditioner Pro' => 1, 'Gloves Pair' => 1], null],
            ['Hot Oil',                   'Hot oil scalp and hair treatment',                   300,  45,  true,  false, ['Stylist'],
                ['Hot Oil Treatment' => 2, 'Shampoo Professional' => 1, 'Conditioner Pro' => 1, 'Gloves Pair' => 1], null],
        ];

        $specialtyRows = [];
        $usageRows     = [];

        foreach ($definitions as [$name, $desc, $price, $duration, $multi, $reqColor, $specNames, $usages, $deactivatedBy]) {
            $inactive = $deactivatedBy !== null;

            $serviceId = DB::table('services')->insertGetId([
                'service_name'          => $name,
                'description'           => $desc,
                'price'                 => $price,
                'duration_minutes'      => $duration,
                'is_multitaskable'      => $multi,
                'reqHairColor'          => $reqColor,
                'service_status'        => $inactive ? 'inactive' : 'active',
                'deactivated_by_product' => $inactive ? $this->productIds[$deactivatedBy] : null,
                'created_at'            => $this->startDate,
                'updated_at'            => $inactive ? $this->now->copy()->subDays(14) : $this->startDate,
            ]);

            $specIds = [];
            foreach ($specNames as $specName) {
                $specIds[] = $this->specialtyIds[$specName];
                $specialtyRows[] = [
                    'service_id'   => $serviceId,
                    'specialty_id' => $this->specialtyIds[$specName],
                    'created_at'   => $this->startDate,
                    'updated_at'   => $this->startDate,
                ];
            }

            $usageByProductId = [];
            foreach ($usages as $productName => $qty) {
                $productId = $this->productIds[$productName];
                $usageByProductId[$productId] = $qty;
                $usageRows[] = [
                    'service_id'      => $serviceId,
                    'product_id'      => $productId,
                    'estimated_usage' => $qty,
                    'created_at'      => $this->startDate,
                    'updated_at'      => $this->startDate,
                ];
            }

            $this->serviceMeta[$serviceId] = [
                'name'        => $name,
                'price'       => $price,
                'duration'    => $duration,
                'reqColor'    => $reqColor,
                'active'      => ! $inactive,
                'specialties' => $specIds,
                'usages'      => $usageByProductId,
            ];
        }

        $this->bulkInsert('service_specialties', $specialtyRows);
        $this->bulkInsert('service_product_usages', $usageRows);
    }

    /* ============================================================
     |  BUSINESS SCHEDULES & STAFF ASSIGNMENT
     ============================================================ */
    protected function seedBusinessSchedules(): void
    {
        $cursor = $this->startDate->copy();

        while ($cursor->lte($this->lastDate)) {
            $date   = $cursor->toDateString();
            $isOpen = ! $cursor->isSunday() && ! in_array($cursor->format('m-d'), self::CLOSED_DATES, true);

            $this->scheduleIds[$date] = DB::table('business_schedules')->insertGetId([
                'business_date' => $date,
                'open_time'     => '09:00:00',
                'close_time'    => '19:00:00',
                'is_open'       => $isOpen,
                'created_at'    => $this->capNow($cursor),
                'updated_at'    => $this->capNow($cursor),
            ]);
            $this->openDays[$date] = $isOpen;

            $cursor->addDay();
        }
    }

    protected function seedAssignStaff(): void
    {
        $rows = [];

        foreach ($this->openDays as $date => $isOpen) {
            if (! $isOpen) {
                continue;
            }

            $picked = collect($this->staffIds)->random(rand(3, 4))->values()->all();

            // Every open day needs a stylist, a barber and someone allowed to take walk-ins.
            // Carla (index 2) covers all three.
            if (! $this->hasRequiredCoverage($picked)) {
                $picked[array_rand($picked)] = $this->staffIds[2];
                $picked = array_values(array_unique($picked));
            }

            $this->assignedByDate[$date] = $picked;

            foreach ($picked as $staffId) {
                $rows[] = [
                    'staff_id'         => $staffId,
                    'business_date_id' => $this->scheduleIds[$date],
                    'created_at'       => $this->capNow(Carbon::parse($date)),
                    'updated_at'       => $this->capNow(Carbon::parse($date)),
                ];
            }
        }

        $this->bulkInsert('assign_staff', $rows);
    }

    protected function hasRequiredCoverage(array $staff): bool
    {
        $stylist = $barber = $authorized = false;

        foreach ($staff as $id) {
            $stylist    = $stylist    || in_array($this->specialtyIds['Stylist'], $this->staffSpecialties[$id], true);
            $barber     = $barber     || in_array($this->specialtyIds['Barber'], $this->staffSpecialties[$id], true);
            $authorized = $authorized || in_array($id, $this->walkInAuthorized, true);
        }

        return $stylist && $barber && $authorized;
    }

    /* ============================================================
     |  APPOINTMENTS
     ============================================================ */
    protected function seedAppointments(array $users): array
    {
        $appointments = [];

        foreach ($this->appointmentsPerDay() as $date => $count) {
            $day = Carbon::parse($date);

            for ($i = 0; $i < $count; $i++) {
                $at         = $day->copy()->setTime(rand(9, 16), $this->pick([0, 15, 30, 45]));
                $createdAt  = $this->bookingCreatedAt($at);
                $status     = $this->randomAppointmentStatus($at);
                $customerId = $this->pick($users['customers']);

                $cancellation = [
                    'cancellation_reason' => null,
                    'cancelled_by'        => null,
                    'cancelled_at'        => null,
                ];
                $updatedAt = $createdAt->copy();

                if ($status === 'cancelled') {
                    $cancelTs = rand($createdAt->timestamp, max($createdAt->timestamp, min($at->timestamp, $this->now->timestamp)));
                    $cancelAt = Carbon::createFromTimestamp($cancelTs);
                    $cancellation = [
                        'cancellation_reason' => $this->pick(['Personal emergency', 'Feeling unwell', 'Schedule conflict', 'No longer needed', 'Weather']),
                        'cancelled_by'        => rand(1, 100) <= 85 ? $customerId : $users['owner'],
                        'cancelled_at'        => $cancelAt->toDateString(),
                    ];
                    $updatedAt = $cancelAt;
                }

                // Grace period + reminder tracking
                $graceStarted = null;
                $graceEnded   = null;
                $reminderSent = null;

                if (in_array($status, ['completed', 'confirmed', 'no-show'], true) && rand(1, 100) <= 90) {
                    $reminder = $at->copy()->subDay()->setTime(9, 0);
                    if ($reminder->gte($createdAt) && $reminder->lte($this->now)) {
                        $reminderSent = $reminder;
                    }
                }
                if ($status === 'no-show') {
                    $graceStarted = $at->copy();
                    $graceEnded   = $at->copy()->addMinutes(30);
                    $updatedAt    = $this->capNow($graceEnded);
                } elseif ($status === 'completed') {
                    if (rand(1, 100) <= 8) {            // customer was late but still showed up
                        $graceStarted = $at->copy();
                    }
                    $updatedAt = $this->capNow($at->copy()->addHours(2));
                }

                $id = DB::table('appointments')->insertGetId(array_merge([
                    'customer_id'            => $customerId,
                    'appointment_date'       => $date,
                    'appointment_time'       => $at->format('H:i:s'),
                    'status'                 => $status,
                    'grace_started_notified_at' => $graceStarted,
                    'grace_ended_notified_at'   => $graceEnded,
                    'reminder_sent_at'       => $reminderSent,
                    'grace_period_minutes'   => 30,
                    'created_at'             => $createdAt,
                    'updated_at'             => $updatedAt,
                ], $cancellation));

                $appointments[] = [
                    'id'          => $id,
                    'at'          => $at,
                    'status'      => $status,
                    'customer_id' => $customerId,
                    'created_at'  => $createdAt,
                ];
            }
        }

        return $appointments;
    }

    /**
     * Spread exactly APPOINTMENT_COUNT appointments over the open days:
     * most in the past two months, a few in the upcoming days.
     *
     * @return array<string,int> 'Y-m-d' => number of appointments (sorted by date)
     */
    protected function appointmentsPerDay(): array
    {
        $pastDays = [];
        $upcomingDays = [];

        foreach ($this->openDays as $date => $isOpen) {
            if (! $isOpen) {
                continue;
            }
            if (Carbon::parse($date)->gt($this->today)) {
                $upcomingDays[] = $date;
            } else {
                $pastDays[] = $date;
            }
        }

        $upcoming = $upcomingDays ? min(self::UPCOMING_APPOINTMENTS, self::APPOINTMENT_COUNT) : 0;
        $history  = self::APPOINTMENT_COUNT - $upcoming;

        $perDay = [];
        for ($i = 0; $i < $history; $i++) {
            $d = $this->pick($pastDays);
            $perDay[$d] = ($perDay[$d] ?? 0) + 1;
        }
        for ($i = 0; $i < $upcoming; $i++) {
            $d = $this->pick($upcomingDays);
            $perDay[$d] = ($perDay[$d] ?? 0) + 1;
        }

        ksort($perDay);

        return $perDay;
    }

    protected function bookingCreatedAt(Carbon $at): Carbon
    {
        $created = $at->copy()->subDays(rand(1, 7))->setTime(rand(8, 20), rand(0, 59));

        if ($created->lt($this->startDate)) {
            $created = $this->startDate->copy()->setTime(rand(8, 20), rand(0, 59));
        }
        if ($created->gt($this->now)) {
            $created = $this->now->copy()->subMinutes(rand(5, 600));
        }
        if ($created->gt($at)) {
            $created = $at->copy()->subHours(2);
        }

        return $created;
    }

    protected function randomAppointmentStatus(Carbon $at): string
    {
        $roll = rand(1, 100);

        // Upcoming
        if ($at->gt($this->now)) {
            return match (true) {
                $roll <= 65 => 'confirmed',
                $roll <= 92 => 'pending',
                default     => 'cancelled',
            };
        }

        // Started within the last 3 hours (today) → still in progress
        if ($at->gt($this->now->copy()->subHours(3))) {
            return $roll <= 90 ? 'confirmed' : 'cancelled';
        }

        // Past
        return match (true) {
            $roll <= 80 => 'completed',
            $roll <= 92 => 'cancelled',
            default     => 'no-show',
        };
    }

    /* ============================================================
     |  TRANSACTIONS (one row per service booked in an appointment)
     ============================================================ */
    protected function seedTransactions(array $appointments): array
    {
        $transactions = [];
        $totals       = [];

        $lengths     = ['short', 'medium', 'long', 'extra-long'];
        $thicknesses = ['thin', 'medium', 'thick'];
        $colors      = array_keys(self::COLOR_DYE);
        $notes       = [
            null, null, null,
            'Customer requested extra care',
            'Allergic to strong chemicals',
            'First time customer',
            'Sensitive scalp',
            'Bring reference photo',
        ];

        foreach ($appointments as $appt) {
            // Only appointments that have a billing carry service rows
            if (! in_array($appt['status'], ['completed', 'confirmed'], true)) {
                continue;
            }

            $isCompleted = $appt['status'] === 'completed';
            $day         = $appt['at']->toDateString();
            $total       = 0;

            foreach ($this->pickServices($appt['at']) as $serviceId) {
                $meta    = $this->serviceMeta[$serviceId];
                $staffId = $this->pickStaff($meta['specialties'], $day);
                $color   = $meta['reqColor'] ? $this->pick($colors) : null;
                $doneAt  = $this->capNow($appt['at']->copy()->addMinutes($meta['duration']));

                $txnId = DB::table('transactions')->insertGetId([
                    'appointment_id'       => $appt['id'],
                    'service_id'           => $serviceId,
                    'assigned_employee_id' => $staffId,
                    'notes'                => $this->pick($notes),
                    'hair_length'          => $this->pick($lengths),
                    'hair_thickness'       => $this->pick($thicknesses),
                    'preferred_color'      => $color,
                    'completed_at'         => $isCompleted ? $day : null,
                    'created_at'           => $appt['created_at'],
                    'updated_at'           => $isCompleted ? $doneAt : $appt['created_at'],
                ]);

                $transactions[] = [
                    'id'         => $txnId,
                    'service_id' => $serviceId,
                    'color'      => $color,
                    'completed'  => $isCompleted,
                    'done_at'    => $doneAt,
                ];
                $total += $meta['price'];
            }

            $totals[$appt['id']] = $total;
        }

        return [$transactions, $totals];
    }

    /* ============================================================
     |  BILLINGS & PAYMENTS
     ============================================================ */
    protected function seedBillings(array $appointments, array $totals): array
    {
        $billings = [];

        foreach ($appointments as $appt) {
            if (! isset($totals[$appt['id']])) {
                continue;
            }

            $total     = (float) $totals[$appt['id']];
            $completed = $appt['status'] === 'completed';
            $payments  = []; // [method, amount, paid_at]
            $paidAt    = null;

            if ($completed) {
                $paidAt = $this->capNow($appt['at']->copy()->addMinutes(rand(60, 180)));

                if (rand(1, 100) <= 35) {
                    // Paid everything on the day
                    $payments[] = [$this->onSiteMethod(), $total, $paidAt];
                } else {
                    // Online downpayment first, remaining balance settled on the day
                    $down       = round($total * self::DOWNPAYMENT_RATE, 2);
                    $payments[] = ['GCash', $down, $appt['created_at']];
                    $payments[] = [$this->onSiteMethod(), round($total - $down, 2), $paidAt];
                }
                $paid = $total;
            } else {
                // Confirmed: only the downpayment so far
                $paid       = round($total * self::DOWNPAYMENT_RATE, 2);
                $payments[] = ['GCash', $paid, $appt['created_at']];
            }

            $balance = round($total - $paid, 2);

            $billingId = DB::table('billings')->insertGetId([
                'appointment_id' => $appt['id'],
                'total_amount'   => $total,
                'paid_amount'    => $paid,
                'balance'        => $balance,
                'payment_type'   => $balance <= 0 ? 'full' : 'downpayment',
                'created_at'     => $appt['created_at'],
                'updated_at'     => $paidAt ?? $appt['created_at'],
            ]);

            $billings[] = ['id' => $billingId, 'payments' => $payments];
        }

        return $billings;
    }

    protected function seedPayments(array $billings): void
    {
        $rows = [];

        foreach ($billings as $billing) {
            foreach ($billing['payments'] as [$method, $amount, $paidAt]) {
                $rows[] = [
                    'billing_id'     => $billing['id'],
                    'payment_method' => $method,
                    'payment_proof'  => $method === 'GCash' ? 'proofs/gcash_' . Str::lower(Str::random(10)) . '.jpg' : null,
                    'created_at'     => $paidAt,
                    'updated_at'     => $paidAt,
                ];

                if ($method === 'cash') {
                    $this->addCash($paidAt->toDateString(), $amount);
                }
            }
        }

        $this->bulkInsert('payments', $rows);
    }

    /* ============================================================
     |  WALK-INS
     ============================================================ */
    protected function seedWalkIns(array $users): array
    {
        $guestNames = [
            'Jessa Dela Cruz', 'Michelle Perez', 'Angelica Santiago', 'Rhea Manalo',
            'Carmela Cortez', 'Bea Fernandez', 'Lorna Aguilar', 'Dennis Pineda',
            'Rico Valdez', 'Joanna Estrada', 'Katrina Roque', 'Mark Bernardo',
        ];

        $colors  = array_keys(self::COLOR_DYE);
        $walkIns = [];

        foreach ($this->openDays as $date => $isOpen) {
            $day = Carbon::parse($date);
            if (! $isOpen || $day->gt($this->today)) {
                continue;
            }

            for ($i = 0, $n = rand(0, 2); $i < $n; $i++) {
                $at = $day->copy()->setTime(rand(9, 17), $this->pick([0, 15, 30, 45]));
                if ($at->gt($this->now)) {
                    continue;
                }

                $serviceId = $this->pickServices($at, 1)[0];
                $meta      = $this->serviceMeta[$serviceId];
                $finishAt  = $at->copy()->addMinutes($meta['duration']);
                $finished  = $finishAt->lte($this->now);

                // About half the walk-ins are registered customers
                $customerId = rand(1, 100) <= 50 ? $this->pick($users['customers']) : null;
                $name       = $customerId ? $this->customerNames[$customerId] : $this->pick($guestNames);
                $method     = $finished ? $this->onSiteMethod() : null;

                $id = DB::table('walk_ins')->insertGetId([
                    'customer_id'           => $customerId,
                    'customer_name'         => $name,
                    'service_id'            => $serviceId,
                    'stylist_id'            => $this->pickWalkInStylist($meta['specialties'], $date),
                    'is_finished'           => $finished,
                    'amount_paid'           => $finished ? $meta['price'] : null,
                    'walkin_payment_method' => $method,
                    'created_at'            => $at,
                    'updated_at'            => $finished ? $finishAt : $at,
                ]);

                if ($finished && $method === 'cash') {
                    $this->addCash($date, (float) $meta['price']);
                }

                $walkIns[] = [
                    'id'         => $id,
                    'service_id' => $serviceId,
                    'color'      => $meta['reqColor'] ? $this->pick($colors) : null,
                    'finished'   => $finished,
                    'done_at'    => $finishAt,
                ];
            }
        }

        return $walkIns;
    }

    protected function seedWalkInTransactions(array $walkIns): void
    {
        $rows = [];

        foreach ($walkIns as $walkIn) {
            if (! $walkIn['finished']) {
                continue;
            }
            foreach ($this->usageFor($walkIn['service_id'], $walkIn['color']) as $inventoryId => $qty) {
                $rows[] = [
                    'walkin_id'       => $walkIn['id'],
                    'inventory_id'    => $inventoryId,
                    'quantity_change' => -$qty,
                    'created_at'      => $walkIn['done_at'],
                    'updated_at'      => $walkIn['done_at'],
                ];
            }
        }

        $this->bulkInsert('walk_in_transactions', $rows);
    }

    /* ============================================================
     |  EMPLOYEE COMMISSIONS (40% per staff)
     ============================================================ */
    protected function seedEmployeeCommissions(array $users): void
    {
        $rows = [];
        foreach ($users['staff'] as $staffId) {
            $rows[] = [
                'employee_id'       => $staffId,
                'commission_amount' => self::COMMISSION_RATE, // 0.40
                'created_at'        => $this->startDate,
                'updated_at'        => $this->startDate,
            ];
        }
        $this->bulkInsert('employee_commissions', $rows);
    }

    /* ============================================================
     |  INVENTORY TRANSACTIONS (usage / restock / expired)
     ============================================================ */
    protected function seedInventoryTransactions(array $transactions): void
    {
        $rows = [];

        // Usage – driven by service_product_usages of completed services
        foreach ($transactions as $txn) {
            if (! $txn['completed']) {
                continue;
            }
            foreach ($this->usageFor($txn['service_id'], $txn['color']) as $inventoryId => $qty) {
                $rows[] = [
                    'inventory_id'     => $inventoryId,
                    'transaction_id'   => $txn['id'],
                    'quantity_change'  => -$qty,
                    'transaction_type' => 'usage',
                    'created_at'       => $txn['done_at'],
                    'updated_at'       => $txn['done_at'],
                ];
            }
        }

        // Restocks – ~25% of days, never for the intentionally low-stock items
        $restockable = array_values(array_diff(array_values($this->inventoryByProduct), $this->lowStockInventoryIds));

        $cursor = $this->startDate->copy();
        while ($cursor->lte($this->today)) {
            if (rand(1, 100) <= 25) {
                foreach (collect($restockable)->random(rand(1, 3)) as $inventoryId) {
                    $at = $cursor->copy()->setTime(rand(9, 17), rand(0, 59));
                    $rows[] = [
                        'inventory_id'     => $inventoryId,
                        'transaction_id'   => null,
                        'quantity_change'  => rand(10, 30),
                        'transaction_type' => 'restock',
                        'created_at'       => $this->capNow($at),
                        'updated_at'       => $this->capNow($at),
                    ];
                }
            }
            $cursor->addDay();
        }

        // A few expired write-offs
        for ($i = 0; $i < 4; $i++) {
            $at = $this->randomPastDate();
            $rows[] = [
                'inventory_id'     => $this->pick($restockable),
                'transaction_id'   => null,
                'quantity_change'  => -rand(1, 3),
                'transaction_type' => 'expired',
                'created_at'       => $at,
                'updated_at'       => $at,
            ];
        }

        $this->bulkInsert('inventory_transactions', $rows);
    }

    /* ============================================================
     |  FEEDBACK
     ============================================================ */
    protected function seedFeedback(array $appointments): void
    {
        $comments = [
            'Great service!', 'Very satisfied.', 'Will come back again.', 'Staff was friendly.',
            'Loved the result!', 'Could be better.', 'Okay experience.', 'Worth every peso.',
        ];

        $rows = [];
        foreach ($appointments as $appt) {
            if ($appt['status'] !== 'completed' || rand(1, 100) > 60) {
                continue;
            }
            $at = $this->capNow($appt['at']->copy()->addDay());

            $rows[] = [
                'customer_id'    => $appt['customer_id'],
                'appointment_id' => $appt['id'],
                'rating'         => rand(25, 50) / 10, // 2.5 – 5.0
                'comments'       => $this->pick($comments),
                'created_at'     => $at,
                'updated_at'     => $at,
            ];
        }

        $this->bulkInsert('feedback', $rows);
    }

    protected function seedStaffFeedback(array $users): void
    {
        $rows = [];
        foreach ($users['staff'] as $staffId) {
            for ($i = 0, $n = rand(5, 12); $i < $n; $i++) {
                $date = $this->randomPastDate();
                $rows[] = [
                    'staff_id'   => $staffId,
                    'rating'     => rand(30, 50) / 10, // 3.0 – 5.0
                    'created_at' => $date,
                    'updated_at' => $date,
                ];
            }
        }
        $this->bulkInsert('staff_feedback', $rows);
    }

    /* ============================================================
     |  REMITTANCES (cash collected per closed business day)
     ============================================================ */
    protected function seedRemittances(): void
    {
        $rows = [];

        foreach ($this->openDays as $date => $isOpen) {
            $day = Carbon::parse($date);
            if (! $isOpen || $day->gte($this->today)) {
                continue; // today's cash isn't remitted yet
            }

            $cash = round($this->cashByDate[$date] ?? 0, 2);

            // Quiet days with no cash sales still get a small float remittance,
            // so the table has a row for every closed business day.
            if ($cash <= 0) {
                $cash = (float) $this->pick([200, 300, 500, 800, 1000]);
            }

            $at = $day->copy()->setTime(19, rand(0, 30));

            $rows[] = [
                'business_date_id'  => $this->scheduleIds[$date],
                'user_id'           => $this->pick($this->assignedByDate[$date]),
                'remittance_amount' => $cash,
                'created_at'        => $at,
                'updated_at'        => $at,
            ];
        }

        $this->bulkInsert('remittances', $rows);
    }

    /* ============================================================
     |  EXPENSES (rent, utilities, stock purchases, misc)
     |
     |  Columns: expense_name, stock_amount, amount, expense_date,
     |           description, recorded_by, created_at, updated_at
     |  stock_amount is the quantity of stock bought (0 for non-stock expenses).
     |
     |  Amounts are intentionally modest so the net profit stays positive
     |  (Net = Revenue - Costs - Commissions).
     ============================================================ */
    protected function seedExpenses(array $users): void
    {
        $ownerId = $users['owner'];

        $make = function (string $name, int $stock, float $amount, string $description, Carbon $at) use ($ownerId) {
            $at = $this->capNow($at);

            return [
                'expense_name' => Str::limit($name, 50, ''),
                'stock_amount' => $stock,
                'amount'       => round($amount, 2),
                'expense_date' => $at->toDateString(),
                'description'  => Str::limit($description, 50, ''),
                'recorded_by'  => $ownerId,
                'created_at'   => $at,
                'updated_at'   => $at,
            ];
        };

        $rows = [];

        // Monthly fixed bills (no stock) - name, desc, day of month, min, max
        $monthly = [
            ['Rent',     'Monthly shop rent',     1,  5000, 5000],
            ['Electric', 'Electricity bill',      5,  1200, 2000],
            ['Water',    'Water bill',            7,  300,  600],
            ['Internet', 'Internet subscription', 10, 999,  999],
        ];

        $month = $this->startDate->copy()->startOfMonth();
        while ($month->lte($this->today)) {
            foreach ($monthly as [$name, $desc, $dom, $min, $max]) {
                $at = $month->copy()->day($dom)->setTime(10, rand(0, 59));
                if ($at->lt($this->startDate) || $at->gt($this->now)) {
                    continue;
                }
                $rows[] = $make($name, 0, rand($min, $max), $desc, $at);
            }
            $month->addMonth();
        }

        // Weekly stock purchases - named after real products, smaller quantities and cheaper unit costs
        $stockable = array_keys($this->productIds);
        $week = $this->startDate->copy()->next(Carbon::MONDAY);
        while ($week->lte($this->today)) {
            foreach ((array) array_rand($stockable, rand(1, 2)) as $idx) {
                $qty = rand(3, 10);
                $rows[] = $make(
                    $stockable[$idx],
                    $qty,
                    $qty * rand(40, 150),
                    'Stock purchase',
                    $week->copy()->setTime(rand(9, 15), rand(0, 59))
                );
            }
            $week->addWeek();
        }

        // Random misc expenses on open days (no stock)
        $misc = [
            ['Equipment repair',   'Repair of salon equipment',   300, 800],
            ['Staff meals',        'Snacks and meals for staff',  150, 400],
            ['Social media ads',   'Facebook / Instagram ads',    200, 500],
            ['Cleaning supplies',  'Cleaning materials',          150, 350],
            ['Transport',          'Delivery / transport',        50,  200],
        ];
        $pastOpenDays = array_keys(array_filter(
            $this->openDays,
            fn ($open, $d) => $open && Carbon::parse($d)->lte($this->today),
            ARRAY_FILTER_USE_BOTH
        ));

        for ($i = 0; $i < 8 && $pastOpenDays; $i++) {
            [$name, $desc, $min, $max] = $this->pick($misc);
            $day = Carbon::parse($this->pick($pastOpenDays));
            $rows[] = $make($name, 0, rand($min, $max), $desc, $day->setTime(rand(9, 17), rand(0, 59)));
        }

        usort($rows, fn ($x, $y) => strcmp((string) $x['created_at'], (string) $y['created_at']));

        $this->bulkInsert('expenses', $rows);
    }

    /* ============================================================
     |  HELPERS
     ============================================================ */
    protected function pick(array $items)
    {
        return $items[array_rand($items)];
    }

    protected function capNow(Carbon $date): Carbon
    {
        return $date->gt($this->now) ? $this->now->copy() : $date->copy();
    }

    protected function randomPastDate(): Carbon
    {
        return Carbon::createFromTimestamp(rand($this->startDate->timestamp, $this->now->timestamp));
    }

    protected function onSiteMethod(): string
    {
        return rand(1, 100) <= 65 ? 'cash' : 'GCash';
    }

    protected function addCash(string $date, float $amount): void
    {
        $this->cashByDate[$date] = ($this->cashByDate[$date] ?? 0) + $amount;
    }

    protected function bulkInsert(string $table, array $rows, int $chunk = 500): void
    {
        foreach (array_chunk($rows, $chunk) as $part) {
            DB::table($table)->insert($part);
        }
    }

    /**
     * Pick 1–3 services for a booking. Inactive services are only used for
     * dates before they were deactivated.
     */
    protected function pickServices(Carbon $at, ?int $forceCount = null): array
    {
        $cutoff = $this->now->copy()->subDays(14);

        $pool = [];
        foreach ($this->serviceMeta as $id => $meta) {
            if ($meta['active'] || $at->lt($cutoff)) {
                $pool[] = $id;
            }
        }

        $roll  = rand(1, 100);
        $count = $forceCount ?? ($roll <= 60 ? 1 : ($roll <= 90 ? 2 : 3));

        return collect($pool)->random(min($count, count($pool)))->values()->all();
    }

    /** Staff on duty that day who can perform the service. */
    protected function pickStaff(array $specialtyIds, string $date): int
    {
        $onDuty   = $this->assignedByDate[$date] ?? $this->staffIds;
        $eligible = $this->withSpecialty($onDuty, $specialtyIds);

        if (! $eligible) {
            $eligible = $this->withSpecialty($this->staffIds, $specialtyIds);
        }

        return $this->pick($eligible);
    }

    /** Walk-ins go to walk-in-authorized staff on duty, if any fit the service. */
    protected function pickWalkInStylist(array $specialtyIds, string $date): int
    {
        $onDuty   = $this->assignedByDate[$date] ?? $this->staffIds;
        $eligible = $this->withSpecialty(array_values(array_intersect($onDuty, $this->walkInAuthorized)), $specialtyIds);

        if (! $eligible) {
            $eligible = $this->withSpecialty($onDuty, $specialtyIds);
        }
        if (! $eligible) {
            $eligible = $this->withSpecialty($this->walkInAuthorized, $specialtyIds);
        }

        return $this->pick($eligible);
    }

    protected function withSpecialty(array $staffIds, array $specialtyIds): array
    {
        return array_values(array_filter(
            $staffIds,
            fn ($id) => (bool) array_intersect($this->staffSpecialties[$id] ?? [], $specialtyIds)
        ));
    }

    /**
     * Inventory consumption for one service: [inventoryId => qty].
     * For colour services only the dye matching the preferred colour is consumed.
     */
    protected function usageFor(int $serviceId, ?string $color): array
    {
        $allDyes   = ['Hair Color - Black', 'Hair Color - Brown', 'Hair Color - Blonde'];
        $chosenDye = $color ? (self::COLOR_DYE[$color] ?? null) : null;

        $result = [];
        foreach ($this->serviceMeta[$serviceId]['usages'] as $productId => $qty) {
            $name = $this->productNames[$productId];
            if (in_array($name, $allDyes, true) && $name !== $chosenDye) {
                continue;
            }
            $result[$this->inventoryByProduct[$productId]] = $qty;
        }

        return $result;
    }
}