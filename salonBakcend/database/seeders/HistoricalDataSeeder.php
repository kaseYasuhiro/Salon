<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Schema;

/**
 * Seeds realistic historical salon activity for the last two completed calendar months.
 *
 * Default range: 2026-08-01 through 2026-09-30.
 * Override with:
 *   HISTORICAL_SEED_START=YYYY-MM-DD
 *   HISTORICAL_SEED_END=YYYY-MM-DD
 *
 * This seeder is ADDITIVE. It does not truncate or delete existing production data.
 */
class HistoricalDataSeeder extends Seeder
{
    private string $startDate;
    private string $endDate;
    private string $seedTag;

    private array $staffIds = [];
    private array $customerIds = [];
    private array $serviceIds = [];
    private array $productIds = [];
    private array $inventoryIds = [];
    private array $specialtyIds = [];
    private array $hairColorIds = [];
    private int $ownerId;

    public function run(): void
    {
        $this->startDate = env('HISTORICAL_SEED_START', now()->subMonthsNoOverflow(2)->startOfMonth()->toDateString());
        $this->endDate = env('HISTORICAL_SEED_END', now()->subMonthNoOverflow()->endOfMonth()->toDateString());
        $this->seedTag = 'HISTORICAL-SEED:' . $this->startDate . ':' . $this->endDate;

        if (Carbon::parse($this->startDate)->gt(Carbon::parse($this->endDate))) {
            throw new \RuntimeException('HISTORICAL_SEED_START must be before HISTORICAL_SEED_END.');
        }

        // A deterministic marker makes this safe to run twice.
        if (DB::table('transactions')->where('notes', $this->seedTag)->exists()) {
            $this->command?->warn("Historical data already exists for {$this->startDate} to {$this->endDate}; nothing was inserted.");
            return;
        }

        DB::transaction(function () {
            $this->prepareMasterData();
            $this->seedSchedulesAndStaff();
            $this->seedAppointmentsAndTransactions();
            $this->seedWalkIns();
            $this->seedExpenses();
            $this->seedIncidents();
            $this->seedStaffFeedback();
            $this->seedSupportingTables();
        });

        $this->command?->info("Historical salon data seeded: {$this->startDate} to {$this->endDate}.");
    }

