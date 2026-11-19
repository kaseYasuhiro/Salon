<?php

namespace App\Models;

use App\Models\ServiceProductUsage;
use App\Models\Transaction;
use App\Models\ServiceSpecialties;
use App\Models\WalkIn;
use App\Models\ServiceHairColors;
use App\Models\ServicePriceAdjustments;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Services extends Model
{
    protected $table = 'services';
    protected $fillable = [
        'service_name',
        'description',
        'price',
        'duration_minutes',
        'is_multitaskable',
        'reqHairColor',
        'service_status',
        'deactivated_by_product',
    ];


    /**
     * Re-evaluate every service that uses $productId.
     *
     * - If the product is inactive → deactivate all linked services that are
     *   still active, and stamp deactivated_by_product.
     * - If the product is active → reactivate only the services that were
     *   deactivated *because of this product* (deactivated_by_product === id),
     *   unless they are still blocked by another inactive product.
     */
    public static function syncServicesForProduct(int $productId): void
    {
        $product  = \App\Models\Products::find($productId);
        $serviceIds = \App\Models\ServiceProductUsage::where('product_id', $productId)
            ->pluck('service_id')
            ->unique();

        if ($serviceIds->isEmpty()) {
            return;
        }

        if (!$product || $product->is_active === 0 || $product->is_active === false) {
            // Deactivate
            self::whereIn('id', $serviceIds)
                ->where('service_status', 'active')
                ->update([
                    'service_status'         => 'inactive',
                    'deactivated_by_product' => $productId,
                ]);
            return;
        }

        // Reactivate only services this product previously deactivated
        $candidates = self::whereIn('id', $serviceIds)
            ->where('service_status', 'inactive')
            ->where('deactivated_by_product', $productId)
            ->get();

        foreach ($candidates as $service) {
            // Still blocked by any OTHER inactive product?
            $stillBlocked = \DB::table('service_product_usages as spu')
                ->join('products as p', 'spu.product_id', '=', 'p.id')
                ->where('spu.service_id', $service->id)
                ->where('p.is_active', 0)
                ->where('p.id', '!=', $productId)
                ->exists();

            if ($stillBlocked) {
                continue; // leave inactive; deactivated_by_product stays so we can retry later
            }

            $service->update([
                'service_status'         => 'active',
                'deactivated_by_product' => null,
            ]);
        }
    }

    public function ServiceProductUsage()
    {
        return $this->hasMany(ServiceProductUsage::class, 'service_id');
    }

    public function transaction()
    {
        return $this->hasMany(Transaction::class, 'service_id', 'id');
    }

    public function serviceSpecialties()
    {
        return $this->hasMany(ServiceSpecialties::class, 'service_id');
    }

    public function walkIn()
    {
        return $this->hasMany(WalkIn::class, 'service_id', 'id');
    }

    public function serviceHairColors()
    {
        return $this->hasMany(ServiceHairColor::class, 'service_id', 'id');
    }

    public function servicePriceAdjustments()
    {
        return $this->hasMany(ServicePriceAdjustments::class, 'service_id', 'id');
    }
}
