import React, { useState, useEffect, useCallback, useRef } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image, TextInput, SafeAreaView } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

// ─────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────
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
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    profile_image?: string;
    staff_specialties?: Array<{
      id: number;
      staff_id: number;
      specialty_id: number;
      is_active: number;
      specialties?: {
        id: number;
        specialty_name: string;
      };
    }>;
  };
  business_schedules?: BusinessSchedule;
}

interface WalkInAuthorization {
  staff_id: number;
  isAuthorizedForWalkin?: number;
  isAuthorizedForWalkIn?: number;
}

interface Service {
  id: number;
  service_name: string;
  description: string;
  price: number;
  duration_minutes: number;
  service_status?: string;
  is_multitaskable: number;
  service_specialties?: any[];
  created_at?: string;
  updated_at?: string;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  active_status?: number;
  profile_image?: string;
  user?: {
    active_status?: number;
    profile_image?: string;
  };
  staff_specialties: Array<{
    id: number;
    staff_id: number;
    specialty_id: number;
    is_active: number;
    specialties?: {
      id: number;
      specialty_name: string;
    };
  }>;
}

interface StaffFeedback {
  id: number;
  staff_id: number;
  rating: number;
}

interface CustomerAccount {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
}

// A row from the walk_ins table (GET /walk-in)
interface WalkInRecord {
  id: number;
  customer_id: number | null; // null when the customer has no account
  customer_name: string;
  service_id: number;
  stylist_id: number;
  is_finished: number | boolean;
  amount_paid?: number | string | null;
  walkin_payment_method?: string | null;
  created_at?: string;
}

// A walk-in customer without an account who has at least one completed walk-in
interface SavedWalkInGuest {
  key: string; // normalized name, used for de-duplication
  name: string;
  visitCount: number;
  lastServiceName: string | null;
}

