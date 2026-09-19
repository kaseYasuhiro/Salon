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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/auth-context";
import api from "@/api/axios";

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
  billing?: {
    id: number;
    appointment_id: number;
    total_amount: string;
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
  // ✅ NEW: page navigation state — when set, we render the UpdateAppointmentPage instead of the list
  const [showUpdatePage, setShowUpdatePage] = useState(false);

  const [showWalkInUpdateModal, setShowWalkInUpdateModal] = useState(false);
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

  // Walk-in update form state
  const [walkInUpdateData, setWalkInUpdateData] = useState({
    customer_name: "",
    amount_paid: 0,
    is_finished: 0,
  });

  // Walk-in product usage state
  const [walkInProductUsages, setWalkInProductUsages] = useState<ProductUsage[]>([]);

  // Local state for data
  const [staffAppointments, setStaffAppointments] = useState<Appointment[]>([]);
  const [staff, setStaff] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [walkInTransactions, setWalkInTransactions] = useState<any[]>([]);

  const { user } = useAuth();

  // States for business schedules and staff assignments
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);

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
        appointment.services.push({
          id: item.transaction_id || item.id,
          service_id: item.service_id,
          service_name: item.service_name || "Unknown Service",
          duration_minutes: item.duration_minutes || 0,
          price: item.price || "0",
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
        .filter((app) => app.status === "confirmed" || app.status === "completed");

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

  const updateWalkIn = async (id: number, data: any) => {
    try {
      const response = await api.post(`/walk-in/update/${id}`, {
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

      if (response.data) {
        let paymentData = null;

        if (Array.isArray(response.data)) {
          const remainingPayment = response.data.find(
            (item: any) =>
              item.billing?.payment_type === "remaining" &&
              item.billing?.appointment_id === appointmentId
          );

          if (remainingPayment) {
            paymentData = remainingPayment;
          } else {
            const anyPayment = response.data.find(
              (item: any) => item.billing?.appointment_id === appointmentId
            );
            paymentData = anyPayment;
          }
        } else if (response.data.billing) {
          if (response.data.billing?.appointment_id === appointmentId) {
            paymentData = response.data;
          }
        } else if (response.data.appointment_id === appointmentId) {
          paymentData = response.data;
        }

        if (paymentData) {
          setSelectedPaymentData(paymentData);
          setShowPaymentProofModal(true);
        } else {
          Alert.alert(
            "No Payment Found",
            "No remaining balance payment found for this appointment."
          );
        }
      } else {
        Alert.alert("No Payment Found", "No payment record found for this appointment.");
      }
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

  // ✅ Opens the walk-in update MODAL (unchanged)
  // ✅ Opens the appointment update PAGE instead of a modal
  const handleOpenUpdateModal = async (item: DisplayItem) => {
    if (item.is_walk_in && item.walk_in_data) {
      setSelectedWalkIn(item.walk_in_data);
      setWalkInUpdateData({
        customer_name: item.customer_name,
        amount_paid: item.walk_in_data.amount_paid || 0,
        is_finished: item.walk_in_data.is_finished,
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

      setShowWalkInUpdateModal(true);
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

    // ✅ Show the update page instead of a modal
    setShowUpdatePage(true);
  };

  const handleProductQuantityChange = (index: number, value: string) => {
    const updatedUsages = [...productUsages];
    const numericValue = parseInt(value) || 0;
    updatedUsages[index].quantity_change = numericValue;
    setProductUsages(updatedUsages);

    // ✅ Alert when the product has run out of available stock
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

    // ✅ Alert when the product has run out of available stock (walk-in)
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

  const handleUpdateSubmit = async () => {
    if (!selectedAppointment) return;

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

      await updateAppointmentServices(selectedAppointment.id, updateData);

      Alert.alert("Success", "Appointment updated successfully!");
      // ✅ Close the page instead of the modal
      setShowUpdatePage(false);
      setSelectedAppointment(null);
      await fetchStaffAppointments();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update appointment");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleWalkInUpdate = async () => {
    if (!selectedWalkIn) return;

    if (!walkInUpdateData.customer_name.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
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
        customer_name: walkInUpdateData.customer_name.trim(),
        service_id: selectedWalkIn.service_id,
        stylist_id: selectedWalkIn.stylist_id,
        amount_paid: walkInUpdateData.amount_paid,
        is_finished: walkInUpdateData.is_finished,
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

      Alert.alert("Success", "Walk-in customer updated successfully!");
      setShowWalkInUpdateModal(false);
      setSelectedWalkIn(null);
      setWalkInProductUsages([]);
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
  // Group by date AND split appointments vs walk-ins
  // ─────────────────────────────────────────────
  const getGroupedByDate = (items: DisplayItem[]) => {
    const today = getUTCDateString(new Date());

    const sortAsc = (a: DisplayItem, b: DisplayItem) => {
      const aKey = `${a.appointment_date || ""} ${a.appointment_time || ""}`;
      const bKey = `${b.appointment_date || ""} ${b.appointment_time || ""}`;
      return aKey.localeCompare(bKey);
    };
    const sortDesc = (a: DisplayItem, b: DisplayItem) => {
      const aKey = `${a.appointment_date || ""} ${a.appointment_time || ""}`;
      const bKey = `${b.appointment_date || ""} ${b.appointment_time || ""}`;
      return bKey.localeCompare(aKey);
    };

    const buckets = {
      today: { appointments: [] as DisplayItem[], walkIns: [] as DisplayItem[] },
      upcoming: { appointments: [] as DisplayItem[], walkIns: [] as DisplayItem[] },
      past: { appointments: [] as DisplayItem[], walkIns: [] as DisplayItem[] },
    };

    items.forEach((item) => {
      const dateToCheck =
        item.appointment_date ||
        item.walk_in_data?.created_at?.split("T")[0] ||
        item.created_at?.split("T")[0];

      let bucket: "today" | "upcoming" | "past";
      if (!dateToCheck) bucket = "past";
      else if (dateToCheck === today) bucket = "today";
      else if (dateToCheck > today) bucket = "upcoming";
      else bucket = "past";

      const target = item.is_walk_in
        ? buckets[bucket].walkIns
        : buckets[bucket].appointments;
      target.push(item);
    });

    buckets.today.appointments.sort(sortAsc);
    buckets.today.walkIns.sort(sortAsc);
    buckets.upcoming.appointments.sort(sortAsc);
    buckets.upcoming.walkIns.sort(sortAsc);
    buckets.past.appointments.sort(sortDesc);
    buckets.past.walkIns.sort(sortDesc);

    return buckets;
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
              <Text className="text-gray-800 font-semibold text-sm">
                {service.service_name}
              </Text>
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
    const isWalkIn = item.is_walk_in;
    const isMultipleServices = item.services && item.services.length > 1;
    const svcs = item.services || [];

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
          </View>

          <View
            className={`px-3 py-1.5 rounded-full ${
              item.status === "completed"
                ? "bg-green-100"
                : item.status === "confirmed"
                ? "bg-blue-100"
                : "bg-pink-100"
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                item.status === "confirmed"
                  ? "text-blue-700"
                  : item.status === "completed"
                  ? "text-green-700"
                  : "text-pink-700"
              }`}
            >
              {item.status === "confirmed"
                ? "CONFIRMED"
                : item.status === "completed"
                ? "COMPLETED"
                : item.status?.toUpperCase() || "PENDING"}
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

            {!isCompleted && (
              <TouchableOpacity
                className="bg-blue-600 px-5 py-2 rounded-xl"
                onPress={() => handleOpenUpdateModal(item)}
              >
                <Text className="text-white font-semibold text-sm">Update</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Subsection header (Appointments / Walk-ins inside a date group)
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

  // Date section wrapper
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

  // ─────────────────────────────────────────────
  // Status dropdown component (kept inside component)
  // ─────────────────────────────────────────────
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
          return "bg-green-100 text-green-700";
        case "pending":
          return "bg-yellow-100 text-yellow-700";
        case "completed":
          return "bg-blue-100 text-blue-700";
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

  // Payment Proof Modal Component
  const PaymentProofModal = () => {
    if (!selectedPaymentData) return null;

    const { payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || "N/A";
    const total_amount = billing?.total_amount || "0.00";
    const payment_type = billing?.payment_type || "N/A";

    const proofUrl = payment_proof
      ? `http://192.168.100.73:8000${payment_proof}`
      : null;

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

            <View className="p-6">
              <View className="bg-gray-50 rounded-lg p-4 mb-4">
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Appointment ID</Text>
                  <Text className="text-gray-800 font-semibold">#{appointment_id}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Payment Type</Text>
                  <Text className="text-gray-800 font-semibold capitalize">
                    {payment_type}
                  </Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Total Amount</Text>
                  <Text className="text-pink-600 font-bold">
                    ₱{parseFloat(total_amount).toLocaleString()}
                  </Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-sm">Payment Method</Text>
                  <Text className="text-gray-800 font-semibold">
                    {payment_method || "N/A"}
                  </Text>
                </View>
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
  const pastCount = grouped.past.appointments.length + grouped.past.walkIns.length;

  const todayStaff = getTodayStaff();

  // ─────────────────────────────────────────────
  // Load on mount
  // ─────────────────────────────────────────────
  useEffect(() => {
    fetchBusinessSchedules();
    fetchStaffAssignments();
    fetchStaff();
    fetchServices();
    fetchStaffAppointments();
    fetchWalkIns();
    fetchWalkInTransactions();
  }, []);

  // ─────────────────────────────────────────────
  // ✅ Update Appointment PAGE (replaces the old modal)
  // ─────────────────────────────────────────────
  const renderUpdatePage = () => {
    if (!selectedAppointment) return null;

    return (
      <View className="flex-1 bg-gray-50">
        {/* Fixed header with back button */}
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

        {/* Scrollable body */}
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

          <View className="bg-white rounded-2xl shadow-sm p-4 mb-4">
            <StatusDropdown
              label="Appointment Status"
              value={updateFormData.status}
              onValueChange={(value) =>
                setUpdateFormData((prev) => ({ ...prev, status: value }))
              }
              options={["confirmed", "completed"]}
              placeholder="Select appointment status..."
            />

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
  // Render
  // ─────────────────────────────────────────────
  return (
    <>
      {/* ✅ If the update page is open, render it instead of the list */}
      {showUpdatePage ? (
        renderUpdatePage()
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
                All your assigned appointments &amp; walk-ins
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

              {renderDateSection(
                "Past",
                pastCount,
                grouped.past.appointments,
                grouped.past.walkIns,
                "bg-gray-200",
                "text-gray-600"
              )}

              {allItems.length === 0 && (
                <View className="bg-white rounded-2xl p-12 items-center mt-4">
                  <Ionicons name="calendar-outline" size={60} color="#d1d5db" />
                  <Text className="text-gray-400 mt-4 text-center">
                    No appointments or walk-ins yet
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {/* Walk-in Update Modal (unchanged) */}
          <Modal
            animationType="slide"
            transparent={true}
            visible={showWalkInUpdateModal}
            onRequestClose={() => setShowWalkInUpdateModal(false)}
          >
            <View className="flex-1 justify-center items-center bg-black/50">
              <View className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90%] overflow-hidden">
                <View className="bg-green-600 px-6 py-4 flex-row justify-between items-center">
                  <Text className="text-xl font-bold text-white">
                    Update Walk-in
                  </Text>
                  <TouchableOpacity onPress={() => setShowWalkInUpdateModal(false)}>
                    <Ionicons name="close" size={24} color="white" />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  className="p-6"
                  showsVerticalScrollIndicator={true}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: 24 }}
                >
                  <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <Text className="text-gray-500 text-sm">
                      Current Walk-in Details
                    </Text>
                    <View className="flex-row justify-between items-center mt-2">
                      <Text className="text-gray-600 text-sm">Customer:</Text>
                      <Text className="text-gray-800 font-semibold">
                        {selectedWalkIn?.customer_name}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-gray-600 text-sm">Service:</Text>
                      <Text className="text-gray-800 font-semibold">
                        {selectedWalkIn?.services?.service_name || "Unknown"}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-gray-600 text-sm">Stylist:</Text>
                      <Text className="text-gray-800 font-semibold">
                        {selectedWalkIn?.user?.first_name}{" "}
                        {selectedWalkIn?.user?.last_name}
                      </Text>
                    </View>
                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-gray-600 text-sm">Status:</Text>
                      <View
                        className={`px-2 py-0.5 rounded-full ${
                          selectedWalkIn?.is_finished === 1
                            ? "bg-green-100"
                            : "bg-yellow-100"
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            selectedWalkIn?.is_finished === 1
                              ? "text-green-700"
                              : "text-yellow-700"
                          }`}
                        >
                          {selectedWalkIn?.is_finished === 1 ? "FINISHED" : "PENDING"}
                        </Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between items-center mt-1">
                      <Text className="text-gray-600 text-sm">Amount Paid:</Text>
                      <Text className="text-green-600 font-semibold">
                        ₱{selectedWalkIn?.amount_paid?.toLocaleString() || "0.00"}
                      </Text>
                    </View>
                    {(selectedWalkIn?.hair_length ||
                      selectedWalkIn?.hair_thickness ||
                      selectedWalkIn?.preferred_color) && (
                      <View className="mt-2 pt-2 border-t border-gray-200">
                        <Text className="text-gray-600 text-sm font-semibold">
                          Hair Details
                        </Text>
                        {selectedWalkIn?.hair_length && (
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-gray-500 text-sm">Hair Length:</Text>
                            <Text className="text-gray-700 text-sm capitalize">
                              {selectedWalkIn.hair_length}
                            </Text>
                          </View>
                        )}
                        {selectedWalkIn?.hair_thickness && (
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-gray-500 text-sm">
                              Hair Thickness:
                            </Text>
                            <Text className="text-gray-700 text-sm capitalize">
                              {selectedWalkIn.hair_thickness}
                            </Text>
                          </View>
                        )}
                        {selectedWalkIn?.preferred_color && (
                          <View className="flex-row justify-between items-center mt-1">
                            <Text className="text-gray-500 text-sm">
                              Preferred Color:
                            </Text>
                            <Text className="text-gray-700 text-sm">
                              {selectedWalkIn.preferred_color}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Customer Name *
                    </Text>
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

                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Amount Paid *
                    </Text>
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
                    <Text className="text-gray-400 text-xs mt-1">
                      Enter the amount paid by the customer
                    </Text>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">Status</Text>
                    <View className="flex-row gap-3">
                      <TouchableOpacity
                        onPress={() =>
                          setWalkInUpdateData((prev) => ({
                            ...prev,
                            is_finished: 0,
                          }))
                        }
                        className={`flex-1 py-3 rounded-xl ${
                          walkInUpdateData.is_finished === 0
                            ? "bg-yellow-500"
                            : "bg-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            walkInUpdateData.is_finished === 0
                              ? "text-white"
                              : "text-gray-700"
                          }`}
                        >
                          Pending
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() =>
                          setWalkInUpdateData((prev) => ({
                            ...prev,
                            is_finished: 1,
                          }))
                        }
                        className={`flex-1 py-3 rounded-xl ${
                          walkInUpdateData.is_finished === 1
                            ? "bg-green-500"
                            : "bg-gray-200"
                        }`}
                      >
                        <Text
                          className={`text-center font-semibold ${
                            walkInUpdateData.is_finished === 1
                              ? "text-white"
                              : "text-gray-700"
                          }`}
                        >
                          Finished
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="mb-4">
                    <Text className="text-gray-700 font-semibold mb-2">
                      Product Usage
                    </Text>
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
                                  isOutOfStock
                                    ? "border-red-300 bg-white"
                                    : "border-gray-300"
                                }`}
                                placeholder="0"
                              />
                              <Text className="text-gray-600">units</Text>
                            </View>
                            {isOutOfStock ? (
                              <View className="flex-row items-center gap-1 mt-2 bg-red-100 rounded-lg p-2">
                                <Ionicons
                                  name="alert-circle"
                                  size={14}
                                  color="#dc2626"
                                />
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

                  <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                    <Text className="text-gray-600 text-sm font-semibold mb-1">
                      Updated Summary
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      Customer: {walkInUpdateData.customer_name || "Not set"}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      Amount Paid: ₱{walkInUpdateData.amount_paid.toLocaleString()}
                    </Text>
                    <Text className="text-gray-600 text-sm">
                      Status:{" "}
                      {walkInUpdateData.is_finished === 1
                        ? "✅ Finished"
                        : "⏳ Pending"}
                    </Text>
                  </View>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => setShowWalkInUpdateModal(false)}
                      className="flex-1 py-3 rounded-xl border border-gray-300"
                    >
                      <Text className="text-gray-600 text-center font-semibold">
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={handleWalkInUpdate}
                      disabled={isUpdatingWalkIn}
                      className="flex-1 py-3 rounded-xl bg-green-600"
                    >
                      <Text className="text-white text-center font-semibold">
                        {isUpdatingWalkIn ? "Updating..." : "Update Walk-in"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
              </View>
            </View>
          </Modal>

          <PaymentProofModal />
        </>
      )}
    </>
  );
}