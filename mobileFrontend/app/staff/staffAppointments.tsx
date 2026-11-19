// staffAppointments.tsx
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  RefreshControl,
  Modal,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import api from "@/api/axios";

// ─────────────────────────────────────────────────────────────
// Image URL helper (used for the e-wallet QR code)
// ─────────────────────────────────────────────────────────────
const API_BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? "").replace(/\/api\/?$/, "");

const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null;
  if (imagePath.startsWith("http")) return imagePath;
  if (imagePath.startsWith("/storage/")) return `${API_BASE_URL}${imagePath}`;
  return `${API_BASE_URL}/storage/${imagePath}`;
};

// ─────────────────────────────────────────────────────────────
// Price adjustments helpers
// ─────────────────────────────────────────────────────────────
interface PriceAdjustment {
  id: number;
  service_id: number;
  hair_length: string;
  hair_thickness: string;
  additional_price: string | number;
}

interface ServiceWithAdjustments {
  id: number;
  service_price_adjustments?: PriceAdjustment[];
}

const buildAdjustmentMap = (services: ServiceWithAdjustments[]) => {
  const map = new Map<number, PriceAdjustment[]>();
  services.forEach((service) => {
    const adjustments = service.service_price_adjustments || [];
    if (adjustments.length > 0) {
      map.set(service.id, adjustments);
    }
  });
  return map;
};

const getAdditionalPrice = (
  adjustmentMap: Map<number, PriceAdjustment[]>,
  serviceId: number | undefined,
  hairLength: string | null | undefined,
  hairThickness: string | null | undefined
): number => {
  if (!serviceId) return 0;

  const adjustments = adjustmentMap.get(serviceId);
  if (!adjustments || adjustments.length === 0) return 0;

  const normLength = (hairLength || '').toLowerCase().trim();
  const normThickness = (hairThickness || '').toLowerCase().trim();

  const match = adjustments.find(
    (adj) =>
      adj.hair_length.toLowerCase().trim() === normLength &&
      adj.hair_thickness.toLowerCase().trim() === normThickness
  );

  return match ? parseFloat(String(match.additional_price)) || 0 : 0;
};

// ─────────────────────────────────────────────────────────────
// Payment helpers
// ─────────────────────────────────────────────────────────────
const getPaymentTypeLabel = (paymentType?: string | null): string => {
  if (!paymentType) return "N/A";
  if (paymentType === "full") return "Full Payment";
  if (paymentType === "downpayment") return "Downpayment (50%)";
  if (paymentType === "remaining") return "Remaining Balance";
  return paymentType;
};

const computePaymentTotals = (billing?: {
  total_amount?: string | number | null;
  paid_amount?: string | number | null;
  balance?: string | number | null;
  payment_type?: string | null;
}) => {
  const total = Number(billing?.total_amount ?? 0) || 0;
  const paymentType = billing?.payment_type ?? null;

  const hasPaid = billing?.paid_amount != null;
  const hasBalance = billing?.balance != null;

  let paid = hasPaid
    ? Number(billing?.paid_amount) || 0
    : paymentType === "full"
      ? total
      : total / 2;

  let balance = hasBalance
    ? Number(billing?.balance) || 0
    : total - paid;

  if (Math.abs(balance) < 0.01) balance = 0;

  const isFullyPaid = total > 0 && balance <= 0;
  const isPartial = !isFullyPaid && paid > 0;
  const isUnpaid = !isFullyPaid && paid <= 0;

  return { total, paid, balance, paymentType, isFullyPaid, isPartial, isUnpaid };
};

interface ProductUsage {
  id: number;
  product_id: number;
  product_name: string;
  estimated_usage: number;
  inventory_id: number | null;
  current_quantity: number;
  current_usages: number;
  quantity_change: number;
  service_id?: number;
  service_name?: string;
}

interface ServiceTransaction {
  id: number;
  service_id: number;
  service_name: string;
  duration_minutes: number;
  price: string;
  service_status: string;
  notes?: string;
  transaction_id: number;
  hair_length?: string | null;
  hair_thickness?: string | null;
  preferred_color?: string | null;
  completed_at?: string | null;
}

interface Appointment {
  id: number;
  customer_id: number;
  customer_name: string;
  customer_phone?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  services: ServiceTransaction[];
  service_names: string[];
  total_price: number;
  total_duration: number;
  service_name?: string;
  duration_minutes?: number;
  price?: string;
  notes?: string;
  transaction_id?: number;
}

interface WalkIn {
  id: number;
  // ✅ Account link (null for guest walk-ins). Preserved through updates.
  customer_id?: number | null;
  customer_name: string;
  service_id: number;
  stylist_id: number;
  amount_paid: number;
  is_finished: number;
  created_at: string;
  updated_at: string;
  services?: {
    id: number;
    service_name: string;
    description: string;
    price: string;
    duration_minutes: number;
    is_multitaskable: number;
    service_status: string;
    created_at: string;
    updated_at: string;
  };
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    profile_image: string | null;
    email: string;
    email_verified_at: string | null;
    phone_number: string;
    role: string;
    created_at: string;
    updated_at: string;
  };
  hair_length?: string;
  hair_thickness?: string;
  preferred_color?: string;
}

interface DisplayItem {
  id: number;
  customer_name: string;
  customer_phone?: string;
  appointment_date?: string;
  appointment_time?: string;
  status: string;
  services: ServiceTransaction[];
  service_names: string[];
  total_price: number;
  total_duration: number;
  notes?: string;
  transaction_id?: number;
  is_walk_in: boolean;
  walk_in_data?: WalkIn;
  stylist_name?: string;
  created_at?: string;
  service_name?: string;
  duration_minutes?: number;
  price?: string;
}

interface BusinessSchedule {
  id: number;
  business_date: string;
  open_time: string;
  close_time: string;
  is_open: number;
}

interface StaffAssignment {
  id: number;
  staff_id: number;
  business_date_id: number;
}

interface PaymentData {
  id: number;
  billing_id: number;
  payment_method: string;
  payment_proof: string | null;
  created_at: string;
  updated_at: string;
  payment_type?: string;
  billing?: {
    id: number;
    appointment_id: number;
    total_amount: string;
    paid_amount?: string | null;
    balance?: string | null;
    payment_type: string;
    created_at: string;
    updated_at: string;
  };
}