    private function prepareMasterData(): void
    {
        // Reuse existing users first. Only create demo users when the database has none.
        $this->ownerId = (int) (DB::table('users')
            ->where('role', 'owner')
            ->where('active_status', true)
            ->value('id') ?? $this->findOrCreateUser(
                'owner',
                'Historical',
                'Owner',
                'historical.owner@example.test',
                '09170000001'
            ));

        $this->staffIds = DB::table('users')
            ->where('role', 'staff')
            ->where('active_status', true)
            ->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        if (!$this->staffIds) {
            foreach ([
                ['Mia', 'Santos', 'historical.stylist1@example.test', '09170000002'],
                ['Ava', 'Reyes', 'historical.stylist2@example.test', '09170000003'],
                ['Noah', 'Garcia', 'historical.stylist3@example.test', '09170000004'],
            ] as $user) {
                $this->staffIds[] = $this->findOrCreateUser('staff', $user[0], $user[1], $user[2], $user[3]);
            }
        }

        $this->customerIds = DB::table('users')
            ->where('role', 'customer')
            ->pluck('id')->map(fn ($id) => (int) $id)->values()->all();

        if (count($this->customerIds) < 20) {
            for ($i = count($this->customerIds) + 1; $i <= 25; $i++) {
                $this->customerIds[] = $this->findOrCreateUser(
                    'customer',
                    'Customer',
                    str_pad((string) $i, 2, '0', STR_PAD_LEFT),
                    "historical.customer{$i}@example.test",
                    '092700' . str_pad((string) $i, 5, '0', STR_PAD_LEFT)
                );
            }
        }

        $services = [
            ['Haircut & Style', 'Cut, wash and style', 350, 45, true],
            ['Hair Color', 'Full hair color service', 1800, 120, false],
            ['Hair Treatment', 'Repair and nourishing treatment', 1200, 75, true],
            ['Blow Dry & Style', 'Wash, blow dry and styling', 500, 45, true],
            ['Manicure', 'Classic manicure', 450, 45, true],
            ['Pedicure', 'Classic pedicure', 550, 60, true],
            ['Hair Rebonding', 'Chemical straightening service', 2500, 180, false],
            ['Hair Highlights', 'Partial highlights', 2200, 150, false],
        ];

        foreach ($services as $s) {
            $id = DB::table('services')->where('service_name', $s[0])->value('id');
            if (!$id) {
                $id = DB::table('services')->insertGetId([
                    'service_name' => $s[0],
                    'description' => $s[1],
                    'price' => $s[2],
                    'duration_minutes' => $s[3],
                    'is_multitaskable' => $s[4],
                    'reqHairColor' => in_array($s[0], ['Hair Color', 'Hair Highlights'], true),
                    'service_status' => 'active',
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->serviceIds[$s[0]] = (int) $id;
        }

        $products = [
            ['Shampoo', 'Professional shampoo', 'ml', 1000, 20],
            ['Conditioner', 'Professional conditioner', 'ml', 1000, 20],
            ['Hair Color Cream', 'Permanent color cream', 'gr', 1000, 10],
            ['Developer', 'Hair color developer', 'ml', 1000, 10],
            ['Treatment Cream', 'Repair treatment cream', 'gr', 1000, 12],
            ['Nail Polish', 'Salon nail polish', 'ml', 15, 30],
        ];

        foreach ($products as $p) {
            $id = DB::table('products')->where('product_name', $p[0])->value('id');
            if (!$id) {
                $id = DB::table('products')->insertGetId([
                    'product_name' => $p[0],
                    'description' => $p[1],
                    'unit' => $p[2],
                    'unit_size' => $p[3],
                    'estimated_usages_per_unit' => $p[4],
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->productIds[$p[0]] = (int) $id;

            $inventory = DB::table('inventories')->where('product_id', $id)->first();
            if (!$inventory) {
                $inventoryId = DB::table('inventories')->insertGetId([
                    'product_id' => $id,
                    'product_quantity' => 8 + random_int(0, 12),
                    'current_usages' => random_int(0, 8),
                    'reorder_level' => 3,
                    'expiration_date' => Carbon::parse($this->endDate)->addMonths(8)->toDateString(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            } else {
                $inventoryId = $inventory->id;
            }
            $this->inventoryIds[$p[0]] = (int) $inventoryId;
        }

        $specialties = ['Hair Styling', 'Hair Coloring', 'Hair Treatment', 'Nail Care'];
        foreach ($specialties as $name) {
            $id = DB::table('specialties')->where('specialty_name', $name)->value('id');
            if (!$id) {
                $id = DB::table('specialties')->insertGetId([
                    'specialty_name' => $name,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->specialtyIds[$name] = (int) $id;
        }

        $colors = [
            ['Natural Black', '#111111'],
            ['Dark Brown', '#3B2416'],
            ['Chocolate Brown', '#5A3825'],
            ['Ash Brown', '#6B625B'],
            ['Burgundy', '#800020'],
            ['Honey Blonde', '#D6A84F'],
        ];
        foreach ($colors as [$name, $code]) {
            $id = DB::table('hair_colors')->where('color_name', $name)->value('id');
            if (!$id) {
                $id = DB::table('hair_colors')->insertGetId([
                    'color_name' => $name,
                    'color_code' => $code,
                    'is_active' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
            $this->hairColorIds[$name] = (int) $id;
        }

        // Service/product consumption used by inventory reports.
        $usageMap = [
            'Haircut & Style' => ['Shampoo' => 1, 'Conditioner' => 1],
            'Hair Color' => ['Shampoo' => 1, 'Conditioner' => 1, 'Hair Color Cream' => 2, 'Developer' => 2],
            'Hair Treatment' => ['Shampoo' => 1, 'Treatment Cream' => 2],
            'Blow Dry & Style' => ['Shampoo' => 1, 'Conditioner' => 1],
            'Manicure' => ['Nail Polish' => 1],
            'Pedicure' => ['Nail Polish' => 1],
            'Hair Rebonding' => ['Shampoo' => 1, 'Conditioner' => 1, 'Treatment Cream' => 2],
            'Hair Highlights' => ['Shampoo' => 1, 'Conditioner' => 1, 'Hair Color Cream' => 2, 'Developer' => 2],
        ];

        foreach ($usageMap as $serviceName => $products) {
            foreach ($products as $productName => $usage) {
                $serviceId = $this->serviceIds[$serviceName];
                $productId = $this->productIds[$productName];
                if (!DB::table('service_product_usages')
                    ->where('service_id', $serviceId)->where('product_id', $productId)->exists()) {
                    DB::table('service_product_usages')->insert([
                        'service_id' => $serviceId,
                        'product_id' => $productId,
                        'estimated_usage' => $usage,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Specialties and hair-color/service mappings.
        $serviceSpecialties = [
            'Haircut & Style' => ['Hair Styling'],
            'Hair Color' => ['Hair Coloring'],
            'Hair Treatment' => ['Hair Treatment'],
            'Blow Dry & Style' => ['Hair Styling'],
            'Manicure' => ['Nail Care'],
            'Pedicure' => ['Nail Care'],
            'Hair Rebonding' => ['Hair Styling', 'Hair Treatment'],
            'Hair Highlights' => ['Hair Coloring'],
        ];

        foreach ($serviceSpecialties as $serviceName => $names) {
            foreach ($names as $specialty) {
                if (!DB::table('service_specialties')
                    ->where('service_id', $this->serviceIds[$serviceName])
                    ->where('specialty_id', $this->specialtyIds[$specialty])->exists()) {
                    DB::table('service_specialties')->insert([
                        'service_id' => $this->serviceIds[$serviceName],
                        'specialty_id' => $this->specialtyIds[$specialty],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        foreach ($this->staffIds as $staffId) {
            foreach ($this->specialtyIds as $specialtyId) {
                if (random_int(1, 100) <= 55 && !DB::table('staff_specialties')
                    ->where('staff_id', $staffId)->where('specialty_id', $specialtyId)->exists()) {
                    DB::table('staff_specialties')->insert([
                        'staff_id' => $staffId,
                        'specialty_id' => $specialtyId,
                        'is_active' => true,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }

            if (!DB::table('walkin_authorizations')->where('staff_id', $staffId)->exists()) {
                DB::table('walkin_authorizations')->insert([
                    'staff_id' => $staffId,
                    'isAuthorizedForWalkIn' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Hair-color services.
        foreach (['Hair Color', 'Hair Highlights'] as $serviceName) {
            foreach (array_values($this->hairColorIds) as $colorId) {
                if (!DB::table('service_hair_colors')
                    ->where('service_id', $this->serviceIds[$serviceName])
                    ->where('hair_color_id', $colorId)->exists()) {
                    DB::table('service_hair_colors')->insert([
                        'service_id' => $this->serviceIds[$serviceName],
                        'hair_color_id' => $colorId,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // Price adjustments used by hair-length/thickness reports.
        foreach (['Hair Color', 'Hair Highlights', 'Hair Rebonding'] as $serviceName) {
            foreach ([
                ['short', 'thin', 0],
                ['medium', 'medium', 200],
                ['long', 'thick', 500],
            ] as [$length, $thickness, $price]) {
                if (!DB::table('service_price_adjustments')
                    ->where('service_id', $this->serviceIds[$serviceName])
                    ->where('hair_length', $length)
                    ->where('hair_thickness', $thickness)->exists()) {
                    DB::table('service_price_adjustments')->insert([
                        'service_id' => $this->serviceIds[$serviceName],
                        'hair_length' => $length,
                        'hair_thickness' => $thickness,
                        'additional_price' => $price,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                }
            }
        }

        // One QR/GCash configuration row if the table is empty.
        if (DB::table('q_r_codes')->count() === 0) {
            DB::table('q_r_codes')->insert([
                'qr_image' => 'historical-seed-gcash-qr.png',
                'gcash_number' => '09171234567',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    private function seedSchedulesAndStaff(): void
    {
        $date = Carbon::parse($this->startDate);
        $end = Carbon::parse($this->endDate);

        while ($date->lte($end)) {
            $isOpen = !$date->isSunday();
            $scheduleId = DB::table('business_schedules')
                ->where('business_date', $date->toDateString())
                ->value('id');

            if (!$scheduleId) {
                $scheduleId = DB::table('business_schedules')->insertGetId([
                    'business_date' => $date->toDateString(),
                    'open_time' => '09:00:00',
                    'close_time' => '19:00:00',
                    'is_open' => $isOpen,
                    'created_at' => $date->copy()->setTime(8, 0),
                    'updated_at' => $date->copy()->setTime(8, 0),
                ]);
            }

            if ($isOpen) {
                foreach ($this->staffIds as $staffId) {
                    if (random_int(1, 100) <= 88) {
                        DB::table('assign_staff')->insert([
                            'staff_id' => $staffId,
                            'business_date_id' => $scheduleId,
                            'created_at' => $date->copy()->setTime(8, 15),
                            'updated_at' => $date->copy()->setTime(8, 15),
                        ]);
                    }
                }

                // Remittance is calculated from the day's payments below.
                // Inserted after transactions are generated.
            }

            $date->addDay();
        }
    }

    private function seedAppointmentsAndTransactions(): void
    {
        $services = array_values($this->serviceIds);
        $start = Carbon::parse($this->startDate);
        $end = Carbon::parse($this->endDate);

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if ($date->isSunday()) {
                continue;
            }

            $appointmentsToday = random_int(5, 10);

            for ($i = 0; $i < $appointmentsToday; $i++) {
                $customerId = $this->customerIds[array_rand($this->customerIds)];
                $serviceId = $services[array_rand($services)];
                $staffId = $this->staffIds[array_rand($this->staffIds)];
                $appointmentTime = $date->copy()->setTime(9 + intdiv($i * 45, 60), ($i * 45) % 60);

                $roll = random_int(1, 100);
                $status = $roll <= 82 ? 'completed' : ($roll <= 91 ? 'cancelled' : 'no-show');

                $appointmentId = DB::table('appointments')->insertGetId([
                    'customer_id' => $customerId,
                    'appointment_date' => $date->toDateString(),
                    'appointment_time' => $appointmentTime->format('H:i:s'),
                    'status' => $status,
                    'grace_period_minutes' => 30,
                    'cancellation_reason' => $status === 'cancelled' ? 'Customer requested cancellation' : null,
                    'cancelled_by' => $status === 'cancelled' ? $customerId : null,
                    'cancelled_at' => $status === 'cancelled' ? $date->toDateString() : null,
                    'created_at' => $date->copy()->setTime(8, 0),
                    'updated_at' => $date->copy()->setTime(18, 0),
                ]);

                if ($status === 'cancelled') {
                    $this->maybeCreateAppointmentRequest($customerId, $appointmentId, 'cancel', $date);
                    continue;
                }

                if ($status === 'no-show') {
                    if (random_int(1, 100) <= 20) {
                        $this->maybeCreateAppointmentRequest($customerId, $appointmentId, 'reschedule', $date);
                    }
                    continue;
                }

                // Completed/confirmed appointments have a transaction/billing.
                $serviceName = array_search($serviceId, $this->serviceIds, true);
                $service = DB::table('services')->find($serviceId);
                $basePrice = (float) $service->price;
                $hairLength = in_array($serviceName, ['Hair Color', 'Hair Highlights', 'Hair Rebonding'], true)
                    ? ['short', 'medium', 'long'][random_int(0, 2)] : null;
                $hairThickness = $hairLength ? ['thin', 'medium', 'thick'][random_int(0, 2)] : null;
                $adjustment = 0;

                if ($hairLength && $hairThickness) {
                    $adjustment = (float) (DB::table('service_price_adjustments')
                        ->where('service_id', $serviceId)
                        ->where('hair_length', $hairLength)
                        ->where('hair_thickness', $hairThickness)
                        ->value('additional_price') ?? 0);
                }

                $total = $basePrice + $adjustment;
                $completedAt = $status === 'completed' ? $date->toDateString() : null;
                $transactionId = DB::table('transactions')->insertGetId([
                    'appointment_id' => $appointmentId,
                    'service_id' => $serviceId,
                    'assigned_employee_id' => $staffId,
                    'notes' => $this->seedTag,
                    'hair_length' => $hairLength,
                    'hair_thickness' => $hairThickness,
                    'preferred_color' => $hairLength && random_int(1, 100) <= 70
                        ? array_rand($this->hairColorIds) : null,
                    'completed_at' => $completedAt,
                    'created_at' => $date->copy()->setTime(9, 0),
                    'updated_at' => $date->copy()->setTime(18, 0),
                ]);

                $isFull = $status === 'completed' || random_int(1, 100) <= 45;
                $paid = $isFull ? $total : round($total * 0.30, 2);
                $balance = round($total - $paid, 2);
                // The 'full' billing type was added by a later migration.
                // Keep this seeder compatible with deployed databases that still
                // have the original enum ('downpayment', 'remaining').
                $billingTypeEnum = DB::selectOne(
                    "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'billings' AND COLUMN_NAME = 'payment_type'"
                );
                $supportsFullPaymentType = $billingTypeEnum && str_contains((string) $billingTypeEnum->COLUMN_TYPE, "'full'");
                $paymentType = $isFull && $supportsFullPaymentType ? 'full' : 'downpayment';

                $billingId = DB::table('billings')->insertGetId([
                    'appointment_id' => $appointmentId,
                    'total_amount' => $total,
                    'paid_amount' => $paid,
                    'balance' => $balance,
                    'payment_type' => $paymentType,
                    'created_at' => $date->copy()->setTime(9, 5),
                    'updated_at' => $date->copy()->setTime(18, 0),
                ]);

                DB::table('payments')->insert([
                    'billing_id' => $billingId,
                    'payment_method' => random_int(1, 100) <= 65 ? 'cash' : 'GCash',
                    'payment_proof' => null,
                    'created_at' => $date->copy()->setTime(9, 10),
                    'updated_at' => $date->copy()->setTime(9, 10),
                ]);

                // Optional remaining payment for an earlier downpayment.
                if (!$isFull && $status === 'completed' && random_int(1, 100) <= 65) {
                    $remaining = $balance;
                    $remainingBillingId = DB::table('billings')->insertGetId([
                        'appointment_id' => $appointmentId,
                        'total_amount' => $total,
                        'paid_amount' => $remaining,
                        'balance' => 0,
                        'payment_type' => 'remaining',
                        'created_at' => $date->copy()->setTime(17, 30),
                        'updated_at' => $date->copy()->setTime(17, 30),
                    ]);
                    DB::table('payments')->insert([
                        'billing_id' => $remainingBillingId,
                        'payment_method' => random_int(1, 100) <= 65 ? 'cash' : 'GCash',
                        'payment_proof' => null,
                        'created_at' => $date->copy()->setTime(17, 35),
                        'updated_at' => $date->copy()->setTime(17, 35),
                    ]);
                    $balance = 0;
                }

                $commission = round($total * (random_int(8, 15) / 100), 2);
                DB::table('employee_commissions')->insert([
                    'employee_id' => $staffId,
                    'commission_amount' => $commission,
                    'created_at' => $date->copy()->setTime(18, 0),
                    'updated_at' => $date->copy()->setTime(18, 0),
                ]);

                // Inventory usage mirrors service_product_usages.
                $usages = DB::table('service_product_usages')
                    ->where('service_id', $serviceId)->get();

                foreach ($usages as $usage) {
                    $inventoryId = $this->inventoryIds[array_search($usage->product_id, $this->productIds, true)];
                    DB::table('inventory_transactions')->insert([
                        'inventory_id' => $inventoryId,
                        'transaction_id' => $transactionId,
                        'quantity_change' => -1 * (int) $usage->estimated_usage,
                        'transaction_type' => 'usage',
                        'created_at' => $date->copy()->setTime(18, 0),
                        'updated_at' => $date->copy()->setTime(18, 0),
                    ]);
                }

                // Customer feedback is only generated for completed services.
                if ($status === 'completed' && random_int(1, 100) <= 55) {
                    $comments = ['Great service', 'Very satisfied', 'Friendly staff', 'Good result'];
                    DB::table('feedback')->insert([
                        'customer_id' => $customerId,
                        'appointment_id' => $appointmentId,
                        'rating' => random_int(3, 5),
                        'comments' => $comments[array_rand($comments)],
                        'created_at' => $date->copy()->setTime(19, 0),
                        'updated_at' => $date->copy()->setTime(19, 0),
                    ]);
                }

                // Occasional refund tied to a real payment + appointment.
                if ($status === 'completed' && random_int(1, 100) <= 3) {
                    $paymentId = DB::table('payments')->where('billing_id', $billingId)->value('id');
                    if ($paymentId && $paid > 0) {
                        $refundAmount = min($paid, round($paid * 0.50, 2));
                        DB::table('refunds')->insert([
                            'payment_id' => $paymentId,
                            'appointment_id' => $appointmentId,
                            'refund_amount' => $refundAmount,
                            'refund_method' => 'Cash',
                            'reference_number' => 'HIST-REF-' . $appointmentId,
                            'refund_reason' => 'Service adjustment',
                            'status' => 'completed',
                            'processed_at' => $date->toDateString(),
                            'created_at' => $date->copy()->setTime(19, 10),
                            'updated_at' => $date->copy()->setTime(19, 10),
                        ]);
                    }
                }
            }

            $this->createDailyRemittance($date);
        }
    }

    private function createDailyRemittance(Carbon $date): void
    {
        $scheduleId = DB::table('business_schedules')
            ->where('business_date', $date->toDateString())->value('id');

        if (!$scheduleId) {
            return;
        }

        $dayEnd = $date->copy()->endOfDay();

        $payments = DB::table('payments')
            ->join('billings', 'billings.id', '=', 'payments.billing_id')
            ->whereDate('payments.created_at', $date->toDateString())
            ->sum('billings.paid_amount');

        $refunds = DB::table('refunds')
            ->whereDate('processed_at', $date->toDateString())
            ->where('status', 'completed')
            ->sum('refund_amount');

        $remittance = max(0, round((float) $payments - (float) $refunds, 2));

        if (!DB::table('remittances')->where('business_date_id', $scheduleId)->exists()) {
            DB::table('remittances')->insert([
                'business_date_id' => $scheduleId,
                'remittance_amount' => $remittance,
                'created_at' => $dayEnd->copy()->setTime(19, 30),
                'updated_at' => $dayEnd->copy()->setTime(19, 30),
            ]);
        }
    }

    private function seedWalkIns(): void
    {
        $start = Carbon::parse($this->startDate);
        $end = Carbon::parse($this->endDate);

        for ($date = $start->copy(); $date->lte($end); $date->addDay()) {
            if ($date->isSunday()) {
                continue;
            }

            $count = random_int(1, 3);
            for ($i = 0; $i < $count; $i++) {
                $serviceName = array_rand($this->serviceIds);
                $serviceId = $this->serviceIds[$serviceName];
                $staffId = $this->staffIds[array_rand($this->staffIds)];
                $servicePrice = (float) DB::table('services')->where('id', $serviceId)->value('price');

                $walkinId = DB::table('walk_ins')->insertGetId([
                    'customer_name' => 'Walk-in Customer ' . $date->format('md') . '-' . ($i + 1),
                    'service_id' => $serviceId,
                    'stylist_id' => $staffId,
                    'is_finished' => true,
                    'amount_paid' => $servicePrice,
                    'created_at' => $date->copy()->setTime(10 + $i, 0),
                    'updated_at' => $date->copy()->setTime(18, 30),
                ]);

                foreach (DB::table('service_product_usages')->where('service_id', $serviceId)->get() as $usage) {
                    $productName = array_search($usage->product_id, $this->productIds, true);
                    if ($productName === false) continue;

                    DB::table('walk_in_transactions')->insert([
                        'walkin_id' => $walkinId,
                        'inventory_id' => $this->inventoryIds[$productName],
                        'quantity_change' => -1 * (int) $usage->estimated_usage,
                        'created_at' => $date->copy()->setTime(18, 30),
                        'updated_at' => $date->copy()->setTime(18, 30),
                    ]);
                }
            }
        }
    }

    private function seedExpenses(): void
    {
        $expenses = [
            ['Shampoo restock', 10, 2500, 'Salon product restock'],
            ['Cleaning supplies', 5, 900, 'Cleaning and sanitation'],
            ['Nail supplies', 8, 1200, 'Nail service supplies'],
            ['Utilities', 1, 3500, 'Monthly utilities'],
            ['Miscellaneous supplies', 6, 700, 'Small salon supplies'],
        ];

        $start = Carbon::parse($this->startDate);
        $end = Carbon::parse($this->endDate);
        $date = $start->copy();

        while ($date->lte($end)) {
            if ($date->isMonday() || $date->day === 15) {
                $e = $expenses[array_rand($expenses)];
                DB::table('expenses')->insert([
                    'expense_name' => $e[0],
                    'stock_amount' => $e[1],
                    'amount' => $e[2],
                    'expense_date' => $date->toDateString(),
                    'description' => $e[3],
                    'recorded_by' => $this->ownerId,
                    'created_at' => $date->copy()->setTime(18, 0),
                    'updated_at' => $date->copy()->setTime(18, 0),
                ]);
            }
            $date->addDay();
        }
    }

    private function seedIncidents(): void
    {
        $transactions = DB::table('transactions')
            ->where('notes', $this->seedTag)
            ->orderBy('id')
            ->limit(6)
            ->get();

        foreach ($transactions as $tx) {
            if (random_int(1, 100) > 25) continue;

            $inventoryId = DB::table('inventory_transactions')
                ->where('transaction_id', $tx->id)
                ->value('inventory_id');

            DB::table('incident_reports')->insert([
                'date' => Carbon::parse($tx->completed_at ?? $tx->created_at)->toDateString(),
                'incident_type' => ['damage', 'others'][random_int(0, 1)],
                'category' => $inventoryId ? 'product' : 'service',
                'amount' => random_int(200, 1200),
                'description' => 'Historical incident recorded for seed data.',
                'staff_id' => $tx->assigned_employee_id ?? $this->staffIds[0],
                'transaction_id' => $tx->id,
                'inventory_id' => $inventoryId,
                'status' => ['reported', 'resolved'][random_int(0, 1)],
                'created_at' => $tx->created_at,
                'updated_at' => $tx->created_at,
            ]);
        }
    }

    private function seedStaffFeedback(): void
    {
        foreach ($this->staffIds as $staffId) {
            for ($i = 0; $i < 2; $i++) {
                DB::table('staff_feedback')->insert([
                    'staff_id' => $staffId,
                    'rating' => random_int(3, 5),
                    'created_at' => Carbon::parse($this->startDate)->addDays(random_int(0, max(0, Carbon::parse($this->startDate)->diffInDays(Carbon::parse($this->endDate)))))->setTime(19, 0),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    private function seedSupportingTables(): void
    {
        // A few reschedule/cancel requests linked to actual appointments.
        $appointments = DB::table('appointments')
            ->whereBetween('appointment_date', [$this->startDate, $this->endDate])
            ->whereIn('status', ['cancelled', 'confirmed'])
            ->orderBy('id')
            ->limit(8)
            ->get();

        foreach ($appointments as $appointment) {
            if (random_int(1, 100) > 45) continue;

            $type = $appointment->status === 'cancelled' ? 'cancel' : 'reschedule';
            DB::table('appointment_requests')->insert([
                'customer_id' => $appointment->customer_id,
                'appointment_id' => $appointment->id,
                'request_type' => $type,
                'reason' => $type === 'cancel' ? 'Schedule conflict' : 'Customer requested another time',
                'preferred_date' => $type === 'reschedule'
                    ? Carbon::parse($appointment->appointment_date)->addDay()->toDateString() : null,
                'preferred_time' => $type === 'reschedule' ? '14:00:00' : null,
                'request_status' => 'approved',
                'reviewed_at' => Carbon::parse($appointment->appointment_date)->setTime(8, 30),
                'created_at' => Carbon::parse($appointment->appointment_date)->setTime(8, 0),
                'updated_at' => Carbon::parse($appointment->appointment_date)->setTime(8, 30),
            ]);
        }

        // Notifications were introduced by a later migration. They are not
        // required for financial/reporting history, so skip them if the deployed
        // database has not received that migration yet.
        if (!Schema::hasTable('notifications')) {
            return;
        }

        foreach (array_slice($this->customerIds, 0, min(10, count($this->customerIds))) as $customerId) {
            DB::table('notifications')->insert([
                'id' => (string) Str::uuid(),
                'type' => 'historical_seed',
                'notifiable_type' => 'App\\Models\\User',
                'notifiable_id' => $customerId,
                'data' => json_encode([
                    'title' => 'Historical appointment record',
                    'message' => 'Historical salon activity has been loaded.',
                ]),
                'read_at' => now(),
                'created_at' => Carbon::parse($this->endDate)->endOfDay(),
                'updated_at' => Carbon::parse($this->endDate)->endOfDay(),
            ]);
        }
    }

    private function maybeCreateAppointmentRequest(int $customerId, int $appointmentId, string $type, Carbon $date): void
    {
        if (random_int(1, 100) > 30) {
            return;
        }

        DB::table('appointment_requests')->insert([
            'customer_id' => $customerId,
            'appointment_id' => $appointmentId,
            'request_type' => $type,
            'reason' => $type === 'cancel' ? 'Customer schedule conflict' : 'Customer requested another schedule',
            'preferred_date' => $type === 'reschedule' ? $date->copy()->addDay()->toDateString() : null,
            'preferred_time' => $type === 'reschedule' ? '14:00:00' : null,
            'request_status' => 'approved',
            'reviewed_at' => $date->copy()->setTime(8, 30),
            'created_at' => $date->copy()->setTime(8, 0),
            'updated_at' => $date->copy()->setTime(8, 30),
        ]);
    }

    private function findOrCreateUser(string $role, string $firstName, string $lastName, string $email, string $phone): int
    {
        $existing = DB::table('users')->where('email', $email)->value('id');
        if ($existing) {
            return (int) $existing;
        }

        return (int) DB::table('users')->insertGetId([
            'first_name' => $firstName,
            'last_name' => $lastName,
            'email' => $email,
            'password' => Hash::make('Password123!'),
            'phone_number' => $phone,
            'role' => $role,
            'active_status' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }
}