interface StaffAppointment {
  id: number;
  appointment_id: number;
  service_id: number;
  customer_name: string;
  customer_phone: string;
  customer_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_status: string;
  assigned_employee_id?: number | null;
  service_name: string;
  duration_minutes: number;
  price: string;
  created_at: string;
  updated_at: string;
  staff_name?: string;
  notes?: string;
  billing_total_amount?: number | null;
  billing_paid_amount?: number | null;
  billing_balance?: number | null;
  billing_payment_type?: string | null;
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

/**
 * Selected services are split into "groups". Each group gets its own stylist.
 * - Multitaskable services of the same specialty share ONE group.
 * - A non-multitaskable service always gets its OWN group, even if other selected
 *   services share its specialty (so it can have a different stylist).
 */
interface ServiceGroup {
  key: string; // unique group id (a solo group looks like "stylist::solo-12")
  specialtyKey: string; // the real specialty ("stylist", "barber", ...)
  label: string;
  services: Service[];
}

interface StaffWalkInProps {
  onSuccess?: () => void;
}

type MainTab = 'landing' | 'appointments' | 'walk-ins';

type BookingStep = 'customer' | 'services' | 'stylist' | 'confirm';

const DEFAULT_GROUP_KEY = 'stylist';

// "  Juan   Dela Cruz " and "juan dela cruz" are treated as the same guest
const normalizeGuestName = (name: string | null | undefined): string =>
  (name || '').trim().replace(/\s+/g, ' ').toLowerCase();

export default function StaffWalkIn({ onSuccess }: StaffWalkInProps) {
  const [mainTab, setMainTab] = useState<MainTab>('landing');

  // Booking state
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [isWalkInGuest, setIsWalkInGuest] = useState(false);
  const [customerName, setCustomerName] = useState('');

  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [groupStaff, setGroupStaff] = useState<Record<string, number>>({});
  const [bookingStep, setBookingStep] = useState<BookingStep>('customer');
  const [isProcessing, setIsProcessing] = useState(false);

  const submittedServicesRef = useRef<Set<number>>(new Set());

  const [customerList, setCustomerList] = useState<CustomerAccount[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(false);

  // Past walk-ins (used to remember guests who don't have an account)
  const [walkInRecords, setWalkInRecords] = useState<WalkInRecord[]>([]);
  const [isLoadingWalkIns, setIsLoadingWalkIns] = useState(false);

  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  const [staffAppointments, setStaffAppointments] = useState<StaffAppointment[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<StaffAppointment | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showPaymentProofModal, setShowPaymentProofModal] = useState(false);
  const [selectedPaymentData, setSelectedPaymentData] = useState<PaymentData | null>(null);
  const [isUpdatingAppointment, setIsUpdatingAppointment] = useState(false);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSpecialties, setServiceSpecialties] = useState<any[]>([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState<StaffFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { user } = useAuth();

  const [localBusinessSchedules, setLocalBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [localStaffAssignments, setLocalStaffAssignments] = useState<StaffAssignment[]>([]);

  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');
  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage/')) return `${BASE_URL}${imagePath}`;
    return `${BASE_URL}/storage/${imagePath}`;
  };

  const isStaffActive = (staffMember: StaffMember | undefined | null): boolean => {
    if (!staffMember) return false;
    const raw =
      staffMember.active_status != null
        ? staffMember.active_status
        : staffMember.user?.active_status;
    if (raw == null) return true;
    return Number(raw) === 1;
  };

  // ─────────────────────────────────────────────────────────────
  // Data fetchers
  // ─────────────────────────────────────────────────────────────
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) staffData = response.data;
      if (isMountedRef.current) setStaff(staffData);
      return staffData;
    } catch { return []; }
  };

  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      let servicesData: Service[] = [];
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
      if (isMountedRef.current) setServices(servicesData);
      return servicesData;
    } catch { return []; }
  };

  const fetchServiceSpecialties = async () => {
    try {
      const response = await api.get("/services/specialties");
      let specialtiesData: any[] = [];
      if (Array.isArray(response.data)) specialtiesData = response.data;
      if (isMountedRef.current) setServiceSpecialties(specialtiesData);
      return specialtiesData;
    } catch { return []; }
  };

  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get("/feedbacks/staff");
      let staffFeedbacksData: StaffFeedback[] = [];
      if (Array.isArray(response.data)) {
        staffFeedbacksData = response.data.map((item: any) => ({
          id: item.id || 0,
          staff_id: item.staff_id || 0,
          rating: parseFloat(item.rating) || 0
        }));
      }
      if (isMountedRef.current) setStaffFeedbacks(staffFeedbacksData);
      return staffFeedbacksData;
    } catch { return []; }
  };

  const fetchCustomers = async () => {
    if (isMountedRef.current) setIsLoadingCustomers(true);
    try {
      const response = await api.get('/customer/accounts');
      if (Array.isArray(response.data) && isMountedRef.current) {
        setCustomerList(response.data);
      }
    } catch (error) {
      console.log('Failed to fetch customers', error);
    } finally {
      if (isMountedRef.current) setIsLoadingCustomers(false);
    }
  };

  // All walk-in sessions. Used to build the list of returning guests without an account.
  const fetchWalkIns = async () => {
    if (isMountedRef.current) setIsLoadingWalkIns(true);
    try {
      const response = await api.get('/walk-in');

      let rawData: any[] = [];
      if (Array.isArray(response.data)) {
        rawData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        rawData = response.data.data;
      }

      const records: WalkInRecord[] = rawData.map((item: any) => ({
        id: item.id,
        customer_id: item.customer_id ?? null,
        customer_name: (item.customer_name ?? '').toString(),
        service_id: item.service_id,
        stylist_id: item.stylist_id,
        is_finished: item.is_finished,
        amount_paid: item.amount_paid ?? null,
        walkin_payment_method: item.walkin_payment_method ?? null,
        created_at: item.created_at,
      }));

      if (isMountedRef.current) setWalkInRecords(records);
      return records;
    } catch (error) {
      console.log('[fetchWalkIns] error:', error);
      return [];
    } finally {
      if (isMountedRef.current) setIsLoadingWalkIns(false);
    }
  };

  const fetchAllAppointments = async () => {
    if (isMountedRef.current) setIsLoadingAppointments(true);
    try {
      const response = await api.get('/all-appointments');

      let rawData: any[] = [];
      if (Array.isArray(response.data)) {
        rawData = response.data;
      } else if (response.data && Array.isArray(response.data.data)) {
        rawData = response.data.data;
      }

      const appointmentMap = new Map<number, StaffAppointment>();

      rawData.forEach((item: any) => {
        const appointmentId = item.appointment_id ?? item.id;

        if (!appointmentMap.has(appointmentId)) {
          appointmentMap.set(appointmentId, {
            id: item.id,
            appointment_id: appointmentId,
            service_id: item.service_id,
            customer_name: item.customer_name || 'Walk-in Customer',
            customer_phone: item.customer_phone || 'N/A',
            customer_email: item.customer_email || 'N/A',
            appointment_date: item.appointment_date,
            appointment_time: item.appointment_time || '--:--',
            status: item.status || 'pending',
            service_status: item.service_status || 'pending',
            assigned_employee_id: item.assigned_employee_id ?? null,
            service_name: item.service_name || 'Unknown Service',
            duration_minutes: item.duration_minutes || 0,
            price: item.price?.toString() || '0',
            created_at: item.created_at,
            updated_at: item.updated_at,
            notes: item.notes,
            billing_total_amount: item.billing_total_amount ?? null,
            billing_paid_amount: item.billing_paid_amount ?? null,
            billing_balance: item.billing_balance ?? null,
            billing_payment_type: item.billing_payment_type ?? null,
          });
        } else {
          const existing = appointmentMap.get(appointmentId)!;
          existing.service_name = `${existing.service_name} + ${item.service_name || 'Unknown Service'}`;
          existing.duration_minutes += item.duration_minutes || 0;
          existing.price = (
            parseFloat(existing.price) + parseFloat(item.price?.toString() || '0')
          ).toString();
        }
      });

      const appointmentsData = Array.from(appointmentMap.values());

      appointmentsData.sort((a, b) => {
        const da = new Date(`${a.appointment_date} ${a.appointment_time}`).getTime();
        const db = new Date(`${b.appointment_date} ${b.appointment_time}`).getTime();
        return db - da;
      });

      if (isMountedRef.current) setStaffAppointments(appointmentsData);
      return appointmentsData;
    } catch (error) {
      console.log('[fetchAllAppointments] error:', error);
      return [];
    } finally {
      if (isMountedRef.current) setIsLoadingAppointments(false);
    }
  };

  const fetchPaymentProof = async (appointmentId: number) => {
    try {
      const response = await api.get(`/appointment/payment?appointment_id=${appointmentId}`);

      if (!response.data) {
        Alert.alert('No Payment Found', 'No payment record found for this appointment.');
        return;
      }

      let paymentData = null;

      if (Array.isArray(response.data)) {
        const match = response.data.find((item: any) => {
          const itemAppointmentId = item.billing?.appointment_id || item.appointment_id;
          return itemAppointmentId === appointmentId;
        });
        if (match) paymentData = match;
      } else if (response.data.billing || response.data.appointment_id) {
        const itemAppointmentId = response.data.billing?.appointment_id || response.data.appointment_id;
        if (itemAppointmentId === appointmentId) paymentData = response.data;
      }

      if (paymentData) {
        const actualAppointmentId = paymentData.billing?.appointment_id || paymentData.appointment_id;
        if (actualAppointmentId && actualAppointmentId !== appointmentId) {
          Alert.alert('Data Mismatch', 'Payment data does not match this appointment.');
          return;
        }
        if (paymentData.payment_proof) {
          if (isMountedRef.current) {
            setSelectedPaymentData(paymentData);
            setShowPaymentProofModal(true);
          }
        } else {
          Alert.alert('No Payment Proof', 'No payment proof uploaded yet.');
        }
      } else {
        Alert.alert('No Payment Found', `No payment record found for appointment #${appointmentId}.`);
      }
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to fetch payment data');
    }
  };

  const updateAppointmentStatus = async (appointment: StaffAppointment, newStatus: string) => {
    setIsUpdatingAppointment(true);
    try {
      const appointmentId = appointment.appointment_id || appointment.id;
      await api.put(`/appointments/update/${appointmentId}`, { status: newStatus });
      Alert.alert('Success', newStatus === 'confirmed' ? 'Appointment confirmed!' : 'Appointment cancelled.');
      if (isMountedRef.current) {
        setShowAppointmentModal(false);
        setSelectedAppointment(null);
      }
      await fetchAllAppointments();
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to update appointment');
    } finally {
      if (isMountedRef.current) setIsUpdatingAppointment(false);
    }
  };

  const submitWalkIn = async (data: {
    customer_id: number | null;
    customer_name: string;
    service_id: number;
    stylist_id: number;
    is_finished: number;
  }) => {
    const response = await api.post('/walk-in/add', {
      customer_id: data.customer_id,
      customer_name: data.customer_name,
      service_id: data.service_id,
      stylist_id: data.stylist_id,
      is_finished: data.is_finished !== undefined ? data.is_finished : 0,
    });
    return response.data;
  };

  const checkWalkInAuthorization = async () => {
    setIsCheckingAuth(true);
    try {
      const response = await api.get('/walk-in/staff');
      if (Array.isArray(response.data)) {
        const currentStaffId = user?.id;
        const authData = response.data.find((auth: WalkInAuthorization) => auth.staff_id === currentStaffId);
        const isAuthorizedWalkIn = authData?.isAuthorizedForWalkin === 1 || authData?.isAuthorizedForWalkIn === 1;
        if (isMountedRef.current) setIsAuthorized(isAuthorizedWalkIn);
      } else {
        if (isMountedRef.current) setIsAuthorized(false);
      }
    } catch {
      if (isMountedRef.current) setIsAuthorized(false);
    } finally {
      if (isMountedRef.current) {
        setIsCheckingAuth(false);
        setHasCheckedAuth(true);
      }
    }
  };

  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data) && isMountedRef.current) setLocalBusinessSchedules(response.data);
    } catch {}
  };

  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      if (Array.isArray(response.data) && isMountedRef.current) setLocalStaffAssignments(response.data);
    } catch {}
  };

  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const getTodayStaff = useCallback(() => {
    const todayStr = getUTCDateString(new Date());
    const schedule = localBusinessSchedules.find(s => s.business_date === todayStr);
    if (!schedule) return [];
    const assignments = localStaffAssignments.filter(a => a.business_date_id === schedule.id);
    const staffIds = assignments.map(a => a.staff_id);
    return staff.filter(s => staffIds.includes(s.id));
  }, [localBusinessSchedules, localStaffAssignments, staff]);

  // ─────────────────────────────────────────────────────────────
  // Specialty / service grouping
  // ─────────────────────────────────────────────────────────────
  const getServiceSpecialties = (serviceId: number) => {
    return serviceSpecialties.filter(item => item.service_id === serviceId);
  };

  const normalizeSpecialty = (value: string | null | undefined): string =>
    (value || '').trim().toLowerCase();

  const SPECIALTY_ALIASES: Record<string, string> = {
    'stylist': 'stylist',
    'hair stylist': 'stylist',
    'hairstylist': 'stylist',
    'senior stylist': 'stylist',
    'junior stylist': 'stylist',
  };

  const resolveSpecialtyKey = (value: string | null | undefined): string => {
    const normalized = normalizeSpecialty(value);
    return SPECIALTY_ALIASES[normalized] || normalized;
  };

  const getServiceGroupInfo = (serviceId: number): { key: string; label: string } => {
    const names: string[] = getServiceSpecialties(serviceId)
      .map((ss: any) => ss?.specialties?.specialty_name)
      .filter(Boolean);
    const first = names[0];
    if (!first) return { key: DEFAULT_GROUP_KEY, label: 'Stylist' };
    const key = resolveSpecialtyKey(first);
    return { key, label: key === 'stylist' ? 'Stylist' : first.trim() };
  };

  const getEligibleStaffForGroup = (groupKey: string): StaffMember[] => {
    return getTodayStaff().filter((member) => {
      if (!isStaffActive(member)) return false;
      const keys = (member.staff_specialties || [])
        .filter(s => s.is_active === 1)
        .map(s => resolveSpecialtyKey(s.specialties?.specialty_name))
        .filter(Boolean);

      if (keys.includes(groupKey)) return true;
      if (keys.includes('stylist') && groupKey !== 'barber') return true;
      return false;
    });
  };

  // Only show services that are active, have at least one specialty assigned,
  // and can be handled by at least one stylist working today.
  const getBookableServices = (): Service[] => {
    return services
      .filter(s => s.service_status === 'active')
      // A service with no specialty can't be routed to a stylist — hide it
      .filter(s => getServiceSpecialties(s.id).length > 0)
      .filter(s => getEligibleStaffForGroup(getServiceGroupInfo(s.id).key).length > 0);
  };

  const getServiceSections = (): ServiceGroup[] => {
    const map = new Map<string, ServiceGroup>();
    getBookableServices().forEach((service) => {
      const { key, label } = getServiceGroupInfo(service.id);
      if (!map.has(key)) map.set(key, { key, specialtyKey: key, label, services: [] });
      map.get(key)!.services.push(service);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  };

  const getSelectedServices = (): Service[] =>
    services.filter((s) => selectedServiceIds.includes(s.id));

  /**
   * Splits the selected services into groups (one stylist each).
   * - Multitaskable services share ONE group per specialty.
   * - A non-multitaskable service always gets its own group.
   */
  const getSelectedGroups = (): ServiceGroup[] => {
    const map = new Map<string, ServiceGroup>();
    getSelectedServices().forEach((service) => {
      const info = getServiceGroupInfo(service.id);

      const isSolo = service.is_multitaskable !== 1;
      const key = isSolo ? `${info.key}::solo-${service.id}` : info.key;
      const label = isSolo ? `${info.label} · ${service.service_name}` : info.label;

      if (!map.has(key)) {
        map.set(key, { key, specialtyKey: info.key, label, services: [] });
      }
      map.get(key)!.services.push(service);
    });
    return Array.from(map.values());
  };

  const getGroupTotal = (group: ServiceGroup): number =>
    group.services.reduce((sum, s) => sum + s.price, 0);

  const getTotalPrice = (): number =>
    getSelectedServices().reduce((sum, s) => sum + s.price, 0);

  const getTotalDuration = (): number =>
    getSelectedServices().reduce((sum, s) => sum + s.duration_minutes, 0);

  // ─────────────────────────────────────────────────────────────
  // Saved walk-in guests (customers without an account)
  // ─────────────────────────────────────────────────────────────
  const isWalkInFinished = (record: WalkInRecord): boolean =>
    record.is_finished === true || Number(record.is_finished) === 1;

  /**
   * Walk-in customers with NO account (customer_id is null) who have at least one
   * completed walk-in. Each guest appears once, de-duplicated by name (case/space-insensitive).
   * The most recent record decides the display name and "last service".
   */
  const getSavedWalkInGuests = (): SavedWalkInGuest[] => {
    const map = new Map<string, { guest: SavedWalkInGuest; latestId: number }>();

    walkInRecords.forEach((record) => {
      if (record.customer_id != null) return; // has an account — shown in the accounts list
      if (!isWalkInFinished(record)) return; // only completed sessions
      const key = normalizeGuestName(record.customer_name);
      if (!key) return;

      const serviceName = services.find((s) => s.id === record.service_id)?.service_name ?? null;
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          latestId: record.id,
          guest: {
            key,
            name: record.customer_name.trim().replace(/\s+/g, ' '),
            visitCount: 1,
            lastServiceName: serviceName,
          },
        });
        return;
      }

      existing.guest.visitCount += 1;
      if (record.id > existing.latestId) {
        existing.latestId = record.id;
        existing.guest.name = record.customer_name.trim().replace(/\s+/g, ' ');
        existing.guest.lastServiceName = serviceName;
      }
    });

    return Array.from(map.values())
      .map((entry) => entry.guest)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // ─────────────────────────────────────────────────────────────
  // Selection handlers
  // ─────────────────────────────────────────────────────────────
  const startNewWalkIn = () => {
    setCustomerName('');
    setSelectedCustomerId(null);
    setIsWalkInGuest(false);
    setSelectedServiceIds([]);
    setGroupStaff({});
    setCustomerSearch('');
    submittedServicesRef.current = new Set();
    setBookingStep('customer');
  };

  const handleCustomerSelect = (customer: CustomerAccount | null) => {
    if (customer) {
      setSelectedCustomerId(customer.id);
      setIsWalkInGuest(false);
      setCustomerName(`${customer.first_name} ${customer.last_name}`);
    } else {
      setSelectedCustomerId(null);
      setIsWalkInGuest(true);
      setCustomerName('');
    }
    setCustomerSearch('');
    setSelectedServiceIds([]);
    setGroupStaff({});
    setBookingStep('services');
  };

  // A returning guest without an account: the name is already known, so no need to type it again.
  const handleSavedGuestSelect = (guest: SavedWalkInGuest) => {
    setSelectedCustomerId(null); // still no account — customer_id stays null
    setIsWalkInGuest(false); // name is prefilled, so hide the name input
    setCustomerName(guest.name);
    setCustomerSearch('');
    setSelectedServiceIds([]);
    setGroupStaff({});
    setBookingStep('services');
  };

  const handleServiceSelect = (serviceId: number) => {
    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(id => id !== serviceId));
      return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    setSelectedServiceIds([...selectedServiceIds, serviceId]);
  };

  const handleContinueToStylist = () => {
    if (isWalkInGuest && !customerName.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
      return;
    }
    if (selectedServiceIds.length === 0) {
      Alert.alert("Selection Required", "Please select at least one service.");
      return;
    }
    setBookingStep('stylist');
  };

  const handleStaffSelectForGroup = (groupKey: string, staffId: number) => {
    setGroupStaff((prev) => ({ ...prev, [groupKey]: staffId }));
  };

  const handleContinueToConfirm = () => {
    const currentGroups = getSelectedGroups();
    for (const group of currentGroups) {
      const staffId = groupStaff[group.key];
      if (!staffId) {
        Alert.alert("Selection Required", `Please select a stylist for ${group.label}.`);
        return;
      }
      const stillEligible = getEligibleStaffForGroup(group.specialtyKey).some((m) => m.id === staffId);
      if (!stillEligible) {
        Alert.alert("Stylist Unavailable", `The stylist for ${group.label} is no longer available today. Please choose another.`);
        setGroupStaff((prev) => {
          const next = { ...prev };
          delete next[group.key];
          return next;
        });
        return;
      }
    }
    setBookingStep('confirm');
  };

  const handleBackToCustomer = () => {
    setSelectedServiceIds([]);
    setGroupStaff({});
    setBookingStep('customer');
  };

  const handleBackToServices = () => {
    setBookingStep('services');
  };

  const handleBackToStylist = () => {
    setBookingStep('stylist');
  };

  const handleBackToLanding = () => {
    startNewWalkIn();      
    setMainTab('landing'); 
  };

  const handleConfirmWalkIn = async () => {
    const currentGroups = getSelectedGroups();

    if (!customerName.trim()) {
      Alert.alert("Validation Error", "Please select a customer or enter a name.");
      return;
    }
    if (currentGroups.length === 0) {
      Alert.alert("Validation Error", "Please select at least one service");
      setBookingStep('services');
      return;
    }
    for (const group of currentGroups) {
      if (!groupStaff[group.key]) {
        Alert.alert("Validation Error", `Please select a stylist for ${group.label}`);
        setBookingStep('stylist');
        return;
      }
    }

    setIsProcessing(true);
    const submitted = submittedServicesRef.current;

    try {
      for (const group of currentGroups) {
        const stylistId = groupStaff[group.key];
        for (const service of group.services) {
          if (submitted.has(service.id)) continue;

          await submitWalkIn({
            customer_id: selectedCustomerId,
            customer_name: customerName.trim(),
            service_id: service.id,
            stylist_id: stylistId,
            is_finished: 0,
          });
          submitted.add(service.id);
        }
      }

      const count = selectedServiceIds.length;
      Alert.alert(
        "Success",
        count > 1
          ? `Walk-in added successfully for ${count} services! You can manage it from My Appointments.`
          : "Walk-in customer added successfully! You can manage it from My Appointments."
      );
      startNewWalkIn();
      // Keep the saved-guest list in sync
      fetchWalkIns();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      const addedCount = selectedServiceIds.filter((id) => submitted.has(id)).length;
      const partialNote =
        addedCount > 0
          ? `\n\n${addedCount} of ${selectedServiceIds.length} service(s) were already added. Tap "Add Walk-in" again to retry the remaining one(s).`
          : '';
      Alert.alert(
        "Error",
        `${error.response?.data?.message || "Failed to add walk-in customer"}${partialNote}`
      );
    } finally {
      if (isMountedRef.current) setIsProcessing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────
  // Helpers
  // ─────────────────────────────────────────────────────────────
  const getStaffName = (staffId: number | null | undefined) => {
    if (!staffId) return '';
    const member = staff.find(s => s.id === staffId);
    return member ? `${member.first_name} ${member.last_name}` : '';
  };

  const getStaffSpecialties = (staffId: number | null) => {
    if (!staffId) return 'No specialties assigned';
    const member = staff.find(s => s.id === staffId);
    if (!member?.staff_specialties) return 'No specialties assigned';
    return member.staff_specialties
      .filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name || '')
      .filter(Boolean)
      .join(', ');
  };

  const getStaffRating = (staffId: number) => {
    try {
      const reviews = staffFeedbacks.filter(f => f.staff_id === staffId);
      if (reviews.length === 0) return { average: 0, count: 0 };
      const total = reviews.reduce((sum, fb) => {
        const rating = typeof fb.rating === 'number' ? fb.rating : parseFloat(fb.rating as any) || 0;
        return sum + rating;
      }, 0);
      return { average: parseFloat((total / reviews.length).toFixed(1)), count: reviews.length };
    } catch { return { average: 0, count: 0 }; }
  };

  const renderStars = (rating: number) => {
    const valid = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
    const full = Math.floor(valid);
    const half = valid % 1 >= 0.5;
    const stars = [];
    for (let i = 0; i < full; i++) stars.push(<Ionicons key={`s-${i}`} name="star" size={14} color="#fbbf24" />);
    if (half) stars.push(<Ionicons key="half" name="star-half" size={14} color="#fbbf24" />);
    const empty = 5 - stars.length;
    for (let i = 0; i < empty; i++) stars.push(<Ionicons key={`e-${i}`} name="star-outline" size={14} color="#d1d5db" />);
    return stars;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const d = new Date(dateString);
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  const formatTime = (timeString: string) => {
    if (!timeString) return 'N/A';
    const [hours, minutes] = timeString.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const filteredCustomers = customerList.filter(c => {
    if (!customerSearch.trim()) return true;
    const term = customerSearch.toLowerCase();
    const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
    return fullName.includes(term) || c.email?.toLowerCase().includes(term) || c.phone_number?.includes(term);
  });

  // Returning guests (no account), filtered by the same search box
  const filteredSavedGuests = getSavedWalkInGuests().filter((g) => {
    if (!customerSearch.trim()) return true;
    return g.name.toLowerCase().includes(customerSearch.trim().toLowerCase());
  });

  // ─────────────────────────────────────────────────────────────
  // Modals
  // ─────────────────────────────────────────────────────────────
  const PaymentProofModal = () => {
    if (!selectedPaymentData) return null;
    const { payment_method, payment_proof, billing } = selectedPaymentData;
    const appointment_id = billing?.appointment_id || 'N/A';
    const total_amount = billing?.total_amount || '0.00';
    const payment_type = billing?.payment_type || 'N/A';
    const proofUrl = payment_proof ? `${BASE_URL}${payment_proof}` : null;

    return (
      <Modal transparent animationType="slide" visible={showPaymentProofModal}
        onRequestClose={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            <View
              className="px-6 py-4 flex-row justify-between items-center"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white text-xl font-bold">Payment Proof</Text>
              <TouchableOpacity onPress={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}>
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
                  <Text className="text-gray-800 font-semibold capitalize">{payment_type}</Text>
                </View>
                <View className="flex-row justify-between mb-2">
                  <Text className="text-gray-500 text-sm">Total Amount</Text>
                  <Text className="text-pink-600 font-bold">₱{parseFloat(total_amount).toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between">
                  <Text className="text-gray-500 text-sm">Payment Method</Text>
                  <Text className="text-gray-800 font-semibold">{payment_method || 'N/A'}</Text>
                </View>
              </View>
              {proofUrl ? (
                <View className="mb-4">
                  <Text className="text-gray-500 text-sm mb-2">Payment Proof Screenshot</Text>
                  <View className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 h-64">
                    <Image source={{ uri: proofUrl }} className="w-full h-full" resizeMode="contain" />
                  </View>
                </View>
              ) : (
                <View className="bg-gray-100 rounded-lg p-8 mb-4 items-center">
                  <Ionicons name="image-outline" size={48} color="#9ca3af" />
                  <Text className="text-gray-500 text-sm mt-2">No payment proof uploaded</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => { setShowPaymentProofModal(false); setSelectedPaymentData(null); }}
                className="w-full py-3 rounded-xl"
                style={{ backgroundColor: '#ec4899' }}
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const AppointmentDetailsModal = () => {
    if (!selectedAppointment) return null;
    const isPending = selectedAppointment.status === 'pending';
    const appointmentId = selectedAppointment.appointment_id || selectedAppointment.id;

    const basePrice = parseFloat(selectedAppointment.price || '0');
    const grandTotal = selectedAppointment.billing_total_amount ?? basePrice;
    const paidAmount = selectedAppointment.billing_paid_amount ?? 0;
    const balance = selectedAppointment.billing_balance ?? (grandTotal - paidAmount);

    return (
      <Modal transparent animationType="slide" visible={showAppointmentModal}
        onRequestClose={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}>
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <View className="bg-white rounded-2xl overflow-hidden w-full max-w-md">
            <View
              className="px-6 py-4 flex-row justify-between items-center"
              style={{ backgroundColor: '#ec4899' }}
            >
              <Text className="text-white text-xl font-bold">Appointment Details</Text>
              <TouchableOpacity onPress={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            <ScrollView className="max-h-[500px]">
              <View className="p-6">
                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Customer</Text>
                    <Text className="text-gray-800 font-semibold">{selectedAppointment.customer_name}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Service</Text>
                    <Text className="text-gray-800 font-semibold flex-1 text-right ml-2">{selectedAppointment.service_name}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Date</Text>
                    <Text className="text-gray-800 font-semibold">{formatDate(selectedAppointment.appointment_date)}</Text>
                  </View>
                  <View className="flex-row justify-between mb-2">
                    <Text className="text-gray-500 text-sm">Time</Text>
                    <Text className="text-gray-800 font-semibold">{formatTime(selectedAppointment.appointment_time)}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">Duration</Text>
                    <Text className="text-gray-800 font-semibold">{selectedAppointment.duration_minutes} mins</Text>
                  </View>
                </View>

                <View className="bg-gray-50 rounded-lg p-4 mb-4">
                  <Text className="text-gray-700 text-sm font-bold mb-2">Payment Summary</Text>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-sm">Total Amount</Text>
                    <Text className="text-gray-800 font-semibold">₱{grandTotal.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-gray-500 text-sm">Amount Paid</Text>
                    <Text className="text-green-600 font-semibold">₱{paidAmount.toLocaleString()}</Text>
                  </View>
                  <View className="flex-row justify-between">
                    <Text className="text-gray-500 text-sm">Balance</Text>
                    <Text className={`font-semibold ${balance > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                      {balance > 0 ? `₱${balance.toLocaleString()}` : 'Paid in Full'}
                    </Text>
                  </View>
                </View>

                <View className="mb-4 p-3 bg-gray-50 rounded-lg">
                  <Text className="text-gray-500 text-sm">Status</Text>
                  <View className={`mt-1 px-3 py-1 rounded-full self-start ${getStatusColor(selectedAppointment.status)}`}>
                    <Text className="text-xs font-semibold capitalize">{selectedAppointment.status}</Text>
                  </View>
                </View>

                <TouchableOpacity onPress={() => fetchPaymentProof(appointmentId)}
                  className="flex-row items-center justify-center gap-2 py-3 rounded-xl bg-purple-100 mb-4">
                  <Ionicons name="image-outline" size={20} color="#7c3aed" />
                  <Text className="text-purple-700 font-semibold">View Payment Proof</Text>
                </TouchableOpacity>

                {isPending ? (
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}
                      className="flex-1 py-3 rounded-xl border border-gray-300">
                      <Text className="text-gray-600 text-center font-semibold">Close</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateAppointmentStatus(selectedAppointment, 'confirmed')}
                      disabled={isUpdatingAppointment} className="flex-1 py-3 rounded-xl bg-green-600">
                      <Text className="text-white text-center font-semibold">
                        {isUpdatingAppointment ? '...' : 'Confirm'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => updateAppointmentStatus(selectedAppointment, 'cancelled')}
                      disabled={isUpdatingAppointment} className="flex-1 py-3 rounded-xl bg-red-600">
                      <Text className="text-white text-center font-semibold">
                        {isUpdatingAppointment ? '...' : 'Cancel'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View className="flex-row gap-3">
                    <TouchableOpacity onPress={() => { setShowAppointmentModal(false); setSelectedAppointment(null); }}
                      className="flex-1 py-3 rounded-xl border border-gray-300">
                      <Text className="text-gray-600 text-center font-semibold">Close</Text>
                    </TouchableOpacity>
                    <View className="flex-1 py-3 rounded-xl bg-gray-200 items-center justify-center">
                      <Text className="text-gray-600 text-center font-semibold">
                        {selectedAppointment.status === 'confirmed' ? '✅ Confirmed' :
                         selectedAppointment.status === 'completed' ? '✅ Completed' :
                         selectedAppointment.status === 'cancelled' ? '❌ Cancelled' : ''}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Effects
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return;

    setIsLoading(true);
    Promise.all([
      fetchBusinessSchedules(),
      fetchStaffAssignments(),
      fetchStaff(),
      fetchServices(),
      fetchServiceSpecialties(),
      fetchStaffFeedbacks(),
      fetchAllAppointments(),
      fetchCustomers(),
      fetchWalkIns(),
    ]).finally(() => {
      if (isMountedRef.current) setIsLoading(false);
    });
  }, [user?.id]);

  useEffect(() => {
    if (mainTab === 'appointments' && user?.id && !hasCheckedAuth) {
      checkWalkInAuthorization();
    }
  }, [mainTab, user?.id, hasCheckedAuth]);

  useEffect(() => {
    if (mainTab === 'appointments' && user?.id) {
      fetchAllAppointments();
    }
  }, [mainTab, user?.id]);

  // Refresh the saved-guest list whenever the staff opens the walk-ins flow,
  // so sessions completed since the last visit show up.
  useEffect(() => {
    if (mainTab === 'walk-ins' && user?.id) {
      fetchWalkIns();
    }
  }, [mainTab, user?.id]);

  const todayStaff = getTodayStaff();

  const FINISHED_STATUSES = ['completed', 'cancelled', 'no-show'];
  const HIDE_PAST_TIMES_TODAY = false;

  const getLocalDateStr = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

  const timeStringToMinutes = (time: string): number => {
    const [h, m] = (time || '').split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };

  const isUpcomingAppointment = (appointment: StaffAppointment): boolean => {
    const status = (appointment.status || '').toLowerCase().trim();
    if (FINISHED_STATUSES.includes(status)) return false;

    const dateStr = (appointment.appointment_date || '').slice(0, 10);
    if (!dateStr) return false;

    const now = new Date();
    const todayStr = getLocalDateStr(now);
    if (dateStr > todayStr) return true;
    if (dateStr < todayStr) return false;

    if (!HIDE_PAST_TIMES_TODAY) return true;
    return timeStringToMinutes(appointment.appointment_time) >= now.getHours() * 60 + now.getMinutes();
  };

  const upcomingAppointments = staffAppointments
    .filter(isUpcomingAppointment)
    .sort((a, b) => {
      const aDate = (a.appointment_date || '').slice(0, 10);
      const bDate = (b.appointment_date || '').slice(0, 10);
      if (aDate !== bDate) return aDate.localeCompare(bDate);
      return timeStringToMinutes(a.appointment_time) - timeStringToMinutes(b.appointment_time);
    });

  // ─────────────────────────────────────────────────────────────
  // Landing screen
  // ─────────────────────────────────────────────────────────────
  const renderLandingSection = () => {
    return (
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 pt-6 pb-8">
          <Text className="text-3xl font-bold text-gray-800 mb-2">
            Appointments & Walk-ins
          </Text>
          <Text className="text-gray-500 mb-8">
            Choose what you'd like to do
          </Text>

          {/* Appointments Button */}
          <TouchableOpacity
            onPress={() => setMainTab('appointments')}
            activeOpacity={0.85}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
            style={{ elevation: 2 }}
          >
            <View className="flex-row items-center">
              <View className="w-14 h-14 bg-blue-100 rounded-2xl items-center justify-center mr-4">
                <Ionicons name="calendar" size={28} color="#3b82f6" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">Appointments</Text>
                <Text className="text-gray-500 text-sm mt-0.5">
                  View upcoming bookings, confirm or cancel
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
            </View>
          </TouchableOpacity>

          {/* Walk-ins Button */}
          <TouchableOpacity
            onPress={() => setMainTab('walk-ins')}
            activeOpacity={0.85}
            className="bg-white rounded-2xl p-5 mb-4 shadow-sm border border-gray-100"
            style={{ elevation: 2 }}
          >
            <View className="flex-row items-center">
              <View className="w-14 h-14 bg-pink-100 rounded-2xl items-center justify-center mr-4">
                <Ionicons name="walk" size={28} color="#ec4899" />
              </View>
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">Walk-ins</Text>
                <Text className="text-gray-500 text-sm mt-0.5">
                  Add a walk-in customer or manage existing ones
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Section: Appointments
  // ─────────────────────────────────────────────────────────────
  const renderAppointmentsSection = () => {
    if (isCheckingAuth) {
      return (
        <View className="flex-1 justify-center items-center py-20">
          <ActivityIndicator size="large" color="#ec4899" />
          <Text className="text-gray-500 mt-4">Checking authorization...</Text>
        </View>
      );
    }

    if (!isAuthorized) {
      return (
        <View className="flex-1 justify-center items-center py-20 px-6">
          <View className="w-20 h-20 bg-pink-100 rounded-full items-center justify-center mb-4">
            <Ionicons name="lock-closed" size={40} color="#ec4899" />
          </View>
          <Text className="text-2xl font-bold text-gray-800 mb-2">Not Authorized</Text>
          <Text className="text-gray-600 text-center mb-6">
            You are not authorized to view or manage appointments. Please contact the salon owner to request access.
          </Text>
          <TouchableOpacity
            className="bg-pink-500 py-3 px-6 rounded-xl"
            onPress={() => setMainTab('landing')}>
            <Text className="text-white font-semibold">Back</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 pt-4 pb-6">
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              className="flex-row items-center"
              onPress={() => setMainTab('landing')}>
              <Ionicons name="arrow-back" size={24} color="#ec4899" />
              <Text className="text-pink-600 font-semibold ml-2">Back</Text>
            </TouchableOpacity>
          </View>

          <Text className="text-3xl font-bold text-gray-800 mb-2">Appointments</Text>
          <Text className="text-gray-500 mb-4">
            Upcoming appointments — confirm or cancel pending bookings
          </Text>

          <View className="flex-row items-center mb-3">
            <View className="w-1 h-6 bg-blue-500 rounded-full mr-2" />
            <Text className="text-xl font-bold text-gray-800">Upcoming Appointments</Text>
            <View className="ml-2 bg-blue-100 px-2 py-0.5 rounded-full">
              <Text className="text-blue-600 text-xs font-semibold">{upcomingAppointments.length}</Text>
            </View>
          </View>

          {isLoadingAppointments ? (
            <View className="py-6 items-center">
              <ActivityIndicator size="small" color="#ec4899" />
              <Text className="text-center text-gray-500 mt-2">Loading appointments...</Text>
            </View>
          ) : upcomingAppointments.length === 0 ? (
            <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
              <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
              <Text className="text-gray-500 text-center mt-3">No upcoming appointments</Text>
              <Text className="text-gray-400 text-sm text-center mt-1">
                Past and completed appointments are not shown here
              </Text>
            </View>
          ) : (
            upcomingAppointments.map((appointment) => {
              const grandTotal = appointment.billing_total_amount ?? parseFloat(appointment.price || '0');
              const paidAmount = appointment.billing_paid_amount ?? 0;
              const balance = appointment.billing_balance ?? (grandTotal - paidAmount);

              return (
                <TouchableOpacity
                  key={appointment.id}
                  className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100"
                  onPress={() => { setSelectedAppointment(appointment); setShowAppointmentModal(true); }}>
                  <View className="flex-row justify-between items-start">
                    <View className="flex-1">
                      <Text className="text-lg font-bold text-gray-800">{appointment.customer_name}</Text>
                      <Text className="text-gray-500 text-sm">{appointment.service_name}</Text>
                      <Text className="text-gray-400 text-xs">
                        {formatDate(appointment.appointment_date)} at {formatTime(appointment.appointment_time)}
                      </Text>
                      <View className={`mt-1 px-2 py-0.5 rounded-full self-start ${getStatusColor(appointment.status)}`}>
                        <Text className="text-xs font-semibold capitalize">{appointment.status}</Text>
                      </View>
                      {balance > 0 && (
                        <Text className="text-orange-500 text-xs mt-1">
                          Balance: ₱{balance.toLocaleString()}
                        </Text>
                      )}
                    </View>
                    <Text className="text-pink-500 font-bold">
                      ₱{grandTotal.toLocaleString()}
                    </Text>
                  </View>
                  <View className="flex-row justify-end items-center mt-2 pt-2 border-t border-gray-100">
                    <TouchableOpacity
                      className="bg-blue-100 px-3 py-1.5 rounded-lg"
                      onPress={() => { setSelectedAppointment(appointment); setShowAppointmentModal(true); }}>
                      <Text className="text-blue-700 text-xs font-semibold">View</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Section: Walk-ins
  // ─────────────────────────────────────────────────────────────
  const renderWalkInsSection = () => {
    const groups = getSelectedGroups();
    const hasMultipleGroups = groups.length > 1;
    const allGroupsHaveStaff = groups.length > 0 && groups.every((g) => !!groupStaff[g.key]);
    const serviceSections = getServiceSections();
    const totalPrice = getTotalPrice();
    const totalDuration = getTotalDuration();
    const canContinueFromServices =
      selectedServiceIds.length > 0 && (!isWalkInGuest || customerName.trim().length > 0);
    const isLoadingCustomerStep = isLoadingCustomers || isLoadingWalkIns;
    const hasNoCustomerResults = filteredCustomers.length === 0 && filteredSavedGuests.length === 0;

    return (
      <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
        <View className="px-5 pt-4">
          {/* Back button – always visible inside walk-ins flow */}
          {(bookingStep === 'customer' || bookingStep === 'services' || bookingStep === 'stylist' || bookingStep === 'confirm') && (
            <TouchableOpacity
              className="flex-row items-center mb-4"
              onPress={
                bookingStep === 'confirm' ? handleBackToStylist :
                bookingStep === 'stylist' ? handleBackToServices :
                bookingStep === 'services' ? handleBackToCustomer :
                handleBackToLanding // ← from customer step, go back to landing
              }
              disabled={isProcessing}>
              <Ionicons name="arrow-back" size={20} color="#9ca3af" />
              <Text className="text-gray-500 font-medium ml-2 text-sm">
                {bookingStep === 'confirm' ? 'Back to Stylists' :
                 bookingStep === 'stylist' ? 'Back to Services' :
                 bookingStep === 'services' ? 'Back to Customers' :
                 'Back to Selection'}
              </Text>
            </TouchableOpacity>
          )}

          <Text className="text-3xl font-bold text-gray-800 mb-2">
            {bookingStep === 'customer' ? 'Select Customer' :
             bookingStep === 'services' ? 'Select Services' :
             bookingStep === 'stylist' ? (hasMultipleGroups ? 'Select Stylists' : 'Select Stylist') :
             'Confirm Walk-in'}
          </Text>
          <Text className="text-gray-500 mb-6">
            {bookingStep === 'customer' ? 'Search for an existing account, a returning guest, or add a new guest' :
             bookingStep === 'services' ? `Customer: ${customerName || 'Walk-in Guest'}` :
             bookingStep === 'stylist' ? (hasMultipleGroups ? 'Choose a stylist for each group' : 'Choose a stylist for this walk-in') :
             `Review walk-in details`}
          </Text>

          {/* Step 0: Customer Selection */}
          {bookingStep === 'customer' && (
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ elevation: 2 }}>
              <Text className="text-lg font-semibold text-gray-800 mb-4">Select Customer</Text>

              <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 border border-gray-200 mb-4">
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                  value={customerSearch}
                  onChangeText={setCustomerSearch}
                  placeholder="Search by name, email, or phone..."
                  className="flex-1 ml-2 text-sm text-gray-800"
                />
                {customerSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setCustomerSearch('')}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>

              <TouchableOpacity
                className="flex-row items-center p-3 mb-4 rounded-xl border-2 border-dashed border-pink-300 bg-pink-50"
                onPress={() => handleCustomerSelect(null)}
              >
                <View className="w-10 h-10 bg-pink-200 rounded-full items-center justify-center">
                  <Ionicons name="person-add" size={20} color="#ec4899" />
                </View>
                <View className="ml-3 flex-1">
                  <Text className="text-gray-800 font-semibold">New Walk-in Guest</Text>
                  <Text className="text-gray-500 text-xs">Enter a custom name manually</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#ec4899" />
              </TouchableOpacity>

              {isLoadingCustomerStep ? (
                <View className="py-8 items-center">
                  <ActivityIndicator size="small" color="#ec4899" />
                  <Text className="text-gray-500 mt-2 text-sm">Loading customers...</Text>
                </View>
              ) : hasNoCustomerResults ? (
                <View className="py-8 items-center">
                  <Ionicons name="people-outline" size={40} color="#d1d5db" />
                  <Text className="text-gray-500 text-sm mt-2">No customers found</Text>
                </View>
              ) : (
                <View>
                  {/* Returning walk-in guests (no account, at least one completed walk-in) */}
                  {filteredSavedGuests.length > 0 && (
                    <View className="mb-2">
                      <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                        Previous Walk-in Guests
                      </Text>
                      {filteredSavedGuests.map((guest) => (
                        <TouchableOpacity
                          key={`guest-${guest.key}`}
                          className="flex-row items-center p-3 mb-2 rounded-xl border border-pink-200 bg-pink-50"
                          onPress={() => handleSavedGuestSelect(guest)}
                        >
                          <View className="w-10 h-10 bg-pink-200 rounded-full items-center justify-center">
                            <Text className="text-pink-700 font-bold">
                              {guest.name.charAt(0).toUpperCase()}
                            </Text>
                          </View>
                          <View className="ml-3 flex-1">
                            <Text className="text-gray-800 font-semibold">{guest.name}</Text>
                            <Text className="text-gray-500 text-xs">
                              {guest.visitCount} completed walk-in{guest.visitCount === 1 ? '' : 's'}
                              {guest.lastServiceName ? ` · Last: ${guest.lastServiceName}` : ''}
                            </Text>
                          </View>
                          <View className="bg-pink-100 px-2 py-0.5 rounded-full mr-2">
                            <Text className="text-pink-600 text-[10px] font-semibold">No account</Text>
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#ec4899" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Customers with an account */}
                  {filteredCustomers.length > 0 && (
                    <View>
                      {filteredSavedGuests.length > 0 && (
                        <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 mt-2">
                          Registered Customers
                        </Text>
                      )}
                      {filteredCustomers.map((customer) => (
                        <TouchableOpacity
                          key={customer.id}
                          className="flex-row items-center p-3 mb-2 rounded-xl border border-gray-200 bg-white"
                          onPress={() => handleCustomerSelect(customer)}
                        >
                          <View className="w-10 h-10 bg-gray-100 rounded-full items-center justify-center">
                            <Text className="text-gray-600 font-bold">
                              {customer.first_name?.charAt(0)}{customer.last_name?.charAt(0)}
                            </Text>
                          </View>
                          <View className="ml-3 flex-1">
                            <Text className="text-gray-800 font-semibold">{customer.first_name} {customer.last_name}</Text>
                            <Text className="text-gray-500 text-xs">{customer.email}</Text>
                            {customer.phone_number && (
                              <Text className="text-gray-400 text-xs">{customer.phone_number}</Text>
                            )}
                          </View>
                          <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>
          )}

          {/* Step 1: Service Selection */}
          {bookingStep === 'services' && (
            <View className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ elevation: 2 }}>
              {isWalkInGuest && (
                <>
                  <Text className="text-gray-700 font-semibold mb-2">Customer Name *</Text>
                  <TextInput
                    value={customerName}
                    onChangeText={setCustomerName}
                    placeholder="Enter customer name"
                    className="border border-gray-300 rounded-lg px-4 py-3 text-gray-700 mb-4"
                  />
                </>
              )}

              <Text className="text-gray-500 text-sm mb-4">
                Multitaskable services of the same specialty are grouped together. Services that
                aren't multitaskable get their own stylist.
              </Text>

              {isLoading ? (
                <View className="py-10 items-center">
                  <ActivityIndicator size="large" color="#ec4899" />
                  <Text className="text-center text-gray-500 mt-2">Loading services...</Text>
                </View>
              ) : serviceSections.length === 0 ? (
                <View className="py-8 items-center">
                  <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">
                    {todayStaff.length === 0
                      ? 'No stylists are scheduled today'
                      : 'No services are available with today\'s stylists'}
                  </Text>
                </View>
              ) : (
                serviceSections.map((section) => (
                  <View key={section.key} className="mb-2">
                    <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                      {section.label}
                    </Text>

                    {section.services.map((service) => {
                      const isSelected = selectedServiceIds.includes(service.id);
                      const isMultitaskable = service.is_multitaskable === 1;

                      return (
                        <TouchableOpacity
                          key={service.id}
                          className={`rounded-2xl p-4 mb-3 border-2 ${
                            isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                          }`}
                          onPress={() => handleServiceSelect(service.id)}
                          activeOpacity={0.7}
                          disabled={isProcessing}>
                          <View className="flex-row items-start">
                            <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                              {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                            </View>
                            <View className="flex-1">
                              <Text className="text-lg font-semibold text-gray-800">{service.service_name}</Text>
                              <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>{service.description}</Text>
                              <View className="flex-row items-center mt-2 flex-wrap gap-1">
                                <Ionicons name="time-outline" size={14} color="#9ca3af" />
                                <Text className="text-gray-500 text-xs mr-2">{service.duration_minutes} mins</Text>
                                {isMultitaskable ? (
                                  <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                    <Text className="text-green-600 text-xs">Multitaskable</Text>
                                  </View>
                                ) : (
                                  <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                                    <Text className="text-orange-600 text-xs">Own Stylist</Text>
                                  </View>
                                )}
                              </View>
                            </View>
                            <Text className="text-pink-600 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ))
              )}

              {selectedServiceIds.length > 0 && (
                <View className="mt-2 p-3 bg-gray-50 rounded-xl">
                  {groups.map((group, index) => (
                    <View key={group.key} className="mb-2">
                      <Text className="text-gray-500 text-[11px] uppercase font-semibold">
                        {group.label}{hasMultipleGroups ? ` · Group ${index + 1}` : ''}
                      </Text>
                      <Text className="text-gray-700 text-sm">
                        {group.services.map(s => s.service_name).join(' + ')}
                      </Text>
                    </View>
                  ))}

                  {hasMultipleGroups && (
                    <View className="bg-blue-50 rounded-lg p-2 mb-2">
                      <Text className="text-blue-700 text-xs">
                        Your services are split into {groups.length} groups. You'll choose a stylist for each.
                      </Text>
                    </View>
                  )}

                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-600 text-sm">Total Duration: {totalDuration} mins</Text>
                    <Text className="text-pink-600 font-bold text-lg">₱{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                className={`py-4 rounded-xl mt-4 ${canContinueFromServices ? 'bg-pink-600' : 'bg-gray-400'}`}
                onPress={handleContinueToStylist}
                disabled={!canContinueFromServices || isProcessing}>
                <Text className="text-white text-center font-semibold text-lg">Continue to Stylist</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 2: Stylist Selection */}
          {bookingStep === 'stylist' && (
            <View>
              {groups.map((group, index) => {
                // Eligibility depends on the real specialty, not the unique group key
                const eligible = getEligibleStaffForGroup(group.specialtyKey);
                const chosenId = groupStaff[group.key];

                return (
                  <View key={group.key} className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                    <View className="bg-pink-50 rounded-xl p-3 mb-4">
                      <Text className="text-gray-500 text-xs uppercase font-semibold">
                        {hasMultipleGroups ? `Group ${index + 1} · ` : ''}{group.label}
                      </Text>
                      <Text className="text-base font-bold text-gray-800">
                        {group.services.map(s => s.service_name).join(' + ')}
                      </Text>
                      <Text className="text-gray-500 text-xs mt-1">
                        ₱{getGroupTotal(group).toLocaleString()}
                      </Text>
                    </View>

                    {eligible.length === 0 ? (
                      <View className="py-6 items-center">
                        <Ionicons name="people-outline" size={40} color="#d1d5db" />
                        <Text className="text-gray-500 text-center mt-2">
                          No stylists available today for {group.label}
                        </Text>
                      </View>
                    ) : (
                      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        {eligible.map((staffMember) => {
                          const { average, count } = getStaffRating(staffMember.id);
                          const specialties = getStaffSpecialties(staffMember.id);
                          const profileImage = getImageUrl(
                            staffMember.profile_image || staffMember.user?.profile_image
                          );
                          const isChosen = chosenId === staffMember.id;

                          return (
                            <TouchableOpacity
                              key={staffMember.id}
                              style={{ width: 170, marginRight: 12 }}
                              onPress={() => handleStaffSelectForGroup(group.key, staffMember.id)}
                              activeOpacity={0.85}
                              disabled={isProcessing}>
                              <View
                                className={`bg-white rounded-2xl overflow-hidden border-2 ${
                                  isChosen ? 'border-pink-500' : 'border-gray-100'
                                }`}
                                style={{ elevation: 3 }}>
                                <View className="relative">
                                  {profileImage ? (
                                    <Image source={{ uri: profileImage }} className="w-full h-36" resizeMode="cover" />
                                  ) : (
                                    <View
                                      className="w-full h-36 items-center justify-center"
                                      style={{ backgroundColor: '#ec4899' }}>
                                      <Text className="text-white font-bold text-4xl">
                                        {staffMember.first_name?.charAt(0)}{staffMember.last_name?.charAt(0)}
                                      </Text>
                                    </View>
                                  )}
                                  {average > 0 && (
                                    <View className="absolute top-2 right-2 bg-black/70 rounded-full px-2 py-1 flex-row items-center">
                                      <Ionicons name="star" size={12} color="#fbbf24" />
                                      <Text className="text-white font-bold text-xs ml-1">{average.toFixed(1)}</Text>
                                      <Text className="text-white/70 text-xs ml-1">({count})</Text>
                                    </View>
                                  )}
                                  <View className="absolute bottom-2 left-2 bg-pink-500 rounded-full px-2 py-0.5">
                                    <Text className="text-white text-[10px] font-semibold">Available</Text>
                                  </View>
                                </View>
                                <View className="p-3">
                                  <Text className="text-sm font-bold text-gray-800" numberOfLines={1}>
                                    {staffMember.first_name} {staffMember.last_name}
                                  </Text>
                                  <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>{specialties}</Text>
                                  <View className="flex-row items-center mt-2">
                                    {average > 0 ? renderStars(average) : <Text className="text-gray-400 text-xs">No ratings yet</Text>}
                                  </View>
                                  <View className={`mt-3 rounded-full py-2 items-center ${isChosen ? 'bg-pink-600' : 'bg-gray-200'}`}>
                                    <Text className={isChosen ? 'text-white font-semibold text-xs' : 'text-gray-600 text-xs'}>
                                      {isChosen ? '✓ Selected' : 'Select Stylist'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })}
                      </ScrollView>
                    )}
                  </View>
                );
              })}

              <TouchableOpacity
                className={`py-4 rounded-xl mb-6 ${allGroupsHaveStaff ? 'bg-pink-600' : 'bg-gray-400'}`}
                onPress={handleContinueToConfirm}
                disabled={!allGroupsHaveStaff || isProcessing}>
                <Text className="text-white text-center font-semibold text-lg">Continue to Confirm</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Step 3: Confirm */}
          {bookingStep === 'confirm' && (
            <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
              <View className="bg-pink-50 rounded-xl p-4 mb-6">
                <Text className="text-gray-500 text-sm">Walk-in Summary</Text>
                <View className="mt-3">
                  <View className="flex-row justify-between items-center py-1">
                    <Text className="text-gray-600 text-sm">Customer</Text>
                    <Text className="text-gray-800 font-semibold">{customerName}</Text>
                  </View>

                  {groups.map((group, index) => (
                    <View key={group.key} className="py-2 border-t border-gray-200">
                      {hasMultipleGroups && (
                        <Text className="text-pink-500 text-[11px] font-semibold uppercase mb-1">
                          Group {index + 1} · {group.label}
                        </Text>
                      )}
                      <View className="flex-row justify-between items-start py-0.5">
                        <Text className="text-gray-600 text-sm">Service(s)</Text>
                        <Text className="text-gray-800 font-semibold flex-1 text-right ml-3">
                          {group.services.map(s => s.service_name).join(' + ')}
                        </Text>
                      </View>
                      <View className="flex-row justify-between items-center py-0.5">
                        <Text className="text-gray-600 text-sm">Stylist</Text>
                        <Text className="text-gray-800 font-semibold">{getStaffName(groupStaff[group.key])}</Text>
                      </View>
                      {hasMultipleGroups && (
                        <View className="flex-row justify-between items-center py-0.5">
                          <Text className="text-gray-600 text-sm">Subtotal</Text>
                          <Text className="text-gray-800 font-semibold">₱{getGroupTotal(group).toLocaleString()}</Text>
                        </View>
                      )}
                    </View>
                  ))}

                  <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                    <Text className="text-gray-600 text-sm">Total Price</Text>
                    <Text className="text-pink-600 font-bold text-lg">₱{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>
              </View>
              <View className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200">
                <View className="flex-row items-center">
                  <Ionicons name="information-circle-outline" size={20} color="#eab308" />
                  <Text className="text-yellow-700 text-sm ml-2 flex-1">
                    {selectedServiceIds.length > 1
                      ? 'Each selected service will be added as its own walk-in entry, marked as pending. You can update them later.'
                      : 'This walk-in will be marked as pending. You can update it later.'}
                  </Text>
                </View>
              </View>
              <View className="flex-row gap-3">
                <TouchableOpacity onPress={handleBackToStylist} className="flex-1 py-3 rounded-xl border border-gray-300">
                  <Text className="text-gray-600 text-center font-semibold">Back</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleConfirmWalkIn} disabled={isProcessing} className="flex-1 py-3 rounded-xl bg-pink-600">
                  <Text className="text-white text-center font-semibold">
                    {isProcessing ? 'Adding...' : 'Add Walk-in'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    );
  };

  // ─────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-gray-50 pt-12">
      {mainTab === 'landing' && renderLandingSection()}
      {mainTab === 'appointments' && renderAppointmentsSection()}
      {mainTab === 'walk-ins' && renderWalkInsSection()}

      {showAppointmentModal && selectedAppointment && <AppointmentDetailsModal />}
      {showPaymentProofModal && selectedPaymentData && <PaymentProofModal />}
    </View>
  );
}