interface StaffAppointmentsProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function StaffAppointments({
  refreshing,
  onRefresh,
}: StaffAppointmentsProps) {
  const [showUpdatePage, setShowUpdatePage] = useState(false);

  // ✅ Walk-in update is now a separate page (was a modal)
  const [showWalkInUpdatePage, setShowWalkInUpdatePage] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [selectedWalkIn, setSelectedWalkIn] = useState<WalkIn | null>(null);
  const [selectedPaymentData, setSelectedPaymentData] = useState<PaymentData | null>(null);
  const [productUsages, setProductUsages] = useState<ProductUsage[]>([]);
  const [updateFormData, setUpdateFormData] = useState({
    status: "",
    notes: "",
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUpdatingWalkIn, setIsUpdatingWalkIn] = useState(false);

  // ✅ Status is no longer edited manually — updating a walk-in always completes it
  const [walkInUpdateData, setWalkInUpdateData] = useState({
    customer_name: "",
    amount_paid: 0,
  });

  const [walkInProductUsages, setWalkInProductUsages] = useState<ProductUsage[]>([]);

  // ✅ E-wallet QR code (same endpoint the customer booking screen uses)
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [gcashNumber, setGcashNumber] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);
  const [hasLoadedQr, setHasLoadedQr] = useState(false);

  const [staffAppointments, setStaffAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [walkInTransactions, setWalkInTransactions] = useState<any[]>([]);

  // ✅ Cache billing info per appointment
  const [billingMap, setBillingMap] = useState<
    Map<number, { payment_type: string | null; total_amount: number; paid_amount: number; balance: number; payment_method: string | null }>
  >(new Map());

  const { user } = useAuth();

  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);

  // ✅ Price adjustments cache
  const [adjustmentMap, setAdjustmentMap] = useState<Map<number, PriceAdjustment[]>>(new Map());

  // ─────────────────────────────────────────────
  // API calls
  // ─────────────────────────────────────────────
  const updateAppointmentServices = async (appointmentId: number, data: any) => {
    try {
      const response = await api.put(`/staff/appointment/${appointmentId}/update`, data);
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  // ✅ Settle remaining balance — updates billing directly, no payment row
  const settleRemainingBalance = async (appointmentId: number) => {
    const response = await api.post("/appointment/settle-balance", {
      appointment_id: appointmentId,
    });
    return response.data;
  };

  const fetchPriceAdjustments = async () => {
    try {
      const response = await api.get('/services/price/adjustment');
      if (Array.isArray(response.data)) {
        setAdjustmentMap(buildAdjustmentMap(response.data));
      }
    } catch (error) {
      // silently ignore
    }
  };

  // ✅ Fetch the e-wallet QR code + GCash number
  const fetchQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await api.get("/qr-code");
      const data = response.data;
      setQrImageUrl(getImageUrl(data?.qr_image || data?.qr_image_path) || null);
      setGcashNumber(data?.gcash_number || null);
      return data;
    } catch (error) {
      setQrImageUrl(null);
      setGcashNumber(null);
      return null;
    } finally {
      setIsLoadingQr(false);
      setHasLoadedQr(true);
    }
  };

  const handleShowQrCode = () => {
    setShowQrModal(true);
    // Load lazily the first time (and retry if the last attempt returned nothing)
    if (!hasLoadedQr || !qrImageUrl) {
      fetchQrCode();
    }
  };

  // ✅ Fetch all payments once so we know each appointment's payment_type
  const fetchBillingInfo = async () => {
    try {
      const response = await api.get("/appointment/payment");
      if (!Array.isArray(response.data)) return;

      const map = new Map<
        number,
        { payment_type: string | null; total_amount: number; paid_amount: number; balance: number; payment_method: string | null }
      >();

      response.data.forEach((item: any) => {
        const billing = item.billing;
        if (!billing?.appointment_id) return;

        const appointmentId = billing.appointment_id;

        // Keep the latest entry per appointment
        const existing = map.get(appointmentId);
        const existingTime = existing ? 1 : 0;
        const itemTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;

        const total = Number(billing.total_amount ?? 0) || 0;
        const paid = Number(billing.paid_amount ?? total / 2) || 0;
        const balance = Number(billing.balance ?? total - paid) || 0;

        const normalized = {
          payment_type: billing.payment_type ?? null,
          total_amount: total,
          paid_amount: paid,
          balance: Math.abs(balance) < 0.01 ? 0 : balance,
          payment_method: item.payment_method ?? null,
        };

        if (!existing || itemTime >= existingTime) {
          map.set(appointmentId, normalized);
        }
      });

      setBillingMap(map);
    } catch (error) {
      // silently ignore
    }
  };

  const fetchStaffAppointments = async () => {
    try {
      const userData = user;
      if (!userData?.id) return [];

      const response = await api.get(`/staff/${userData.id}/appointments`);

      let transactions: any[] = [];
      if (Array.isArray(response.data)) {
        transactions = response.data;
      }

      const appointmentMap = new Map<
        number,
        {
          id: number;
          customer_id: number;
          customer_name: string;
          customer_phone?: string;
          appointment_date?: string;
          appointment_time?: string;
          status: string;
          services: ServiceTransaction[];
        }
      >();

      transactions.forEach((item: any) => {
        const appointmentId = item.id;

        if (!appointmentMap.has(appointmentId)) {
          appointmentMap.set(appointmentId, {
            id: appointmentId,
            customer_id: item.customer_id || 0,
            customer_name: item.customer_name || "Walk-in Customer",
            customer_phone: item.customer_phone || "N/A",
            appointment_date: item.appointment_date,
            appointment_time: item.appointment_time || "--:--",
            status: item.status || "pending",
            services: [],
          });
        }

        const appointment = appointmentMap.get(appointmentId)!;

        const basePrice = parseFloat(item.price) || 0;
        const additional = getAdditionalPrice(
          adjustmentMap,
          item.service_id,
          item.hair_length,
          item.hair_thickness
        );
        const adjustedPrice = basePrice + additional;

        appointment.services.push({
          id: item.transaction_id || item.id,
          service_id: item.service_id,
          service_name: item.service_name || "Unknown Service",
          duration_minutes: item.duration_minutes || 0,
          price: adjustedPrice.toString(),
          service_status: item.service_status || "pending",
          notes: item.notes || "",
          transaction_id: item.transaction_id || item.id,
          hair_length: item.hair_length || "",
          hair_thickness: item.hair_thickness || "",
          preferred_color: item.preferred_color || "",
          completed_at: item.completed_at || null,
        });
      });

      const groupedAppointments: Appointment[] = Array.from(appointmentMap.values())
        .map((appointment) => {
          const svcs = appointment.services || [];
          const serviceNames = svcs.map((s) => s.service_name || "Unknown Service");
          const totalPrice = svcs.reduce((sum, s) => sum + parseFloat(s.price || "0"), 0);
          const totalDuration = svcs.reduce((sum, s) => sum + (s.duration_minutes || 0), 0);
          const firstTransaction = svcs[0];

          return {
            id: appointment.id,
            customer_id: appointment.customer_id,
            customer_name: appointment.customer_name,
            customer_phone: appointment.customer_phone,
            appointment_date: appointment.appointment_date,
            appointment_time: appointment.appointment_time,
            status: appointment.status,
            services: svcs,
            service_names: serviceNames,
            total_price: totalPrice,
            total_duration: totalDuration,
            service_name: serviceNames.join(" + ") || "No Service",
            duration_minutes: totalDuration,
            price: totalPrice.toString(),
            notes: svcs.map((s) => s.notes).filter(Boolean).join(", ") || "",
            transaction_id: firstTransaction?.transaction_id,
          };
        })
        .filter(
          (app) =>
            app.status === "confirmed" ||
            app.status === "completed" ||
            app.status === "no-show"
        );

      setStaffAppointments(groupedAppointments);
      return groupedAppointments;
    } catch (error) {
      return [];
    }
  };

  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      let staffData: any[] = [];
      if (Array.isArray(response.data)) {
        staffData = response.data;
      }
      setStaff(staffData);
      return staffData;
    } catch (error) {
      return [];
    }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      let servicesData: any[] = [];
      if (Array.isArray(response.data)) {
        servicesData = response.data.map((service: any) => ({
          id: service.id,
          service_name: service.service_name,
          description: service.description,
          price: parseFloat(service.price),
          is_multitaskable: service.is_multitaskable,
          duration_minutes: service.duration_minutes,
          service_status: service.service_status,
          created_at: service.created_at,
          updated_at: service.updated_at,
        }));
      }
      setServices(servicesData);
      return servicesData;
    } catch (error) {
      return [];
    }
  };

  const fetchWalkIns = async () => {
    try {
      const response = await api.get("/walk-in");
      let walkInsData: WalkIn[] = [];
      if (Array.isArray(response.data)) {
        walkInsData = response.data.map((item: any) => ({
          id: item.id,
          // ✅ Read the account link if the backend returns it
          customer_id: item.customer_id ?? null,
          customer_name: item.customer_name,
          service_id: item.service_id,
          stylist_id: item.stylist_id,
          amount_paid: item.amount_paid || 0,
          is_finished: item.is_finished,
          created_at: item.created_at,
          updated_at: item.updated_at,
          services: item.services,
          user: item.user,
          hair_length: item.hair_length || "",
          hair_thickness: item.hair_thickness || "",
          preferred_color: item.preferred_color || "",
        }));
      }
      setWalkIns(walkInsData);
      return walkInsData;
    } catch (error) {
      return [];
    }
  };

  // ✅ Preserve customer_id when updating — otherwise it would be nulled out on completion
  const updateWalkIn = async (id: number, data: any) => {
    try {
      const response = await api.post(`/walk-in/update/${id}`, {
        customer_id: data.customer_id ?? null,
        customer_name: data.customer_name,
        service_id: data.service_id,
        stylist_id: data.stylist_id,
        amount_paid: data.amount_paid,
        is_finished: data.is_finished,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const fetchWalkInTransactions = async () => {
    try {
      const response = await api.get("/walk-in/transaction");
      let transactionsData: any[] = [];
      if (Array.isArray(response.data)) {
        transactionsData = response.data.map((item: any) => ({
          id: item.id,
          walkin_id: item.walkin_id,
          inventory_id: item.inventory_id,
          quantity_change: item.quantity_change,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
      }
      setWalkInTransactions(transactionsData);
      return transactionsData;
    } catch (error) {
      return [];
    }
  };

  const submitWalkInTransaction = async (data: {
    walkin_id: number;
    inventory_id: number;
    quantity_change: number;
  }) => {
    try {
      const response = await api.post("/walk-in/transaction/add", {
        walkin_id: data.walkin_id,
        inventory_id: data.inventory_id,
        quantity_change: data.quantity_change,
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get("/daysched");
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      // silently ignore
    }
  };

  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get("/assign");
      if (Array.isArray(response.data)) {
        setStaffAssignments(response.data);
      }
    } catch (error) {
      // silently ignore
    }
  };

  const fetchPaymentProof = async (appointmentId: number) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);

      if (!response.data) {
        Alert.alert("No Payment Found", "No payment record found for this appointment.");
        return;
      }

      let payments: any[] = [];
      if (Array.isArray(response.data)) {
        payments = response.data;
      } else if (response.data.billing || response.data.appointment_id) {
        payments = [response.data];
      }

      const filtered = payments.filter(
        (item: any) => item.billing?.appointment_id === appointmentId
      );

      if (filtered.length === 0) {
        Alert.alert(
          "No Payment Found",
          "No payment record found for this appointment."
        );
        return;
      }

      const latestPayment = [...filtered].sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (aTime !== bTime) return bTime - aTime;
        return (b.id || 0) - (a.id || 0);
      })[0];

      setSelectedPaymentData(latestPayment);
      setShowPaymentProofModal(true);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to fetch payment data");
    }
  };

  // ─────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────
  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(
      2,
      "0"
    )}-${String(date.getUTCDate()).padStart(2, "0")}`;
  };

  const formatTime = (time: string) => {
    if (!time) return "--:--";
    const [hours, minutes] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTodayStaff = useCallback(() => {
    const todayStr = getUTCDateString(new Date());
    const schedule = businessSchedules.find((s) => s.business_date === todayStr);
    if (!schedule) return [];

    const assignments = staffAssignments.filter((a) => a.business_date_id === schedule.id);
    const staffIds = assignments.map((a) => a.staff_id);
    return staff.filter((s) => staffIds.includes(s.id));
  }, [businessSchedules, staffAssignments, staff]);

  const fetchAllProductUsagesForAppointment = async (svcs: ServiceTransaction[]) => {
    try {
      let allUsages: ProductUsage[] = [];

      for (const service of svcs) {
        if (!service.service_id) continue;

        const response = await api.get(`/service/${service.service_id}/product-usages`);

        if (Array.isArray(response.data) && response.data.length > 0) {
          const usages = response.data.map((usage: any) => ({
            id: usage.id,
            product_id: usage.product_id,
            product_name: usage.product_name || "Unknown Product",
            estimated_usage: usage.estimated_usage || 0,
            inventory_id: usage.inventory_id,
            current_quantity: usage.current_quantity || 0,
            current_usages: usage.current_usages || 0,
            quantity_change: 0,
            service_id: service.service_id,
            service_name: service.service_name,
          }));
          allUsages = [...allUsages, ...usages];
        }
      }

      return allUsages;
    } catch (error) {
      Alert.alert("Error", "Failed to load product information");
      return [];
    }
  };

  // Local (device-timezone) YYYY-MM-DD — used for bucketing and "is today" checks
  const getLocalDateStr = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;

  // The display date of an item, normalized to local time.
  // Walk-ins are stamped in UTC on the server, so convert first.
  const getItemDateStr = (item: DisplayItem): string => {
    if (item.is_walk_in && item.walk_in_data?.created_at) {
      const d = new Date(item.walk_in_data.created_at);
      if (!isNaN(d.getTime())) return getLocalDateStr(d);
    }
    return (item.appointment_date || item.created_at || "").slice(0, 10);
  };

  // ✅ Restriction: only items scheduled/created TODAY can be updated
  const isItemToday = (item: DisplayItem): boolean => {
    const today = getLocalDateStr(new Date());
    return getItemDateStr(item) === today;
  };

  // A real point in time for sorting: when a walk-in was created, or when an appointment is scheduled
  const getItemTimestamp = (item: DisplayItem): number => {
    if (item.is_walk_in && item.walk_in_data?.created_at) {
      const t = new Date(item.walk_in_data.created_at).getTime();
      if (!isNaN(t)) return t;
    }
    const [y, m, d] = (item.appointment_date || "").slice(0, 10).split("-").map(Number);
    if (!y || !m || !d) return 0;
    const [hh, mm] = (item.appointment_time || "").split(":").map(Number);
    return new Date(y, m - 1, d, hh || 0, mm || 0).getTime();
  };

  // true: the latest entry is always at the top of its list
  // false: the soonest entry is at the top instead
  const LATEST_FIRST = true;

  // Past appointments/walk-ins are dropped; only today and later are kept
  const getGroupedByDate = (items: DisplayItem[]) => {
    const today = getLocalDateStr(new Date());

    const buckets = {
      today: { appointments: [] as DisplayItem[], walkIns: [] as DisplayItem[] },
      upcoming: { appointments: [] as DisplayItem[], walkIns: [] as DisplayItem[] },
    };

    items.forEach((item) => {
      const dateToCheck = getItemDateStr(item);
      if (!dateToCheck || dateToCheck < today) return; // past (or undated) → not shown

      const bucket = dateToCheck === today ? "today" : "upcoming";
      const target = item.is_walk_in
        ? buckets[bucket].walkIns
        : buckets[bucket].appointments;
      target.push(item);
    });

    const sortItems = (a: DisplayItem, b: DisplayItem) =>
      LATEST_FIRST
        ? getItemTimestamp(b) - getItemTimestamp(a)
        : getItemTimestamp(a) - getItemTimestamp(b);

    buckets.today.appointments.sort(sortItems);
    buckets.today.walkIns.sort(sortItems);
    buckets.upcoming.appointments.sort(sortItems);
    buckets.upcoming.walkIns.sort(sortItems);

    return buckets;
  };

  const handleOpenUpdateModal = async (item: DisplayItem) => {
    // ✅ Guard: only today's appointments/walk-ins can be updated
    if (!isItemToday(item)) {
      Alert.alert(
        "Cannot Update",
        "You can only update appointments and walk-ins scheduled for today."
      );
      return;
    }

    if (item.is_walk_in && item.walk_in_data) {
      setSelectedWalkIn(item.walk_in_data);
      setWalkInUpdateData({
        customer_name: item.customer_name,
        amount_paid: item.walk_in_data.amount_paid || 0,
      });

      if (item.walk_in_data.service_id) {
        const usages = await fetchAllProductUsagesForAppointment([
          {
            id: item.walk_in_data.id,
            service_id: item.walk_in_data.service_id,
            service_name: item.walk_in_data.services?.service_name || "Unknown Service",
            duration_minutes: item.walk_in_data.services?.duration_minutes || 0,
            price: item.walk_in_data.services?.price?.toString() || "0",
            service_status: "pending",
            notes: "Walk-in customer",
            transaction_id: item.walk_in_data.id,
          },
        ]);
        setWalkInProductUsages(usages);
      } else {
        setWalkInProductUsages([]);
      }

      // ✅ Open the full-page walk-in manager instead of a modal
      setShowWalkInUpdatePage(true);
      return;
    }

    const appointment = staffAppointments.find((a) => a.id === item.id);
    if (!appointment) {
      Alert.alert("Error", "Appointment not found");
      return;
    }

    setSelectedAppointment(appointment);
    setUpdateFormData({
      status: appointment.status,
      notes: appointment.notes || "",
    });

    if (appointment.services && appointment.services.length > 0) {
      const usages = await fetchAllProductUsagesForAppointment(appointment.services);
      setProductUsages(usages);
    } else {
      setProductUsages([]);
    }

    setShowUpdatePage(true);
  };

  const handleProductQuantityChange = (index: number, value: string) => {
    const updatedUsages = [...productUsages];
    const numericValue = parseInt(value) || 0;
    updatedUsages[index].quantity_change = numericValue;
    setProductUsages(updatedUsages);

    const product = updatedUsages[index];
    if (product && product.inventory_id) {
      const availableStock = product.current_quantity || 0;
      if (availableStock <= 0) {
        Alert.alert(
          "Out of Stock",
          `${product.product_name} has no available stock left. Please restock this product before using it.`
        );
      }
    }
  };

  const handleWalkInProductQuantityChange = (index: number, value: string) => {
    const updatedUsages = [...walkInProductUsages];
    const numericValue = parseInt(value) || 0;
    updatedUsages[index].quantity_change = numericValue;
    setWalkInProductUsages(updatedUsages);

    const product = updatedUsages[index];
    if (product && product.inventory_id) {
      const availableStock = product.current_quantity || 0;
      if (availableStock <= 0) {
        Alert.alert(
          "Out of Stock",
          `${product.product_name} has no available stock left. Please restock this product before using it.`
        );
      }
    }
  };

  const closeWalkInUpdatePage = () => {
    setShowWalkInUpdatePage(false);
    setShowQrModal(false);
    setSelectedWalkIn(null);
    setWalkInProductUsages([]);
  };

  // ─────────────────────────────────────────────
  // handleUpdateSubmit:
  //   1) Update appointment (status, notes, product usages)
  //   2) If completing from a downpayment → update the billing row
  //      (paid_amount = total, balance = 0, payment_type = 'full')
  // ─────────────────────────────────────────────
  const handleUpdateSubmit = async () => {
    if (!selectedAppointment) return;

    // Stock validation
    for (const product of productUsages) {
      if (product.quantity_change > 0 && product.inventory_id) {
        const availableUsages =
          product.current_quantity * product.estimated_usage - product.current_usages;
        if (product.quantity_change > availableUsages && availableUsages > 0) {
          Alert.alert(
            "Insufficient Stock",
            `Not enough ${product.product_name} available. Available: ${availableUsages} units`
          );
          return;
        }
      }
    }

    // ✅ Should we settle the remaining balance?
    const isMarkingCompleted =
      updateFormData.status === "completed" &&
      selectedAppointment.status !== "completed";

    const cachedBilling = billingMap.get(selectedAppointment.id);
    const isDownpayment = cachedBilling?.payment_type === "downpayment";
    const remainingBalance = cachedBilling
      ? Math.max(0, cachedBilling.balance)
      : 0;

    const shouldSettleRemaining =
      isMarkingCompleted && isDownpayment && remainingBalance > 0;

    // Confirm dialog
    if (shouldSettleRemaining) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          "Settle Remaining Balance",
          `This appointment used a downpayment.\n\n` +
            `Remaining balance: ₱${remainingBalance.toLocaleString()}\n\n` +
            `Proceeding will mark the appointment as completed and update the billing to reflect the full payment.`,
          [
            { text: "Cancel", style: "cancel", onPress: () => resolve(false) },
            { text: "Confirm", onPress: () => resolve(true) },
          ]
        );
      });
      if (!confirmed) return;
    }

    setIsUpdating(true);
    try {
      const updateData = {
        status: updateFormData.status,
        notes: updateFormData.notes,
        product_usages: productUsages
          .filter((p) => p.quantity_change > 0 && p.inventory_id)
          .map((p) => ({
            inventory_id: p.inventory_id,
            quantity_change: p.quantity_change,
          })),
      };

      // 1) Update the appointment
      await updateAppointmentServices(selectedAppointment.id, updateData);

      // 2) Update the billing row (no new payment row created)
      if (shouldSettleRemaining) {
        try {
          await settleRemainingBalance(selectedAppointment.id);
        } catch (settleError: any) {
          Alert.alert(
            "Appointment Updated",
            `The appointment was marked as completed, but the billing could not be updated.\n\n` +
              `Reason: ${settleError?.response?.data?.message || settleError?.message || "Unknown error"}\n\n` +
              `Please update the billing manually.`
          );
          setShowUpdatePage(false);
          setSelectedAppointment(null);
          await Promise.all([fetchStaffAppointments(), fetchBillingInfo()]);
          return;
        }

        Alert.alert(
          "Success",
          `Appointment completed!\n\n` +
            `Billing updated: paid ₱${remainingBalance.toLocaleString()} remaining balance.`
        );
      } else {
        Alert.alert("Success", "Appointment updated successfully!");
      }

      setShowUpdatePage(false);
      setSelectedAppointment(null);
      await Promise.all([fetchStaffAppointments(), fetchBillingInfo()]);
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update appointment");
    } finally {
      setIsUpdating(false);
    }
  };

  // ✅ Updating a walk-in now always marks it as completed (is_finished = 1)
  const handleWalkInUpdate = async () => {
    if (!selectedWalkIn) return;

    if (!walkInUpdateData.customer_name.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
      return;
    }

    // ✅ Updating completes the walk-in, so an amount must be recorded first
    if (!walkInUpdateData.amount_paid || walkInUpdateData.amount_paid <= 0) {
      Alert.alert(
        "Amount Paid Required",
        "Please enter the amount paid by the customer before completing this walk-in."
      );
      return;
    }

    for (const product of walkInProductUsages) {
      if (product.quantity_change > 0 && product.inventory_id) {
        const availableUsages =
          product.current_quantity * product.estimated_usage - product.current_usages;
        if (product.quantity_change > availableUsages && availableUsages > 0) {
          Alert.alert(
            "Insufficient Stock",
            `Not enough ${product.product_name} available. Available: ${availableUsages} units`
          );
          return;
        }
      }
    }

    setIsUpdatingWalkIn(true);
    try {
      const updateData = {
        // ✅ Preserve the customer link so it doesn't get nulled on completion
        customer_id: selectedWalkIn.customer_id ?? null,
        customer_name: walkInUpdateData.customer_name.trim(),
        service_id: selectedWalkIn.service_id,
        stylist_id: selectedWalkIn.stylist_id,
        amount_paid: walkInUpdateData.amount_paid,
        is_finished: 1,
      };

      await updateWalkIn(selectedWalkIn.id, updateData);

      const transactions = walkInProductUsages
        .filter((p) => p.quantity_change > 0 && p.inventory_id)
        .map((p) => ({
          walkin_id: selectedWalkIn.id,
          inventory_id: p.inventory_id!,
          quantity_change: p.quantity_change,
        }));

      if (transactions.length > 0) {
        for (const transaction of transactions) {
          await submitWalkInTransaction(transaction);
        }
      }

      Alert.alert("Success", "Walk-in completed successfully!");
      closeWalkInUpdatePage();
      await Promise.all([
        fetchStaffAppointments(),
        fetchWalkIns(),
        fetchWalkInTransactions(),
        fetchStaffAssignments(),
      ]);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to update walk-in customer"
      );
    } finally {
      setIsUpdatingWalkIn(false);
    }
  };

  // ─────────────────────────────────────────────
  // Combine items
  // ─────────────────────────────────────────────
  const getDisplayItems = (): DisplayItem[] => {
    const currentStaffId = user?.id;

    const appointmentItems: DisplayItem[] = staffAppointments.map((app) => {
      const svcs = app.services || [];

      return {
        id: app.id,
        customer_name: app.customer_name,
        customer_phone: app.customer_phone,
        appointment_date: app.appointment_date,
        appointment_time: app.appointment_time,
        status: app.status,
        services: svcs,
        service_names: app.service_names || ["No Service"],
        total_price: app.total_price || 0,
        total_duration: app.total_duration || 0,
        notes: app.notes,
        transaction_id: app.transaction_id,
        is_walk_in: false,
        walk_in_data: undefined,
        created_at: app.appointment_date,
        service_name: app.service_name,
        duration_minutes: app.duration_minutes,
        price: app.price,
      };
    });

    const filteredWalkIns = walkIns.filter(
      (walkIn: WalkIn) => walkIn.stylist_id === currentStaffId
    );

    const walkInItems: DisplayItem[] = filteredWalkIns.map((walkIn: WalkIn) => {
      const isFinished = walkIn.is_finished === 1;
      const serviceStatus = isFinished ? "completed" : "pending";

      const stylistName = walkIn.user
        ? `${walkIn.user.first_name || ""} ${walkIn.user.last_name || ""}`.trim()
        : "Unknown Stylist";

      const service: ServiceTransaction = {
        id: walkIn.service_id || 0,
        service_id: walkIn.service_id || 0,
        service_name: walkIn.services?.service_name || "Unknown Service",
        duration_minutes: walkIn.services?.duration_minutes || 0,
        price: walkIn.services?.price?.toString() || "0",
        service_status: serviceStatus,
        notes: "Walk-in customer",
        transaction_id: walkIn.id,
        hair_length: walkIn.hair_length || "",
        hair_thickness: walkIn.hair_thickness || "",
        preferred_color: walkIn.preferred_color || "",
      };

      return {
        id: walkIn.id,
        customer_name: walkIn.customer_name || "Walk-in Customer",
        customer_phone: undefined,
        appointment_date: walkIn.created_at ? walkIn.created_at.split("T")[0] : undefined,
        appointment_time: walkIn.created_at
          ? walkIn.created_at.split("T")[1]?.slice(0, 5)
          : undefined,
        status: isFinished ? "completed" : "pending",
        services: [service],
        service_names: [service.service_name],
        total_price: parseFloat(service.price),
        total_duration: service.duration_minutes,
        notes: "Walk-in customer",
        transaction_id: walkIn.id,
        is_walk_in: true,
        walk_in_data: walkIn,
        stylist_name: stylistName,
        created_at: walkIn.created_at,
        service_name: service.service_name,
        duration_minutes: service.duration_minutes,
        price: service.price,
      };
    });

    return [...appointmentItems, ...walkInItems];
  };

  // ─────────────────────────────────────────────
  // Renderers
  // ─────────────────────────────────────────────
  const renderHairDetails = (svcs: ServiceTransaction[]) => {
    const hairDetails = svcs
      .filter((s) => s.hair_length || s.hair_thickness || s.preferred_color)
      .map((s) => ({
        hair_length: s.hair_length,
        hair_thickness: s.hair_thickness,
        preferred_color: s.preferred_color,
      }));

    if (hairDetails.length === 0) return null;

    const details = hairDetails.find(
      (d) => d.hair_length || d.hair_thickness || d.preferred_color
    );
    if (!details) return null;

    const parts = [];
    if (details.hair_length)
      parts.push(
        `Length: ${
          details.hair_length.charAt(0).toUpperCase() + details.hair_length.slice(1)
        }`
      );
    if (details.hair_thickness)
      parts.push(
        `Thickness: ${
          details.hair_thickness.charAt(0).toUpperCase() +
          details.hair_thickness.slice(1)
        }`
      );
    if (details.preferred_color) parts.push(`Color: ${details.preferred_color}`);

    if (parts.length === 0) return null;

    return (
      <View className="flex-row items-center mt-1 flex-wrap">
        <Ionicons name="color-palette-outline" size={12} color="#8b5cf6" />
        <Text className="text-purple-600 text-xs ml-1">{parts.join(" • ")}</Text>
      </View>
    );
  };

  const renderTransactionDetails = (svcs: ServiceTransaction[]) => {
    if (!svcs || svcs.length === 0) return null;

    return (
      <View className="mb-4 p-3 bg-gray-50 rounded-xl">
        <Text className="text-gray-600 text-sm font-semibold mb-2">
          Transaction Details
        </Text>
        {svcs.map((service, index) => {
          const hasHairDetails =
            service.hair_length || service.hair_thickness || service.preferred_color;
          return (
            <View
              key={index}
              className={`${index > 0 ? "border-t border-gray-200 pt-2 mt-2" : ""}`}
            >
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-800 font-semibold text-sm">
                  {service.service_name}
                </Text>
                <Text className="text-pink-600 font-semibold text-sm">
                  ₱{parseFloat(service.price).toLocaleString()}
                </Text>
              </View>
              <View className="mt-1 space-y-1">
                {service.hair_length && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Hair Length:</Text>
                    <Text className="text-gray-700 text-xs font-medium capitalize">
                      {service.hair_length}
                    </Text>
                  </View>
                )}
                {service.hair_thickness && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Hair Thickness:</Text>
                    <Text className="text-gray-700 text-xs font-medium capitalize">
                      {service.hair_thickness}
                    </Text>
                  </View>
                )}
                {service.preferred_color && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Preferred Color:</Text>
                    <Text className="text-gray-700 text-xs font-medium">
                      {service.preferred_color}
                    </Text>
                  </View>
                )}
                {!hasHairDetails && (
                  <Text className="text-gray-400 text-xs italic">
                    No hair details recorded
                  </Text>
                )}
                {service.completed_at && (
                  <View className="flex-row items-center">
                    <Text className="text-gray-500 text-xs w-24">Completed:</Text>
                    <Text className="text-gray-700 text-xs font-medium">
                      {new Date(service.completed_at).toLocaleDateString()}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    );
  };

  const renderItemCard = (item: DisplayItem) => {
    const isCompleted = item.status === "completed";
    const isNoShow = item.status === "no-show";
    const isWalkIn = item.is_walk_in;
    const isMultipleServices = item.services && item.services.length > 1;
    const svcs = item.services || [];
    const itemIsToday = isItemToday(item);

    const stylistName =
      isWalkIn && item.walk_in_data?.user
        ? `${item.walk_in_data.user.first_name || ""} ${
            item.walk_in_data.user.last_name || ""
          }`.trim()
        : item.stylist_name || "";

    const hairDetails = renderHairDetails(svcs);

    const displayDate = item.appointment_date
      ? formatDate(item.appointment_date)
      : item.walk_in_data?.created_at
      ? formatDate(item.walk_in_data.created_at)
      : "N/A";

    const statusBadge =
      item.status === "completed"
        ? { bg: "bg-green-100", text: "text-green-700", label: "COMPLETED" }
        : item.status === "no-show"
        ? { bg: "bg-red-100", text: "text-red-700", label: "NO-SHOW" }
        : item.status === "confirmed"
        ? { bg: "bg-blue-100", text: "text-blue-700", label: "CONFIRMED" }
        : { bg: "bg-pink-100", text: "text-pink-700", label: "PENDING" };

    return (
      <View
        key={`${isWalkIn ? "walkin" : "appt"}-${item.id}`}
        className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
      >
        <View className="flex-row justify-between items-start mb-3">
          <View className="flex-1">
            <View className="flex-row items-center mb-2">
              <View
                className={`p-2 rounded-full mr-3 ${
                  isWalkIn ? "bg-green-100" : "bg-pink-100"
                }`}
              >
                <Ionicons
                  name={isWalkIn ? "walk-outline" : "person-outline"}
                  size={20}
                  color={isWalkIn ? "#16a34a" : "#ec4899"}
                />
              </View>
              <View>
                <View className="flex-row items-center flex-wrap">
                  <Text className="text-gray-800 font-bold text-lg">
                    {item.customer_name}
                  </Text>
                  {isMultipleServices && (
                    <View className="ml-2 bg-pink-100 px-2 py-0.5 rounded-full">
                      <Text className="text-pink-600 text-xs font-semibold">
                        {svcs.length} services
                      </Text>
                    </View>
                  )}
                  {/* ✅ Small badge so staff knows the walk-in is linked to an account */}
                  {isWalkIn && item.walk_in_data?.customer_id && (
                    <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full flex-row items-center">
                      <Ionicons name="person-circle-outline" size={10} color="#2563eb" />
                      <Text className="text-blue-700 text-[10px] font-semibold ml-0.5">
                        Account
                      </Text>
                    </View>
                  )}
                </View>
                <Text className="text-gray-500 text-xs">
                  {isWalkIn ? `Walk-in • ${displayDate}` : `📅 ${displayDate}`}
                </Text>
                {stylistName && (
                  <Text className="text-gray-500 text-xs">Stylist: {stylistName}</Text>
                )}
                {isWalkIn &&
                  item.walk_in_data?.amount_paid !== undefined &&
                  item.walk_in_data?.amount_paid !== null && (
                    <Text className="text-green-600 text-xs">
                      Paid: ₱{item.walk_in_data.amount_paid.toLocaleString()}
                    </Text>
                  )}
              </View>
            </View>

            <View className="flex-row items-center mt-1">
              <Ionicons name="cut-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-600 text-sm ml-1">
                {item.service_names ? item.service_names.join(" + ") : "No Service"}
              </Text>
            </View>

            {hairDetails}

            {isMultipleServices && svcs.length > 0 && (
              <View className="mt-1 ml-5">
                {svcs.map((service, index) => (
                  <View key={index} className="flex-row items-center mt-0.5">
                    <View className="w-1 h-1 bg-gray-400 rounded-full mr-2" />
                    <Text className="text-gray-500 text-xs">
                      {service.service_name} ({service.duration_minutes} mins) - ₱
                      {parseFloat(service.price).toLocaleString()}
                    </Text>
                    {(service.hair_length ||
                      service.hair_thickness ||
                      service.preferred_color) && (
                      <Text className="text-purple-500 text-[10px] ml-1">
                        [{service.hair_length || ""} {service.hair_thickness || ""}{" "}
                        {service.preferred_color || ""}]
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            <View className="flex-row items-center mt-1">
              <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">
                {isMultipleServices
                  ? `Total: ${item.total_duration} mins`
                  : `${item.duration_minutes} mins`}
              </Text>
            </View>

            {item.notes && (
              <View className="flex-row items-center mt-1">
                <Ionicons name="document-text-outline" size={12} color="#9ca3af" />
                <Text className="text-gray-400 text-xs italic" numberOfLines={1}>
                  {item.notes}
                </Text>
              </View>
            )}

            {!isCompleted && !isNoShow && !itemIsToday && (
              <View className="flex-row items-center mt-1">
                <Ionicons
                  name="information-circle-outline"
                  size={12}
                  color="#f59e0b"
                />
                <Text className="text-amber-600 text-xs ml-1">
                  Updating is only available on the scheduled day
                </Text>
              </View>
            )}
          </View>

          <View className={`px-3 py-1.5 rounded-full ${statusBadge.bg}`}>
            <Text className={`text-xs font-semibold ${statusBadge.text}`}>
              {statusBadge.label}
            </Text>
          </View>
        </View>

        <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
          <Text className="text-pink-500 font-bold text-lg">
            ₱
            {isMultipleServices
              ? item.total_price.toLocaleString()
              : parseFloat(item.price || "0").toLocaleString()}
          </Text>

          <View className="flex-row gap-2">
            {!isWalkIn && (
              <TouchableOpacity
                className="bg-purple-500 px-3 py-2 rounded-xl"
                onPress={() => fetchPaymentProof(item.id)}
              >
                <Ionicons name="image-outline" size={16} color="white" />
              </TouchableOpacity>
            )}

            {!isCompleted && !isNoShow && (
              itemIsToday ? (
                <TouchableOpacity
                  className="bg-blue-600 px-5 py-2 rounded-xl"
                  onPress={() => handleOpenUpdateModal(item)}
                >
                  <Text className="text-white font-semibold text-sm">Update</Text>
                </TouchableOpacity>
              ) : (
                <View className="bg-gray-200 px-3 py-2 rounded-xl flex-row items-center gap-1">
                  <Ionicons name="lock-closed-outline" size={14} color="#6b7280" />
                  <Text className="text-gray-500 font-semibold text-xs">
                    Only today
                  </Text>
                </View>
              )
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderSubsectionHeader = (
    label: string,
    count: number,
    icon: keyof typeof Ionicons.glyphMap,
    color: string,
    bgColor: string
  ) => (
    <View className="flex-row items-center mb-3">
      <View className={`${bgColor} p-1.5 rounded-full mr-2`}>
        <Ionicons name={icon} size={14} color={color} />
      </View>
      <Text className="text-gray-700 font-bold text-sm flex-1">{label}</Text>
      <View className={`${bgColor} px-2 py-0.5 rounded-full`}>
        <Text style={{ color }} className="text-xs font-semibold">
          {count}
        </Text>
      </View>
    </View>
  );

  const renderDateSection = (
    title: string,
    count: number,
    appointments: DisplayItem[],
    walkIns: DisplayItem[],
    headerBg: string,
    headerText: string
  ) => {
    if (appointments.length === 0 && walkIns.length === 0) return null;

    return (
      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-800">{title}</Text>
          <View className={`${headerBg} px-3 py-1 rounded-full`}>
            <Text className={`${headerText} text-xs font-semibold`}>{count}</Text>
          </View>
        </View>

        {appointments.length > 0 && (
          <View className="mb-2">
            {renderSubsectionHeader(
              "Appointments",
              appointments.length,
              "calendar-outline",
              "#ec4899",
              "bg-pink-100"
            )}
            {appointments.map(renderItemCard)}
          </View>
        )}

        {walkIns.length > 0 && (
          <View className="mb-2">
            {renderSubsectionHeader(
              "Walk-ins",
              walkIns.length,
              "walk-outline",
              "#16a34a",
              "bg-green-100"
            )}
            {walkIns.map(renderItemCard)}
          </View>
        )}
      </View>
    );
  };

  const StatusDropdown = ({
    value,
    onValueChange,
    options,
    label,
    placeholder,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    options: string[];
    label: string;
    placeholder?: string;
  }) => {
    const [showDropdown, setShowDropdown] = useState(false);

    const getStatusColor = (status: string) => {
      switch (status) {
        case "confirmed":
          return "bg-blue-100 text-blue-700";
        case "pending":
          return "bg-yellow-100 text-yellow-700";
        case "completed":
          return "bg-green-100 text-green-700";
        case "no-show":
          return "bg-red-100 text-red-700";
        case "cancelled":
          return "bg-red-100 text-red-700";
        default:
          return "bg-gray-100 text-gray-700";
      }
    };

    return (
      <View className="mb-4">
        <Text className="text-gray-700 font-semibold mb-2">{label}</Text>
        <TouchableOpacity
          onPress={() => setShowDropdown(!showDropdown)}
          className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
        >
          <View className="flex-row items-center">
            {value ? (
              <View className={`px-3 py-1 rounded-full ${getStatusColor(value)}`}>
                <Text className="capitalize text-xs font-semibold">{value}</Text>
              </View>
            ) : (
              <Text className="text-gray-400 text-sm">
                {placeholder || "Select status..."}
              </Text>
            )}
          </View>
          <Ionicons
            name={showDropdown ? "chevron-up" : "chevron-down"}
            size={20}
            color="#9ca3af"
          />
        </TouchableOpacity>

        {showDropdown && (
          <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {options.map((option) => (
              <TouchableOpacity
                key={option}
                onPress={() => {
                  onValueChange(option);
                  setShowDropdown(false);
                }}
                className={`px-4 py-3 flex-row items-center justify-between ${
                  value === option ? "bg-pink-50" : ""
                } ${
                  option !== options[options.length - 1]
                    ? "border-b border-gray-100"
                    : ""
                }`}
              >
                <View className={`px-3 py-1 rounded-full ${getStatusColor(option)}`}>
                  <Text className="capitalize text-xs font-semibold">{option}</Text>
                </View>
                {value === option && (
                  <Ionicons name="checkmark-circle" size={20} color="#ec4899" />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const PaymentProofModal = () => {
    if (!selectedPaymentData) return null;

    const { payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || "N/A";

    const payment_type =
      selectedPaymentData?.payment_type ||
      billing?.payment_type ||
      null;

    const {
      total,
      paid,
      balance,
      isFullyPaid,
      isPartial,
    } = computePaymentTotals({
      total_amount: billing?.total_amount,
      paid_amount: billing?.paid_amount,
      balance: billing?.balance,
      payment_type,
    });

    const BASE_URL = (process.env.EXPO_PUBLIC_API_URL || "").replace(/\/api\/?$/, "");
    const proofUrl = payment_proof
      ? `${BASE_URL}${payment_proof}`
      : null;

    const statusPill = isFullyPaid
      ? { bg: "bg-green-100", text: "text-green-700", label: "PAID IN FULL" }
      : isPartial
      ? { bg: "bg-yellow-100", text: "text-yellow-700", label: "PARTIAL" }
      : { bg: "bg-red-100", text: "text-red-700", label: "UNPAID" };

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showPaymentProofModal}
        onRequestClose={() => {
          setShowPaymentProofModal(false);
          setSelectedPaymentData(null);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            <View className="bg-pink-500 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Payment Proof</Text>
              <TouchableOpacity
                onPress={() => {
                  setShowPaymentProofModal(false);
                  setSelectedPaymentData(null);
                }}
              >
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView
              contentContainerStyle={{ padding: 24 }}
              showsVerticalScrollIndicator={false}
            >
              <View
                className={`rounded-xl p-3 mb-4 flex-row items-center justify-between border ${
                  isFullyPaid
                    ? "bg-green-50 border-green-200"
                    : isPartial
                    ? "bg-yellow-50 border-yellow-200"
                    : "bg-red-50 border-red-200"
                }`}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <Ionicons
                    name={
                      isFullyPaid
                        ? "checkmark-circle"
                        : isPartial
                        ? "time-outline"
                        : "alert-circle"
                    }
                    size={20}
                    color={isFullyPaid ? "#16a34a" : isPartial ? "#ca8a04" : "#dc2626"}
                  />
                  <View>
                    <Text
                      className={`font-bold text-sm ${
                        isFullyPaid
                          ? "text-green-700"
                          : isPartial
                          ? "text-yellow-700"
                          : "text-red-700"
                      }`}
                    >
                      {statusPill.label}
                    </Text>
                    <Text className="text-gray-500 text-[11px] mt-0.5">
                      {isFullyPaid
                        ? "Customer has settled the full amount"
                        : isPartial
                        ? "Customer still has an outstanding balance"
                        : "No payment received yet"}
                    </Text>
                  </View>
                </View>
              </View>

              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Appointment ID</Text>
                  <Text className="text-gray-800 font-semibold">#{appointment_id}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Payment Type</Text>
                  <Text className="text-gray-800 font-semibold">
                    {getPaymentTypeLabel(payment_type)}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-sm">Payment Method</Text>
                  <Text className="text-gray-800 font-semibold">
                    {payment_method || "N/A"}
                  </Text>
                </View>
              </View>

              <View className="bg-white rounded-lg p-4 mb-4 border border-gray-200">
                <Text className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-3">
                  Amount Breakdown
                </Text>

                <View className="flex-row justify-between py-2 border-b border-gray-100">
                  <Text className="text-gray-600 text-sm">Total Amount</Text>
                  <Text className="text-gray-800 font-bold text-sm">
                    ₱{total.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between py-2 border-b border-gray-100">
                  <Text className="text-gray-600 text-sm">Amount Paid</Text>
                  <Text className="text-green-600 font-bold text-sm">
                    ₱{paid.toLocaleString()}
                  </Text>
                </View>

                <View className="flex-row justify-between py-2">
                  <Text className="text-gray-600 text-sm">Remaining Balance</Text>
                  <Text
                    className={`font-bold text-sm ${
                      balance > 0 ? "text-orange-600" : "text-green-600"
                    }`}
                  >
                    {balance > 0
                      ? `₱${balance.toLocaleString()}`
                      : "₱0.00"}
                  </Text>
                </View>

                {isFullyPaid && (
                  <View className="mt-3 pt-3 border-t border-dashed border-gray-200 flex-row items-center justify-center gap-1">
                    <Ionicons name="checkmark-circle" size={16} color="#16a34a" />
                    <Text className="text-green-700 font-semibold text-xs">
                      Paid in Full — no balance remaining
                    </Text>
                  </View>
                )}
              </View>

              {proofUrl ? (
                <View className="mb-4">
                  <Text className="text-gray-500 text-sm mb-2">
                    Payment Proof Screenshot
                  </Text>
                  <View className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-64">
                    <Image
                      source={{ uri: proofUrl }}
                      className="w-full h-full"
                      resizeMode="contain"
                    />
                  </View>
                </View>
              ) : (
                <View className="bg-gray-100 rounded-lg p-8 mb-4 items-center">
                  <Ionicons name="image-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-sm mt-2">
                    No payment proof uploaded
                  </Text>
                </View>
              )}

              <TouchableOpacity
                onPress={() => {
                  setShowPaymentProofModal(false);
                  setSelectedPaymentData(null);
                }}
                className="w-full py-3 bg-pink-500 rounded-xl"
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ✅ E-wallet QR code modal (shown from the walk-in page)
  const QrCodeModal = () => {
    const amountDue = parseFloat(selectedWalkIn?.services?.price?.toString() || "0") || 0;

    return (
      <Modal
        transparent={true}
        animationType="fade"
        visible={showQrModal}
        onRequestClose={() => setShowQrModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-sm">
            <View className="bg-pink-500 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Pay with E-Wallet</Text>
              <TouchableOpacity onPress={() => setShowQrModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="p-6 items-center">
              <Text className="text-gray-700 font-semibold text-base mb-3">
                Scan to Pay with GCash
              </Text>

              {isLoadingQr ? (
                <View className="bg-white rounded-xl p-3 border-2 border-green-200 w-56 h-56 items-center justify-center">
                  <ActivityIndicator size="large" color="#16a34a" />
                </View>
              ) : qrImageUrl ? (
                <View className="bg-white rounded-xl p-3 border-2 border-green-200">
                  <Image
                    source={{ uri: qrImageUrl }}
                    className="w-56 h-56"
                    resizeMode="contain"
                  />
                </View>
              ) : (
                <View className="bg-gray-100 rounded-xl p-6 w-56 h-56 items-center justify-center border-2 border-dashed border-gray-300">
                  <Ionicons name="qr-code-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-400 text-xs text-center mt-2">
                    QR code not available
                  </Text>
                  <TouchableOpacity onPress={fetchQrCode} className="mt-3">
                    <Text className="text-green-700 text-xs font-semibold">Tap to retry</Text>
                  </TouchableOpacity>
                </View>
              )}

              {amountDue > 0 && (
                <Text className="text-gray-500 text-sm mt-3 text-center">
                  Amount due:{" "}
                  <Text className="font-bold text-green-700">
                    ₱{amountDue.toLocaleString()}
                  </Text>
                </Text>
              )}

              {gcashNumber ? (
                <View className="mt-3 bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
                  <Text className="text-[10px] text-gray-500 text-center">GCash Number</Text>
                  <Text className="text-sm font-bold text-gray-800 tracking-wide text-center">
                    {gcashNumber}
                  </Text>
                </View>
              ) : null}

              <TouchableOpacity
                onPress={() => setShowQrModal(false)}
                className="w-full py-3 bg-pink-500 rounded-xl mt-5"
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────
  // Derived data
  // ─────────────────────────────────────────────
  const allItems = getDisplayItems();
  const grouped = getGroupedByDate(allItems);

  const todayCount =
    grouped.today.appointments.length + grouped.today.walkIns.length;
  const upcomingCount =
    grouped.upcoming.appointments.length + grouped.upcoming.walkIns.length;

  const todayStaff = getTodayStaff();

  // ─────────────────────────────────────────────
  // Load on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      await fetchPriceAdjustments();
      await Promise.all([
        fetchBusinessSchedules(),
        fetchStaffAssignments(),
        fetchStaff(),
        fetchServices(),
        fetchBillingInfo(),
        fetchStaffAppointments(),
        fetchWalkIns(),
        fetchWalkInTransactions(),
      ]);
    })();
  }, []);

  useEffect(() => {
    if (adjustmentMap.size > 0 && user?.id) {
      fetchStaffAppointments();
    }
  }, [adjustmentMap]);

  const renderUpdatePage = () => {
    if (!selectedAppointment) return null;

    const cachedBilling = billingMap.get(selectedAppointment.id);
    const appointmentIsDownpayment =
      cachedBilling?.payment_type === "downpayment";
    const remainingBalance = cachedBilling
      ? Math.max(0, cachedBilling.balance)
      : 0;
    const willSettleRemaining =
      updateFormData.status === "completed" &&
      selectedAppointment.status !== "completed" &&
      appointmentIsDownpayment &&
      remainingBalance > 0;

    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-pink-500 px-5 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={() => {
                setShowUpdatePage(false);
                setSelectedAppointment(null);
              }}
              className="p-1"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold">
              Update Appointment
            </Text>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          <View className="mb-4 p-4 bg-white rounded-2xl shadow-sm">
            <Text className="text-gray-500 text-sm">Customer</Text>
            <Text className="text-gray-800 font-bold text-lg">
              {selectedAppointment.customer_name}
            </Text>
            {selectedAppointment.customer_phone && (
              <Text className="text-gray-500 text-sm mt-0.5">
                {selectedAppointment.customer_phone}
              </Text>
            )}
            <View className="mt-3 pt-3 border-t border-gray-100">
              <Text className="text-gray-500 text-sm mb-1">Services</Text>
              <Text className="text-gray-800 font-semibold">
                {selectedAppointment.service_names?.join(" + ") || "No Service"}
              </Text>
              {selectedAppointment.services &&
                selectedAppointment.services.length > 1 && (
                  <View className="mt-2">
                    {selectedAppointment.services.map((service, index) => (
                      <View
                        key={index}
                        className="flex-row items-center mt-0.5 ml-2"
                      >
                        <View className="w-1 h-1 bg-pink-400 rounded-full mr-2" />
                        <Text className="text-gray-600 text-sm">
                          {service.service_name} ({service.duration_minutes} mins) - ₱
                          {parseFloat(service.price).toLocaleString()}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              {selectedAppointment.appointment_date && (
                <View className="flex-row items-center mt-2">
                  <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                  <Text className="text-gray-500 text-xs ml-1">
                    {formatDate(selectedAppointment.appointment_date)}
                    {selectedAppointment.appointment_time &&
                      ` • ${formatTime(selectedAppointment.appointment_time)}`}
                  </Text>
                </View>
              )}
              {selectedAppointment.total_duration > 0 && (
                <View className="flex-row items-center mt-1">
                  <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
                  <Text className="text-gray-500 text-xs ml-1">
                    Total: {selectedAppointment.total_duration} mins
                  </Text>
                </View>
              )}
            </View>
          </View>

          {selectedAppointment.services &&
            selectedAppointment.services.length > 0 && (
              <View className="bg-white rounded-2xl shadow-sm mb-4 p-1">
                {renderTransactionDetails(selectedAppointment.services)}
              </View>
            )}

          {cachedBilling && (
            <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
              <Text className="text-gray-700 font-semibold mb-2">
                Payment Information
              </Text>
              <View className="flex-row justify-between py-1">
                <Text className="text-gray-500 text-sm">Payment Type</Text>
                <Text className="text-gray-800 font-semibold text-sm">
                  {getPaymentTypeLabel(cachedBilling.payment_type)}
                </Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-gray-500 text-sm">Total</Text>
                <Text className="text-gray-800 font-semibold text-sm">
                  ₱{cachedBilling.total_amount.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-gray-500 text-sm">Paid</Text>
                <Text className="text-green-600 font-semibold text-sm">
                  ₱{cachedBilling.paid_amount.toLocaleString()}
                </Text>
              </View>
              <View className="flex-row justify-between py-1">
                <Text className="text-gray-500 text-sm">Balance</Text>
                <Text
                  className={`font-semibold text-sm ${
                    cachedBilling.balance > 0 ? "text-orange-600" : "text-green-600"
                  }`}
                >
                  ₱{cachedBilling.balance.toLocaleString()}
                </Text>
              </View>
            </View>
          )}

          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <StatusDropdown
              label="Appointment Status"
              value={updateFormData.status}
              onValueChange={(value) =>
                setUpdateFormData((prev) => ({ ...prev, status: value }))
              }
              options={["confirmed", "completed", "no-show"]}
              placeholder="Select appointment status..."
            />

            {willSettleRemaining && (
              <View className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="cash-outline" size={16} color="#2563eb" />
                  <View className="flex-1">
                    <Text className="text-blue-800 font-semibold text-xs">
                      Remaining balance will be settled
                    </Text>
                    <Text className="text-blue-700 text-[11px] mt-1">
                      Marking this as completed will update the billing:
                      paid will become ₱{cachedBilling?.total_amount.toLocaleString()},
                      balance ₱0, and payment type will flip to full.
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View>
              <Text className="text-gray-700 font-semibold mb-2">Notes</Text>
              <TextInput
                value={updateFormData.notes}
                onChangeText={(text) =>
                  setUpdateFormData((prev) => ({ ...prev, notes: text }))
                }
                placeholder="Add notes about this appointment..."
                multiline
                numberOfLines={3}
                textAlignVertical="top"
                className="border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[80px]"
              />
            </View>
          </View>

          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Product Usage</Text>
            <Text className="text-gray-500 text-sm mb-3">
              Update quantity used for each product
            </Text>

            {productUsages.length === 0 ? (
              <View className="bg-yellow-50 rounded-xl p-4">
                <Text className="text-yellow-600 text-sm text-center">
                  No products configured for these services
                </Text>
              </View>
            ) : (
              productUsages.map((product, index) => {
                const availableStock = product.current_quantity || 0;
                const isOutOfStock = availableStock <= 0;

                return (
                  <View
                    key={`${product.id}-${product.service_id || index}`}
                    className={`rounded-xl p-3 mb-3 border ${
                      isOutOfStock
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <View className="flex-row justify-between items-start">
                      <Text className="text-gray-800 font-semibold flex-1">
                        {product.product_name}
                      </Text>
                      {product.service_name && (
                        <View className="bg-pink-100 px-2 py-0.5 rounded-full ml-2">
                          <Text className="text-pink-600 text-[10px] font-medium">
                            {product.service_name}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text className="text-gray-500 text-xs mb-2">
                      Estimated Usage: {product.estimated_usage} per service
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-gray-600">Quantity Used:</Text>
                      <TextInput
                        value={product.quantity_change.toString()}
                        onChangeText={(value) =>
                          handleProductQuantityChange(index, value)
                        }
                        keyboardType="numeric"
                        className={`flex-1 border rounded-lg px-3 py-2 text-center ${
                          isOutOfStock ? "border-red-300 bg-white" : "border-gray-300"
                        }`}
                        placeholder="0"
                      />
                      <Text className="text-gray-600">units</Text>
                    </View>
                    {isOutOfStock ? (
                      <View className="flex-row items-center gap-1 mt-2 bg-red-100 rounded-lg p-2">
                        <Ionicons name="alert-circle" size={14} color="#dc2626" />
                        <Text className="text-red-700 text-xs font-semibold flex-1">
                          Out of stock! Available stock: 0 units
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-gray-400 text-xs mt-2">
                        Available Stock: {availableStock} units
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>

          <TouchableOpacity
            onPress={handleUpdateSubmit}
            disabled={isUpdating}
            className="bg-pink-500 py-4 rounded-xl mb-3"
          >
            <Text className="text-white text-center font-semibold text-base">
              {isUpdating ? "Updating..." : "Update Appointment"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              setShowUpdatePage(false);
              setSelectedAppointment(null);
            }}
            className="py-3 rounded-xl border border-gray-300 mb-6"
          >
            <Text className="text-gray-600 text-center font-semibold">Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  // ─────────────────────────────────────────────
  // ✅ Walk-in update page (replaces the old modal)
  // ─────────────────────────────────────────────
  const renderWalkInUpdatePage = () => {
    if (!selectedWalkIn) return null;

    const servicePrice = parseFloat(selectedWalkIn.services?.price?.toString() || "0") || 0;
    const stylistName = selectedWalkIn.user
      ? `${selectedWalkIn.user.first_name || ""} ${selectedWalkIn.user.last_name || ""}`.trim()
      : "Unknown Stylist";

    return (
      <View className="flex-1 bg-gray-50">
        <View className="bg-pink-500 px-5 pt-12 pb-4">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              onPress={closeWalkInUpdatePage}
              disabled={isUpdatingWalkIn}
              className="p-1"
            >
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-lg font-semibold">Update Walk-in</Text>
            <View style={{ width: 32 }} />
          </View>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
        >
          {/* Current details */}
          <View className="mb-4 p-4 bg-white rounded-2xl shadow-sm">
            <Text className="text-gray-500 text-sm">Current Walk-in Details</Text>
            <View className="flex-row justify-between items-center mt-2">
              <Text className="text-gray-600 text-sm">Customer:</Text>
              <Text className="text-gray-800 font-semibold">
                {selectedWalkIn.customer_name}
              </Text>
            </View>
            {/* ✅ Show whether this walk-in is linked to a customer account */}
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm">Account:</Text>
              {selectedWalkIn.customer_id ? (
                <View className="px-2 py-0.5 rounded-full bg-blue-100 flex-row items-center">
                  <Ionicons name="person-circle" size={12} color="#2563eb" />
                  <Text className="text-blue-700 text-xs font-semibold ml-1">
                    Linked
                  </Text>
                </View>
              ) : (
                <View className="px-2 py-0.5 rounded-full bg-gray-100">
                  <Text className="text-gray-500 text-xs font-semibold">
                    Guest (no account)
                  </Text>
                </View>
              )}
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm">Service:</Text>
              <Text className="text-gray-800 font-semibold">
                {selectedWalkIn.services?.service_name || "Unknown"}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm">Service Price:</Text>
              <Text className="text-pink-600 font-semibold">
                ₱{servicePrice.toLocaleString()}
              </Text>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm">Stylist:</Text>
              <Text className="text-gray-800 font-semibold">{stylistName}</Text>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm">Status:</Text>
              <View
                className={`px-2 py-0.5 rounded-full ${
                  selectedWalkIn.is_finished === 1 ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    selectedWalkIn.is_finished === 1
                      ? "text-green-700"
                      : "text-yellow-700"
                  }`}
                >
                  {selectedWalkIn.is_finished === 1 ? "FINISHED" : "PENDING"}
                </Text>
              </View>
            </View>
            <View className="flex-row justify-between items-center mt-1">
              <Text className="text-gray-600 text-sm">Amount Paid:</Text>
              <Text className="text-green-600 font-semibold">
                ₱{selectedWalkIn.amount_paid?.toLocaleString() || "0.00"}
              </Text>
            </View>
            {(selectedWalkIn.hair_length ||
              selectedWalkIn.hair_thickness ||
              selectedWalkIn.preferred_color) && (
              <View className="mt-2 pt-2 border-t border-gray-200">
                <Text className="text-gray-600 text-sm font-semibold">Hair Details</Text>
                {selectedWalkIn.hair_length && (
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-gray-500 text-sm">Hair Length:</Text>
                    <Text className="text-gray-700 text-sm capitalize">
                      {selectedWalkIn.hair_length}
                    </Text>
                  </View>
                )}
                {selectedWalkIn.hair_thickness && (
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-gray-500 text-sm">Hair Thickness:</Text>
                    <Text className="text-gray-700 text-sm capitalize">
                      {selectedWalkIn.hair_thickness}
                    </Text>
                  </View>
                )}
                {selectedWalkIn.preferred_color && (
                  <View className="flex-row justify-between items-center mt-1">
                    <Text className="text-gray-500 text-sm">Preferred Color:</Text>
                    <Text className="text-gray-700 text-sm">
                      {selectedWalkIn.preferred_color}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Customer name + payment */}
          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <View className="mb-4">
              <Text className="text-gray-700 font-semibold mb-2">Customer Name *</Text>
              <TextInput
                value={walkInUpdateData.customer_name}
                onChangeText={(text) =>
                  setWalkInUpdateData((prev) => ({
                    ...prev,
                    customer_name: text,
                  }))
                }
                placeholder="Enter customer name"
                className="border border-gray-300 rounded-lg px-4 py-3 text-gray-700"
              />
            </View>

            <View>
              <Text className="text-gray-700 font-semibold mb-2">Amount Paid *</Text>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                <Text className="text-gray-800 font-bold text-lg mr-2">₱</Text>
                <TextInput
                  value={walkInUpdateData.amount_paid.toString()}
                  onChangeText={(text) => {
                    const num = parseFloat(text) || 0;
                    setWalkInUpdateData((prev) => ({
                      ...prev,
                      amount_paid: num,
                    }));
                  }}
                  keyboardType="numeric"
                  className="flex-1 text-lg text-gray-800"
                  placeholder="0.00"
                />
              </View>
              {walkInUpdateData.amount_paid > 0 ? (
                <Text className="text-gray-400 text-xs mt-1">
                  Enter the amount paid by the customer
                </Text>
              ) : (
                <View className="flex-row items-center gap-1 mt-1">
                  <Ionicons name="alert-circle" size={12} color="#dc2626" />
                  <Text className="text-red-600 text-xs flex-1">
                    Enter the amount paid before you can complete this walk-in
                  </Text>
                </View>
              )}

              {/* ✅ Show the e-wallet QR code if the customer pays digitally */}
              <TouchableOpacity
                onPress={handleShowQrCode}
                className="flex-row items-center justify-center gap-2 py-3 mt-3 rounded-xl border border-blue-300 bg-blue-50"
              >
                <Ionicons name="qr-code-outline" size={20} color="#2563eb" />
                <Text className="text-blue-700 font-semibold">
                  Show QR Code (E-Wallet)
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Product usage */}
          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <Text className="text-gray-700 font-semibold mb-2">Product Usage</Text>
            <Text className="text-gray-500 text-sm mb-3">
              Update quantity used for each product
            </Text>

            {walkInProductUsages.length === 0 ? (
              <View className="bg-yellow-50 rounded-xl p-4">
                <Text className="text-yellow-600 text-sm text-center">
                  No products configured for this service
                </Text>
              </View>
            ) : (
              walkInProductUsages.map((product, index) => {
                const availableStock = product.current_quantity || 0;
                const isOutOfStock = availableStock <= 0;

                return (
                  <View
                    key={product.id}
                    className={`rounded-xl p-3 mb-3 border ${
                      isOutOfStock
                        ? "bg-red-50 border-red-200"
                        : "bg-gray-50 border-gray-100"
                    }`}
                  >
                    <Text className="text-gray-800 font-semibold">
                      {product.product_name}
                    </Text>
                    <Text className="text-gray-500 text-xs mb-2">
                      Estimated Usage: {product.estimated_usage} per service
                    </Text>
                    <View className="flex-row items-center gap-3">
                      <Text className="text-gray-600">Quantity Used:</Text>
                      <TextInput
                        value={product.quantity_change.toString()}
                        onChangeText={(value) =>
                          handleWalkInProductQuantityChange(index, value)
                        }
                        keyboardType="numeric"
                        className={`flex-1 border rounded-lg px-3 py-2 text-center ${
                          isOutOfStock ? "border-red-300 bg-white" : "border-gray-300"
                        }`}
                        placeholder="0"
                      />
                      <Text className="text-gray-600">units</Text>
                    </View>
                    {isOutOfStock ? (
                      <View className="flex-row items-center gap-1 mt-2 bg-red-100 rounded-lg p-2">
                        <Ionicons name="alert-circle" size={14} color="#dc2626" />
                        <Text className="text-red-700 text-xs font-semibold flex-1">
                          Out of stock! Available stock: 0 units
                        </Text>
                      </View>
                    ) : (
                      <Text className="text-gray-400 text-xs mt-2">
                        Available Stock: {availableStock} units
                      </Text>
                    )}
                  </View>
                );
              })
            )}
          </View>

          {/* Summary */}
          <View className="mb-4 p-4 bg-white rounded-2xl shadow-sm">
            <Text className="text-gray-600 text-sm font-semibold mb-1">
              Updated Summary
            </Text>
            <Text className="text-gray-600 text-sm">
              Customer: {walkInUpdateData.customer_name || "Not set"}
            </Text>
            <Text className="text-gray-600 text-sm">
              Amount Paid: ₱{walkInUpdateData.amount_paid.toLocaleString()}
            </Text>
            <Text className="text-gray-600 text-sm">Status: ✅ Will be marked as Completed</Text>
          </View>

          <View className="bg-green-50 border border-green-200 rounded-xl p-3 mb-4">
            <View className="flex-row items-start gap-2">
              <Ionicons name="checkmark-circle-outline" size={16} color="#16a34a" />
              <Text className="text-green-700 text-xs flex-1">
                Tapping "Update Walk-in" will automatically mark this walk-in as completed.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={handleWalkInUpdate}
            disabled={isUpdatingWalkIn}
            className={`py-4 rounded-xl mb-3 ${
              walkInUpdateData.amount_paid > 0 ? "bg-green-600" : "bg-gray-400"
            }`}
          >
            <Text className="text-white text-center font-semibold text-base">
              {isUpdatingWalkIn ? "Updating..." : "Update Walk-in"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={closeWalkInUpdatePage}
            disabled={isUpdatingWalkIn}
            className="py-3 rounded-xl border border-gray-300 mb-6"
          >
            <Text className="text-gray-600 text-center font-semibold">Cancel</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Called as a function (not <Component />) so it isn't remounted on every render */}
        {QrCodeModal()}
      </View>
    );
  };

  return (
    <>
      {showUpdatePage ? (
        renderUpdatePage()
      ) : showWalkInUpdatePage ? (
        renderWalkInUpdatePage()
      ) : (
        <>
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={["#ec4899"]}
              />
            }
          >
            <View className="px-5 pt-6">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-3xl font-bold text-gray-800">
                  My Appointments
                </Text>
              </View>
              <Text className="text-gray-500 mb-4">
                Your upcoming appointments &amp; walk-ins
              </Text>

              {renderDateSection(
                "Today",
                todayCount,
                grouped.today.appointments,
                grouped.today.walkIns,
                "bg-pink-100",
                "text-pink-600"
              )}

              {renderDateSection(
                "Upcoming",
                upcomingCount,
                grouped.upcoming.appointments,
                grouped.upcoming.walkIns,
                "bg-blue-100",
                "text-blue-600"
              )}

              {todayCount + upcomingCount === 0 && (
                <View className="bg-white rounded-2xl p-12 items-center mt-4">
                  <Ionicons name="calendar-outline" size={60} color="#d1d5db" />
                  <Text className="text-gray-400 mt-4 text-center">
                    No upcoming appointments or walk-ins
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          <PaymentProofModal />
        </>
      )}
    </>
  );
}