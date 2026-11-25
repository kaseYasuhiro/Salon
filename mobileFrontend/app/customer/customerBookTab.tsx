import React, { useState, useEffect, useRef, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

interface ReceiptAppointment {
  groupLabel: string;
  serviceName: string;
  date: string;
  time: string;
  stylistName: string;
}

interface ReceiptData {
  bookingId: string;
  appointments: ReceiptAppointment[];
  totalAmount: number;
  paymentType: string;
  paymentMethod: string;
  amountPaid: number;
  remainingBalance: number;
  status: string;
  bookingDate: string;
  paymentProof?: string;
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
  user?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    profile_image?: string;
    active_status?: number;
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

interface Service {
  id: number;
  service_name: string;
  description: string;
  price: number;
  duration_minutes: number;
  service_status?: string;
  is_multitaskable: number;
  reqHairColor: number;
  service_specialties?: any[];
  service_price_adjustments?: PriceAdjustment[];
  created_at?: string;
  updated_at?: string;
}

interface PriceAdjustment {
  id: number;
  service_id: number;
  hair_length: string;
  hair_thickness: string;
  additional_price: string;
}

interface HairColor {
  id: number;
  color_name: string;
  color_code: string;
  is_active: number;
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
  comment?: string;
  created_at?: string;
}

interface Appointment {
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
  assigned_employee_id?: number;
  service_name: string;
  duration_minutes: number;
  price: string;
}

/**
 * Selected services are split into "groups".
 * Each group becomes its own appointment: its own stylist and its own date/time.
 *
 * - Multitaskable services of the same specialty share ONE group (one appointment).
 * - A non-multitaskable service always gets its OWN group, even if it shares a specialty
 *   with other selected services.
 */
interface ServiceGroup {
  key: string; // unique group id (a solo group looks like "stylist::solo-12")
  specialtyKey: string; // the real specialty ("stylist", "barber", ...)
  label: string;
  services: Service[];
}

interface GroupSchedule {
  date: Date; // UTC-midnight date (same format the calendar produces)
  time: string; // 'HH:mm'
}

interface CustomerBookingProps {
  onBookingSuccess?: () => void;
}

type BookingStep = 'services' | 'hair_options' | 'stylist' | 'datetime' | 'payment';

const DEFAULT_GROUP_KEY = 'stylist';

// ── Pure helpers (no component state) ──
const toDateStr = (date: Date): string =>
  `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;

// Calendar dates are UTC-midnight; rebuild as a local date so formatting never shifts the day.
const toLocalDate = (date: Date): Date =>
  new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());

const formatDateLong = (date: Date): string =>
  toLocalDate(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatTime12 = (time: string): string => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m || 0).padStart(2, '0')} ${suffix}`;
};

const timeToMinutes = (time: string): number => {
  const [h, m] = (time || '00:00').split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
};

const minutesToTime = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

// ── Stylist double-booking rules ──
// How a stylist's existing appointments block a new booking with that same stylist:
//   'same_services' – blocks the time only if the other appointment includes one of the SAME services
//   'any'           – blocks the time for ANY overlapping appointment with that stylist
type StylistConflictMode = 'same_services' | 'any';
const STYLIST_CONFLICT_MODE: StylistConflictMode = 'same_services';

// If an appointment has no duration on record, assume one time slot
const SLOT_FALLBACK_MINUTES = 30;

interface BusyBlock {
  start: number; // minutes from midnight
  end: number; // start + total duration of ALL services in that appointment
  serviceIds: number[];
}

// Groups /all-appointments rows (one row per service) into one busy block per appointment,
// indexed by "staffId|YYYY-MM-DD". Cancelled appointments don't block anything.
const buildBusyIndex = (appointments: Appointment[]): Map<string, BusyBlock[]> => {
  const perAppointment = new Map<
    string,
    { indexKey: string; start: number; duration: number; serviceIds: number[] }
  >();

  appointments.forEach((app) => {
    if (app.assigned_employee_id == null) return;
    if ((app.status || '').toString().toLowerCase() === 'cancelled') return;
    const dateStr = (app.appointment_date || '').slice(0, 10);
    if (!dateStr) return;

    const indexKey = `${Number(app.assigned_employee_id)}|${dateStr}`;
    const apptKey = `${indexKey}|${app.appointment_id ?? app.id}`;
    const duration = Number(app.duration_minutes) || 0;

    const existing = perAppointment.get(apptKey);
    if (existing) {
      existing.duration += duration;
      existing.serviceIds.push(app.service_id);
    } else {
      perAppointment.set(apptKey, {
        indexKey,
        start: timeToMinutes(app.appointment_time),
        duration,
        serviceIds: [app.service_id],
      });
    }
  });

  const index = new Map<string, BusyBlock[]>();
  perAppointment.forEach((a) => {
    const block: BusyBlock = {
      start: a.start,
      end: a.start + (a.duration > 0 ? a.duration : SLOT_FALLBACK_MINUTES),
      serviceIds: a.serviceIds,
    };
    const list = index.get(a.indexKey);
    if (list) list.push(block);
    else index.set(a.indexKey, [block]);
  });
  index.forEach((list) => list.sort((x, y) => x.start - y.start));
  return index;
};

// The stylist's busy blocks on a day that matter for the services being booked
const getRelevantBusyBlocks = (
  index: Map<string, BusyBlock[]>,
  staffId: number,
  dateStr: string,
  serviceIds: number[]
): BusyBlock[] => {
  const blocks = index.get(`${staffId}|${dateStr}`) || [];
  if (STYLIST_CONFLICT_MODE === 'same_services') return blocks;
  return blocks.filter((b) => b.serviceIds.some((id) => serviceIds.includes(id)));
};

// First existing appointment that overlaps [startMin, startMin + durationMin)
const findStylistConflict = (
  index: Map<string, BusyBlock[]>,
  staffId: number,
  dateStr: string,
  startMin: number,
  durationMin: number,
  serviceIds: number[]
): BusyBlock | null => {
  const endMin = startMin + durationMin;
  return (
    getRelevantBusyBlocks(index, staffId, dateStr, serviceIds).find(
      (b) => startMin < b.end && b.start < endMin
    ) || null
  );
};

export default function CustomerBooking({ onBookingSuccess }: CustomerBookingProps) {
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  // Per-group stylist and schedule, keyed by group key
  const [groupStaff, setGroupStaff] = useState<Record<string, number>>({});
  const [groupSchedule, setGroupSchedule] = useState<Record<string, GroupSchedule>>({});
  const [activeGroupKey, setActiveGroupKey] = useState<string | null>(null);

  const [showTimePickerModal, setShowTimePickerModal] = useState(false);
  const [selectedDateForModal, setSelectedDateForModal] = useState<Date | null>(null);
  const [bookingStep, setBookingStep] = useState<BookingStep>('services');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>('gcash');
  const [selectedPaymentType, setSelectedPaymentType] = useState<'downpayment' | 'full'>('downpayment');
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showReceipt, setShowReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptData | null>(null);

  // Tracks which groups were already submitted, so a retry after a partial failure doesn't double-book
  const submittedGroupsRef = useRef<Record<string, any>>({});

  const [selectedHairLength, setSelectedHairLength] = useState<string>('');
  const [selectedHairThickness, setSelectedHairThickness] = useState<string>('');
  const [selectedHairColor, setSelectedHairColor] = useState<number | null>(null);

  const [showHairColorModal, setShowHairColorModal] = useState(false);
  const [hairColorSearch, setHairColorSearch] = useState('');

  // Stylist "ratings & details" popup (which stylist, and which service group it was opened from)
  const [detailsTarget, setDetailsTarget] = useState<{ staffId: number; groupKey: string } | null>(null);

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSpecialties, setServiceSpecialties] = useState<any[]>([]);
  const [masterHairColors, setMasterHairColors] = useState<HairColor[]>([]);
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState<StaffFeedback[]>([]);
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [gcashNumber, setGcashNumber] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const { user } = useAuth();

  // Every stylist's existing appointments, grouped for fast lookups while rendering the calendar
  const busyIndex = useMemo(() => buildBusyIndex(allAppointments), [allAppointments]);

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

  // ── Fetchers ──
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) staffData = response.data;
      setStaff(staffData);
      return staffData;
    } catch (error) {
      return [];
    }
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
          reqHairColor: service.reqHairColor || 0,
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

  const fetchServiceSpecialties = async () => {
    try {
      const response = await api.get("/services/specialties");
      let specialtiesData: any[] = [];
      if (Array.isArray(response.data)) specialtiesData = response.data;
      setServiceSpecialties(specialtiesData);
      return specialtiesData;
    } catch (error) {
      return [];
    }
  };

  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      let schedulesData: BusinessSchedule[] = [];
      if (Array.isArray(response.data)) schedulesData = response.data;
      setBusinessSchedules(schedulesData);
      return schedulesData;
    } catch (error) {
      return [];
    }
  };

  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      let assignmentsData: StaffAssignment[] = [];
      if (Array.isArray(response.data)) assignmentsData = response.data;
      setStaffAssignments(assignmentsData);
      return assignmentsData;
    } catch (error) {
      return [];
    }
  };

  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get("/feedbacks/staff");
      let staffFeedbacksData: StaffFeedback[] = [];
      if (Array.isArray(response.data)) {
        staffFeedbacksData = response.data.map((item: any) => ({
          id: item.id || 0,
          staff_id: item.staff_id || 0,
          rating: parseFloat(item.rating) || 0,
          // The comment field name depends on your backend; the common ones are tried here
          comment: (item.comment ?? item.feedback ?? item.review ?? item.message ?? '').toString(),
          created_at: item.created_at || ''
        }));
      }
      setStaffFeedbacks(staffFeedbacksData);
      return staffFeedbacksData;
    } catch (error) {
      return [];
    }
  };

  const fetchAllAppointments = async () => {
    try {
      const response = await api.get('/all-appointments');
      let appointmentsData: Appointment[] = [];
      if (Array.isArray(response.data)) {
        appointmentsData = response.data.map((item: any) => ({
          id: item.id,
          appointment_id: item.appointment_id,
          service_id: item.service_id,
          customer_name: item.customer_name,
          customer_phone: item.customer_phone,
          customer_email: item.customer_email,
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time,
          status: item.status,
          service_status: item.service_status,
          assigned_employee_id: item.assigned_employee_id,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price
        }));
      }
      setAllAppointments(appointmentsData);
      return appointmentsData;
    } catch (error) {
      return [];
    }
  };

  const fetchHairColors = async () => {
    try {
      const response = await api.get('/haircolors');
      let colorsData: HairColor[] = [];
      if (Array.isArray(response.data)) {
        colorsData = response.data
          .filter((c: any) => c.is_active === 1 || c.is_active === true)
          .sort((a: HairColor, b: HairColor) =>
            (a.color_name || '').localeCompare(b.color_name || '')
          );
      }
      setMasterHairColors(colorsData);
      return colorsData;
    } catch (error) {
      return [];
    }
  };

  const fetchServicePriceAdjustments = async () => {
    try {
      const response = await api.get('/services/price/adjustment');
      let servicesWithAdjustments: Service[] = [];
      if (Array.isArray(response.data)) servicesWithAdjustments = response.data;

      setServices((prevServices: Service[]) => {
        return prevServices.map((service: Service) => {
          const serviceWithAdj = servicesWithAdjustments.find((s: Service) => s.id === service.id);
          if (serviceWithAdj) {
            return {
              ...service,
              service_price_adjustments: serviceWithAdj.service_price_adjustments || []
            };
          }
          return service;
        });
      });

      return servicesWithAdjustments;
    } catch (error) {
      return [];
    }
  };

  const fetchQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await api.get('/qr-code');
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
    }
  };

  const completeBooking = async (formData: FormData) => {
    const response = await api.post("/booking/complete", formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  };

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchStaff(),
      // price adjustments are merged into the services list, so they must run after services have loaded
      fetchServices().then(() => fetchServicePriceAdjustments()),
      fetchServiceSpecialties(),
      fetchBusinessSchedules(),
      fetchStaffAssignments(),
      fetchStaffFeedbacks(),
      fetchAllAppointments(),
      fetchHairColors(),
      fetchQrCode(),
    ]).finally(() => setIsLoading(false));
  }, []);

  // ── Schedule helpers ──
  const getScheduleForDate = (dateStr: string): BusinessSchedule | null => {
    return businessSchedules.find(schedule => schedule.business_date === dateStr) || null;
  };

  const getStaffAssignedToDate = (dateStr: string): StaffAssignment[] => {
    const schedule = getScheduleForDate(dateStr);
    if (!schedule) return [];
    return staffAssignments.filter(assignment => assignment.business_date_id === schedule.id);
  };

  const isStaffAvailableOnDate = (staffId: number, date: Date): boolean => {
    const assignedStaff = getStaffAssignedToDate(toDateStr(date));
    return assignedStaff.some(assignment => assignment.staff_id === staffId);
  };

  const getScheduleStatus = (date: Date): { status: 'open' | 'closed' | 'no_schedule'; schedule: BusinessSchedule | null } => {
    const schedule = getScheduleForDate(toDateStr(date));
    if (!schedule) return { status: 'no_schedule', schedule: null };
    if (schedule.is_open === 1) return { status: 'open', schedule };
    return { status: 'closed', schedule };
  };

  // ── Specialty / service helpers ──
  // ✅ A service is bookable only when it's active AND has at least one specialty assigned.
  const getActiveServices = () => {
    return services.filter((service) => {
      if (service.service_status !== 'active') return false;
      // A service with no specialty can't be routed to a stylist — hide it
      return getServiceSpecialties(service.id).length > 0;
    });
  };

  const getActiveStaff = (): StaffMember[] => {
    return staff.filter((member) => isStaffActive(member));
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

  const getServiceSpecialties = (serviceId: number) => {
    return serviceSpecialties.filter(item => item.service_id === serviceId);
  };

  /**
   * A service belongs to ONE specialty, based on its first listed specialty.
   * Returns null when the service has no specialty — such services are not bookable
   * because we can't determine which staff can perform them.
   */
  const getServiceGroupInfo = (
    serviceId: number
  ): { key: string; label: string } | null => {
    const names: string[] = getServiceSpecialties(serviceId)
      .map((ss: any) => ss?.specialties?.specialty_name)
      .filter(Boolean);

    const first = names[0];
    if (!first) return null;

    const key = resolveSpecialtyKey(first);
    return { key, label: key === 'stylist' ? 'Stylist' : first.trim() };
  };

  // Active staff who can perform a specialty (pass a group's specialtyKey, NOT its unique key)
  const getEligibleStaffForGroup = (specialtyKey: string): StaffMember[] => {
    return getActiveStaff().filter((member) => {
      const keys = (member.staff_specialties || [])
        .filter(s => s.is_active === 1)
        .map(s => resolveSpecialtyKey(s.specialties?.specialty_name))
        .filter(Boolean);

      if (keys.includes(specialtyKey)) return true;
      // Legacy rule: stylists may also take any non-barber service.
      // Delete this line if you want strict specialty matching only.
      if (keys.includes('stylist') && specialtyKey !== 'barber') return true;
      return false;
    });
  };

  // Only show services that are active, have a specialty, and can be handled by at least one active stylist
  const getBookableServices = (): Service[] => {
    return getActiveServices().filter((service) => {
      const info = getServiceGroupInfo(service.id);
      if (!info) return false;
      return getEligibleStaffForGroup(info.key).length > 0;
    });
  };

  // Sections shown on the services step (one per specialty)
  const getServiceSections = (): ServiceGroup[] => {
    const map = new Map<string, ServiceGroup>();
    getBookableServices().forEach((service) => {
      const info = getServiceGroupInfo(service.id);
      if (!info) return;
      const { key, label } = info;
      if (!map.has(key)) map.set(key, { key, specialtyKey: key, label, services: [] });
      map.get(key)!.services.push(service);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  };

  const getSelectedServices = (): Service[] =>
    services.filter((s) => selectedServiceIds.includes(s.id));

  /**
   * Splits the selected services into appointments (groups).
   * - Multitaskable services share ONE appointment per specialty.
   * - A non-multitaskable service always gets its own appointment (its own stylist + time),
   *   even when other selected services share its specialty.
   */
  const getSelectedGroups = (): ServiceGroup[] => {
    const map = new Map<string, ServiceGroup>();
    getSelectedServices().forEach((service) => {
      const info = getServiceGroupInfo(service.id);
      if (!info) return;

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

  /**
   * Why a service can't be added right now (null = it can).
   * Combining is no longer restricted: non-multitaskable services simply become
   * their own appointment. The only blocker is a service with no specialty.
   */
  const getServiceBlockReason = (service: Service): string | null => {
    if (selectedServiceIds.includes(service.id)) return null;
    const info = getServiceGroupInfo(service.id);
    if (!info) return 'This service has no specialty assigned';
    return null;
  };

  const doesServiceRequireHairColor = (serviceId: number): boolean => {
    const service = services.find((s: Service) => s.id === serviceId);
    return service?.reqHairColor === 1;
  };

  const getPriceAdjustmentsForService = (serviceId: number): PriceAdjustment[] => {
    const service = services.find((s: Service) => s.id === serviceId);
    return service?.service_price_adjustments || [];
  };

  const needsHairOptions = (): boolean => {
    const requiresHairColor = selectedServiceIds.some((id) => doesServiceRequireHairColor(id));
    const hasPriceAdjustments = selectedServiceIds.some((id) => getPriceAdjustmentsForService(id).length > 0);
    return requiresHairColor || hasPriceAdjustments;
  };

  const calculatePriceWithAdjustments = (serviceId: number, hairLength: string, hairThickness: string): number => {
    const service = services.find((s: Service) => s.id === serviceId);
    if (!service) return 0;

    const adjustments = service.service_price_adjustments || [];
    const matchingAdjustment = adjustments.find(
      (adj: PriceAdjustment) => adj.hair_length === hairLength && adj.hair_thickness === hairThickness
    );

    const additionalPrice = matchingAdjustment ? parseFloat(matchingAdjustment.additional_price) : 0;
    return service.price + additionalPrice;
  };

  const getGroupTotal = (group: ServiceGroup): number =>
    group.services.reduce(
      (sum, s) => sum + calculatePriceWithAdjustments(s.id, selectedHairLength, selectedHairThickness),
      0
    );

  const getGroupDuration = (group: ServiceGroup): number =>
    group.services.reduce((sum, s) => sum + s.duration_minutes, 0);

  const getTotalPriceWithAdjustments = (): number =>
    getSelectedServices().reduce(
      (sum, s) => sum + calculatePriceWithAdjustments(s.id, selectedHairLength, selectedHairThickness),
      0
    );

  const getServicePrice = () =>
    getSelectedServices().reduce((sum, s) => sum + s.price, 0);

  const getTotalDuration = () =>
    getSelectedServices().reduce((sum, s) => sum + s.duration_minutes, 0);

  const getServiceNames = () =>
    getSelectedServices().map(s => s.service_name).join(' + ');

  const getPaymentTypeLabel = () => {
    return selectedPaymentType === 'full' ? 'Full Payment' : 'Downpayment (50%)';
  };

  // ── Calendar helpers ──
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const lastDay = new Date(Date.UTC(year, month + 1, 0));
    const daysInMonth = lastDay.getUTCDate();
    const startingDayOfWeek = firstDay.getUTCDay();

    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(Date.UTC(year, month, i)));
    return days;
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const changeMonth = (increment: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return dateUTC.getTime() === todayUTC.getTime();
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return dateUTC < todayUTC;
  };

  const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
    const slots: string[] = [];
    const startHour = parseInt(openTime.split(':')[0]);
    const startMinute = parseInt(openTime.split(':')[1]);
    const endHour = parseInt(closeTime.split(':')[0]);
    const endMinute = parseInt(closeTime.split(':')[1]);

    let currentHour = startHour;
    let currentMinute = startMinute;

    while (currentHour < endHour || (currentHour === endHour && currentMinute < endMinute)) {
      const hourStr = String(currentHour).padStart(2, '0');
      const minuteStr = String(currentMinute).padStart(2, '0');
      slots.push(`${hourStr}:${minuteStr}`);

      currentMinute += 30;
      if (currentMinute >= 60) {
        currentMinute = 0;
        currentHour++;
      }
    }
    return slots;
  };

  const isPastSlotOnToday = (date: Date, slotTime: string): boolean => {
    if (!isToday(date)) return false;

    const now = new Date();
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const slotStart = timeToMinutes(slotTime);

    return slotStart <= nowMinutes;
  };

  const isTimeSlotTakenByBarber = (date: Date, time: string): boolean => {
    const dateStr = toDateStr(date);

    return allAppointments.some((app) => {
      if (app.status === 'cancelled') return false;
      if (app.appointment_date !== dateStr) return false;

      const normalize = (t: string) => (t || '').slice(0, 5);
      return normalize(app.appointment_time) === normalize(time);
    });
  };

  const getTimeSlotsForDate = (date: Date): string[] => {
    const scheduleStatus = getScheduleStatus(date);
    if (scheduleStatus.status !== 'open' || !scheduleStatus.schedule) return [];

    const { open_time, close_time } = scheduleStatus.schedule;
    return generateTimeSlots(open_time, close_time);
  };

  // The stylist's existing appointment that would overlap this time (see STYLIST_CONFLICT_MODE)
  const getStylistConflict = (
    staffId: number | undefined,
    date: Date,
    time: string,
    group: ServiceGroup | null | undefined
  ): BusyBlock | null => {
    if (!staffId || !group) return null;
    return findStylistConflict(
      busyIndex,
      staffId,
      toDateStr(date),
      timeToMinutes(time),
      getGroupDuration(group),
      group.services.map((s) => s.id)
    );
  };

  // The customer can't be in two places at once: block times that overlap another group's chosen time.
  const hasConflictWithOtherGroups = (date: Date, time: string, groupKey: string): boolean => {
    const allGroups = getSelectedGroups();
    const myGroup = allGroups.find((g) => g.key === groupKey);
    if (!myGroup) return false;

    const start = timeToMinutes(time);
    const end = start + getGroupDuration(myGroup);
    const dateStr = toDateStr(date);

    return Object.entries(groupSchedule).some(([key, sched]) => {
      if (key === groupKey) return false;
      const other = allGroups.find((g) => g.key === key);
      if (!other) return false;
      if (toDateStr(sched.date) !== dateStr) return false;

      const otherStart = timeToMinutes(sched.time);
      const otherEnd = otherStart + getGroupDuration(other);
      return start < otherEnd && otherStart < end;
    });
  };

  // Barber appointments allow 1 booking per slot; every group must also avoid overlapping other groups
  const isSlotBlockedForGroup = (date: Date, time: string, groupKey: string): boolean => {
    const group = getSelectedGroups().find((g) => g.key === groupKey);
    if (group?.specialtyKey === 'barber' && isTimeSlotTakenByBarber(date, time)) return true;
    // The chosen stylist already has an overlapping appointment
    if (getStylistConflict(groupStaff[groupKey], date, time, group)) return true;
    return hasConflictWithOtherGroups(date, time, groupKey);
  };

  const isDateBookable = (date: Date, groupKey: string): boolean => {
    const schedule = getScheduleForDate(toDateStr(date));
    if (!schedule) return false;
    if (schedule.is_open !== 1) return false;

    const slots = generateTimeSlots(schedule.open_time, schedule.close_time);
    return slots.some((t) => {
      if (isPastSlotOnToday(date, t)) return false;
      if (isSlotBlockedForGroup(date, t, groupKey)) return false;
      return true;
    });
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'image/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setPaymentProof({
          uri: asset.uri,
          name: asset.name || `payment_${Date.now()}.jpg`,
          type: asset.mimeType || 'image/jpeg',
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const getStaffName = (staffId: number | null | undefined) => {
    if (!staffId) return '';
    const staffMember = staff.find(s => s.id === staffId);
    return staffMember ? `${staffMember.first_name} ${staffMember.last_name}` : '';
  };

  const getStaffSpecialties = (staffId: number | null) => {
    if (!staffId) return 'No specialties assigned';
    const staffMember = staff.find(s => s.id === staffId);
    if (!staffMember?.staff_specialties) return 'No specialties assigned';

    return staffMember.staff_specialties
      .filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name || '')
      .filter(Boolean)
      .join(', ');
  };

  const getSelectedHairColorObject = (): HairColor | null => {
    if (!selectedHairColor) return null;
    return masterHairColors.find(c => c.id === selectedHairColor) || null;
  };

  const generateReceiptNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RCP-${year}${month}${day}-${random}`;
  };

  const getStaffRating = (staffId: number) => {
    try {
      const staffReviews = staffFeedbacks.filter(f => f.staff_id === staffId);
      if (staffReviews.length === 0) return { average: 0, count: 0 };

      const total = staffReviews.reduce((sum, feedback) => {
        const rating = typeof feedback.rating === 'number' ? feedback.rating : parseFloat(feedback.rating as any) || 0;
        return sum + rating;
      }, 0);

      const average = parseFloat((total / staffReviews.length).toFixed(1));
      return { average, count: staffReviews.length };
    } catch (error) {
      return { average: 0, count: 0 };
    }
  };

  // ── Stylist card details ──
  // A day counts as "available" when the salon is open, the stylist is assigned,
  // and at least one time slot is still free.
  const hasOpenSlot = (date: Date, groupKey: string, staffId?: number): boolean => {
    const schedule = getScheduleForDate(toDateStr(date));
    if (!schedule || schedule.is_open !== 1) return false;

    const group = getSelectedGroups().find((g) => g.key === groupKey) ?? null;
    const isBarber = group?.specialtyKey === 'barber';

    return generateTimeSlots(schedule.open_time, schedule.close_time).some((t) => {
      if (isPastSlotOnToday(date, t)) return false;
      if (isBarber && isTimeSlotTakenByBarber(date, t)) return false;
      if (staffId && getStylistConflict(staffId, date, t, group)) return false;
      return true;
    });
  };

  const getNextAvailableDate = (staffId: number, groupKey: string, daysAhead = 60): Date | null => {
    const now = new Date();
    for (let i = 0; i < daysAhead; i++) {
      const date = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() + i));
      // Cheap check first so we only look at slots on days the stylist actually works
      if (!isStaffAvailableOnDate(staffId, date)) continue;
      if (hasOpenSlot(date, groupKey, staffId)) return date;
    }
    return null;
  };

  const getNextAvailableInfo = (staffId: number, groupKey: string): { text: string; isToday: boolean } => {
    const date = getNextAvailableDate(staffId, groupKey);
    if (!date) return { text: 'No upcoming availability', isToday: false };
    if (isToday(date)) return { text: 'Available today', isToday: true };
    const label = toLocalDate(date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
    return { text: `Next available: ${label}`, isToday: false };
  };

  // Unique completed appointments handled by this stylist (/all-appointments has one row per service)
  const getCompletedAppointmentsCount = (staffId: number): number => {
    const ids = new Set<number>();
    allAppointments.forEach((app) => {
      if (Number(app.assigned_employee_id) === staffId && app.status === 'completed') {
        ids.add(app.appointment_id ?? app.id);
      }
    });
    return ids.size;
  };

  const formatCompletedLabel = (count: number): string => {
    if (count === 0) return 'No completed appointments yet';
    if (count >= 10) return `${Math.floor(count / 10) * 10}+ appointments completed`;
    return `${count} appointment${count === 1 ? '' : 's'} completed`;
  };

  const getRatingBreakdown = (staffId: number) => {
    const reviews = staffFeedbacks.filter((f) => f.staff_id === staffId && f.rating > 0);
    const total = reviews.length;
    const counts: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const star = Math.min(5, Math.max(1, Math.round(r.rating)));
      counts[star] += 1;
    });
    return {
      total,
      rows: [5, 4, 3, 2, 1].map((star) => ({
        star,
        count: counts[star],
        percent: total > 0 ? Math.round((counts[star] / total) * 100) : 0,
      })),
    };
  };

  // Newest written reviews (only ones that actually have a comment)
  const getRecentReviews = (staffId: number, limit = 5): StaffFeedback[] => {
    return staffFeedbacks
      .filter((f) => f.staff_id === staffId && !!f.comment && f.comment.trim().length > 0)
      .sort((a, b) => {
        const aTime = a.created_at ? new Date(a.created_at).getTime() : 0;
        const bTime = b.created_at ? new Date(b.created_at).getTime() : 0;
        return bTime - aTime;
      })
      .slice(0, limit);
  };

  const renderStars = (rating: number) => {
    const validRating = typeof rating === 'number' && !isNaN(rating) ? rating : 0;
    const fullStars = Math.floor(validRating);
    const hasHalfStar = validRating % 1 >= 0.5;
    const stars = [];

    for (let i = 0; i < fullStars; i++) {
      stars.push(<Ionicons key={`star-${i}`} name="star" size={14} color="#fbbf24" />);
    }
    if (hasHalfStar) {
      stars.push(<Ionicons key="half-star" name="star-half" size={14} color="#fbbf24" />);
    }
    const emptyStars = 5 - stars.length;
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<Ionicons key={`empty-star-${i}`} name="star-outline" size={14} color="#d1d5db" />);
    }
    return stars;
  };

  const filteredHairColors = masterHairColors.filter(color => {
    if (!hairColorSearch.trim()) return true;
    const term = hairColorSearch.toLowerCase();
    return (
      (color.color_name || '').toLowerCase().includes(term) ||
      (color.color_code || '').toLowerCase().includes(term)
    );
  });

  // ── Derived booking state ──
  const groups = getSelectedGroups();
  const activeGroup: ServiceGroup | null =
    groups.find((g) => g.key === activeGroupKey) ?? groups[0] ?? null;
  const allGroupsHaveStaff = groups.length > 0 && groups.every((g) => !!groupStaff[g.key]);
  const allGroupsScheduled = groups.length > 0 && groups.every((g) => !!groupSchedule[g.key]);

  // ── Handlers ──
  const handleServiceSelect = (serviceId: number) => {
    // Any change to the selection invalidates chosen times (durations / conflicts change)
    const resetSchedules = () => setGroupSchedule({});

    if (selectedServiceIds.includes(serviceId)) {
      setSelectedServiceIds(selectedServiceIds.filter(id => id !== serviceId));
      resetSchedules();
      return;
    }

    const service = services.find(s => s.id === serviceId);
    if (!service) return;

    const reason = getServiceBlockReason(service);
    if (reason) {
      Alert.alert("Service Unavailable", `${reason}.`);
      return;
    }

    setSelectedServiceIds([...selectedServiceIds, serviceId]);
    resetSchedules();
  };

  const handleContinueToHairOptions = () => {
    if (selectedServiceIds.length === 0) {
      Alert.alert("Selection Required", "Please select at least one service.");
      return;
    }

    setBookingStep(needsHairOptions() ? 'hair_options' : 'stylist');
  };

  const handleContinueToStylist = () => {
    const hasPriceAdjustments = selectedServiceIds.some((id: number) => getPriceAdjustmentsForService(id).length > 0);

    if (hasPriceAdjustments && (!selectedHairLength || !selectedHairThickness)) {
      Alert.alert("Selection Required", "Please select your hair length and thickness for price adjustments.");
      return;
    }

    const requiresHairColor = selectedServiceIds.some((id: number) => doesServiceRequireHairColor(id));
    if (requiresHairColor && !selectedHairColor) {
      Alert.alert("Selection Required", "Please select a hair color for your service.");
      return;
    }

    setBookingStep('stylist');
  };

  const handleStaffSelectForGroup = (groupKey: string, staffId: number) => {
    const target = staff.find((s) => s.id === staffId);
    if (!target || !isStaffActive(target)) {
      Alert.alert(
        "Staff Unavailable",
        "This stylist is currently unavailable. Please select another stylist."
      );
      return;
    }

    setGroupStaff((prev) => ({ ...prev, [groupKey]: staffId }));
    // Availability depends on the stylist, so clear this group's time
    setGroupSchedule((prev) => {
      const next = { ...prev };
      delete next[groupKey];
      return next;
    });
  };

  const handleContinueToDateTime = () => {
    for (const group of groups) {
      const staffId = groupStaff[group.key];
      if (!staffId) {
        Alert.alert("Selection Required", `Please select a stylist for ${group.label}.`);
        return;
      }
      const target = staff.find((s) => s.id === staffId);
      if (!target || !isStaffActive(target)) {
        Alert.alert("Staff Unavailable", `The stylist for ${group.label} is no longer available. Please choose another.`);
        setGroupStaff((prev) => {
          const next = { ...prev };
          delete next[group.key];
          return next;
        });
        return;
      }
    }

    const firstPending = groups.find((g) => !groupSchedule[g.key]) ?? groups[0];
    setActiveGroupKey(firstPending?.key ?? null);
    // Make sure the calendar reflects the latest bookings
    fetchAllAppointments();
    setBookingStep('datetime');
  };

  const handleDateSelect = (date: Date) => {
    if (!activeGroup) return;
    const staffId = groupStaff[activeGroup.key];

    if (isPastDate(date)) {
      Alert.alert("Invalid Date", "Cannot select past dates. Please choose today or a future date.");
      return;
    }

    if (!isDateBookable(date, activeGroup.key)) {
      const scheduleStatus = getScheduleStatus(date);
      if (scheduleStatus.status === 'no_schedule') {
        Alert.alert("No Schedule", "This date has no business schedule set. Please select another date.");
      } else if (scheduleStatus.status === 'closed') {
        Alert.alert("Salon Closed", "The salon is closed on this date. Please select another date.");
      } else {
        Alert.alert("No Available Slots", "No available time slots for this date. Please select another date.");
      }
      return;
    }

    if (!staffId || !isStaffAvailableOnDate(staffId, date)) {
      Alert.alert("Staff Not Available", "The selected stylist is not available on this date. Please select another date.");
      return;
    }

    setSelectedDateForModal(date);
    setShowTimePickerModal(true);
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDateForModal || !activeGroup) return;

    if (isPastSlotOnToday(selectedDateForModal, time)) {
      Alert.alert(
        "Time Has Passed",
        "This time slot has already passed. Please choose a later time."
      );
      return;
    }

    const stylistConflict = getStylistConflict(
      groupStaff[activeGroup.key],
      selectedDateForModal,
      time,
      activeGroup
    );
    if (stylistConflict) {
      Alert.alert(
        "Stylist Not Available",
        `${getStaffName(groupStaff[activeGroup.key])} already has an appointment until ${formatTime12(
          minutesToTime(stylistConflict.end)
        )}. You can book right after that time.`
      );
      return;
    }

    if (hasConflictWithOtherGroups(selectedDateForModal, time, activeGroup.key)) {
      Alert.alert(
        "Schedule Conflict",
        "This time overlaps with another appointment you're booking. Please choose a different time."
      );
      return;
    }

    const nextSchedule: Record<string, GroupSchedule> = {
      ...groupSchedule,
      [activeGroup.key]: { date: selectedDateForModal, time },
    };
    setGroupSchedule(nextSchedule);
    setShowTimePickerModal(false);
    setSelectedDateForModal(null);

    // Move on to the next group that still needs a time; otherwise go to payment
    const nextPending = groups.find((g) => !nextSchedule[g.key]);
    if (nextPending) {
      setActiveGroupKey(nextPending.key);
    } else {
      setBookingStep('payment');
    }
  };

  const handleConfirmBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Selection Required", "Please select a payment method.");
      return;
    }

    if (groups.length === 0) {
      Alert.alert("Selection Required", "Please select at least one service.");
      setBookingStep('services');
      return;
    }

    // Re-validate every group before sending anything
    for (const group of groups) {
      const staffId = groupStaff[group.key];
      const targetStaff = staffId ? staff.find((s) => s.id === staffId) : null;
      if (!staffId || !targetStaff || !isStaffActive(targetStaff)) {
        Alert.alert(
          "Staff Unavailable",
          `The stylist for ${group.label} is no longer available. Please choose another stylist.`
        );
        setGroupStaff((prev) => {
          const next = { ...prev };
          delete next[group.key];
          return next;
        });
        setBookingStep('stylist');
        return;
      }

      const sched = groupSchedule[group.key];
      if (!sched) {
        Alert.alert("Selection Required", `Please choose a date and time for ${group.label}.`);
        setActiveGroupKey(group.key);
        setBookingStep('datetime');
        return;
      }

      if (isPastSlotOnToday(sched.date, sched.time)) {
        Alert.alert(
          "Time Has Passed",
          `The selected time for ${group.label} has already passed. Please choose a later time.`
        );
        setGroupSchedule((prev) => {
          const next = { ...prev };
          delete next[group.key];
          return next;
        });
        setActiveGroupKey(group.key);
        setBookingStep('datetime');
        return;
      }
    }

    if (!paymentProof) {
      Alert.alert("Upload Required", "Please upload your GCash payment receipt as proof of payment.");
      return;
    }

    setIsProcessing(true);
    const results = submittedGroupsRef.current;

    try {
      // Re-check each stylist's schedule with fresh data, in case someone booked while this customer was checking out
      const freshAppointments = await fetchAllAppointments();
      const freshIndex = buildBusyIndex(freshAppointments);
      for (const group of groups) {
        if (results[group.key]) continue; // already booked on a previous attempt (would conflict with itself)

        const sched = groupSchedule[group.key];
        const staffId = groupStaff[group.key];
        const conflict = findStylistConflict(
          freshIndex,
          staffId,
          toDateStr(sched.date),
          timeToMinutes(sched.time),
          getGroupDuration(group),
          group.services.map((s) => s.id)
        );

        if (conflict) {
          Alert.alert(
            "Time No Longer Available",
            `${getStaffName(staffId)} was just booked for this time (until ${formatTime12(
              minutesToTime(conflict.end)
            )}). Please choose a different time for ${group.label}.`
          );
          setGroupSchedule((prev) => {
            const next = { ...prev };
            delete next[group.key];
            return next;
          });
          setActiveGroupKey(group.key);
          setBookingStep('datetime');
          return;
        }
      }

      const totalAmount = getTotalPriceWithAdjustments();
      const amountToPay = selectedPaymentType === 'full' ? totalAmount : totalAmount / 2;

      // One booking request per group (each group = its own stylist + time).
      // Each request carries that group's share of the total and the same payment proof.
      for (const group of groups) {
        if (results[group.key]) continue; // already booked on a previous attempt

        const sched = groupSchedule[group.key];
        const staffId = groupStaff[group.key];
        const groupTotal = getGroupTotal(group);

        const formData = new FormData();
        formData.append('appointment_date', toDateStr(sched.date));
        formData.append('appointment_time', sched.time);
        formData.append('status', 'pending');

        group.services.forEach((service) => {
          formData.append('service_ids[]', service.id.toString());
        });

        formData.append('assigned_employee_id', staffId.toString());
        formData.append('service_status', 'pending');

        formData.append('total_amount', groupTotal.toString());
        formData.append('payment_type', selectedPaymentType === 'full' ? 'full' : 'downpayment');
        formData.append('payment_method', selectedPaymentMethod || 'gcash');
        formData.append('customer_id', user?.id?.toString() || '0');

        if (selectedHairLength) formData.append('hair_length', selectedHairLength);
        if (selectedHairThickness) formData.append('hair_thickness', selectedHairThickness);
        if (selectedHairColor) {
          const color = masterHairColors.find((c: HairColor) => c.id === selectedHairColor);
          if (color) formData.append('preferred_color', color.color_name);
        }

        formData.append('payment_proof', {
          uri: paymentProof.uri,
          name: paymentProof.name,
          type: paymentProof.type,
        } as any);

        results[group.key] = await completeBooking(formData);
      }

      const receiptNumber = generateReceiptNumber();
      const appointmentIds = groups
        .map((g) => results[g.key]?.appointment_id)
        .filter((id) => id !== undefined && id !== null);

      const receipt: ReceiptData = {
        bookingId: appointmentIds.length > 0 ? appointmentIds.join(', ') : receiptNumber,
        appointments: groups.map((group) => ({
          groupLabel: group.label,
          serviceName: group.services.map((s) => s.service_name).join(' + '),
          date: formatDateLong(groupSchedule[group.key].date),
          time: formatTime12(groupSchedule[group.key].time),
          stylistName: getStaffName(groupStaff[group.key]),
        })),
        totalAmount: totalAmount,
        paymentType: getPaymentTypeLabel(),
        paymentMethod: 'GCash',
        amountPaid: amountToPay,
        remainingBalance: totalAmount - amountToPay,
        status: 'Pending Confirmation',
        bookingDate: new Date().toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        }),
        paymentProof: paymentProof?.uri
      };

      setReceiptData(receipt);
      setShowReceipt(true);

    } catch (error: any) {
      const bookedCount = groups.filter((g) => results[g.key]).length;
      const partialNote =
        bookedCount > 0
          ? `\n\n${bookedCount} of ${groups.length} appointment(s) were already booked. Tap "Confirm Booking" again to retry the remaining one(s).`
          : '';

      if (error.response?.data?.errors) {
        const errorMessages = Object.values(error.response.data.errors).flat().join('\n');
        Alert.alert("Validation Error", `${errorMessages}${partialNote}`);
      } else {
        const errorMessage = error.response?.data?.message || error.message || "Failed to complete booking. Please try again.";
        Alert.alert("Error", `${errorMessage}${partialNote}`);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCloseReceipt = () => {
    setShowReceipt(false);
    setBookingStep('services');
    setSelectedServiceIds([]);
    setGroupStaff({});
    setGroupSchedule({});
    setActiveGroupKey(null);
    setSelectedPaymentMethod('gcash');
    setSelectedPaymentType('downpayment');
    setPaymentProof(null);
    setSelectedHairLength('');
    setSelectedHairThickness('');
    setSelectedHairColor(null);
    submittedGroupsRef.current = {};
    if (onBookingSuccess) onBookingSuccess();
  };

  const handleBack = () => {
    switch (bookingStep) {
      case 'payment':
        setBookingStep('datetime');
        break;
      case 'datetime':
        setBookingStep('stylist');
        break;
      case 'stylist':
        setBookingStep(needsHairOptions() ? 'hair_options' : 'services');
        break;
      case 'hair_options':
        setBookingStep('services');
        break;
      default:
        break;
    }
  };

  const getBackLabel = () => {
    switch (bookingStep) {
      case 'payment': return 'Back to Date & Time';
      case 'datetime': return 'Back to Stylists';
      case 'stylist': return needsHairOptions() ? 'Back to Hair Options' : 'Back to Services';
      case 'hair_options': return 'Back to Services';
      default: return '';
    }
  };

  // ── Hair Color Picker Modal ──
  const HairColorPickerModal = () => {
    if (!showHairColorModal) return null;

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showHairColorModal}
        onRequestClose={() => {
          setShowHairColorModal(false);
          setHairColorSearch('');
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%' }}>
            <View className="px-6 pt-5 pb-3 border-b border-gray-100 flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-800">Select Hair Color</Text>
                <Text className="text-xs text-gray-500 mt-0.5">
                  {masterHairColors.length} color{masterHairColors.length !== 1 ? 's' : ''} available
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowHairColorModal(false);
                  setHairColorSearch('');
                }}
                className="p-1"
              >
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <View className="px-6 pt-4 pb-2">
              <View className="flex-row items-center bg-gray-50 rounded-xl px-3 py-2 border border-gray-200">
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                  value={hairColorSearch}
                  onChangeText={setHairColorSearch}
                  placeholder="Search color by name or hex..."
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  autoCorrect={false}
                  className="flex-1 ml-2 text-sm text-gray-800"
                />
                {hairColorSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setHairColorSearch('')}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                )}
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 12, paddingBottom: 20 }}
              style={{ maxHeight: 460 }}
              keyboardShouldPersistTaps="handled"
            >
              {filteredHairColors.length === 0 ? (
                <View className="py-12 items-center">
                  <Ionicons name="color-palette-outline" size={48} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">
                    {masterHairColors.length === 0
                      ? 'No colors available right now'
                      : 'No colors match your search'}
                  </Text>
                </View>
              ) : (
                <View className="flex-row flex-wrap" style={{ marginHorizontal: -6 }}>
                  {filteredHairColors.map((color) => {
                    const isSelected = selectedHairColor === color.id;
                    return (
                      <View key={color.id} style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}>
                        <TouchableOpacity
                          onPress={() => setSelectedHairColor(color.id)}
                          activeOpacity={0.8}
                          className={`rounded-2xl p-3 border-2 ${
                            isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                          }`}
                        >
                          <View className="items-center mb-2">
                            <View
                              className={`w-14 h-14 rounded-full border-2 ${
                                isSelected ? 'border-pink-500' : 'border-gray-200'
                              }`}
                              style={{ backgroundColor: color.color_code || '#808080' }}
                            />
                          </View>
                          <Text
                            className={`text-xs font-semibold text-center ${
                              isSelected ? 'text-pink-600' : 'text-gray-800'
                            }`}
                            numberOfLines={1}
                          >
                            {color.color_name}
                          </Text>
                          <Text className="text-[10px] text-gray-400 text-center font-mono mt-0.5">
                            {color.color_code}
                          </Text>
                          {isSelected && (
                            <View className="items-center mt-1">
                              <Ionicons name="checkmark-circle" size={16} color="#ec4899" />
                            </View>
                          )}
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>

            <View className="px-6 py-4 border-t border-gray-100">
              <TouchableOpacity
                onPress={() => {
                  setShowHairColorModal(false);
                  setHairColorSearch('');
                }}
                className="py-3 rounded-xl bg-pink-500"
              >
                <Text className="text-white text-center font-semibold">
                  {selectedHairColor ? 'Done' : 'Choose a color'}
                </Text>
              </TouchableOpacity>
              {selectedHairColor && (
                <TouchableOpacity
                  onPress={() => setSelectedHairColor(null)}
                  className="py-2 mt-2"
                >
                  <Text className="text-gray-500 text-center text-xs font-semibold">
                    Clear selection
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  // ── Time Picker Modal (for the active group) ──
  const TimePickerModal = () => {
    const rawTimeSlots = selectedDateForModal && activeGroup ? getTimeSlotsForDate(selectedDateForModal) : [];
    const isBarberGroup = activeGroup?.specialtyKey === 'barber';
    const groupDuration = activeGroup ? getGroupDuration(activeGroup) : 0;
    const activeSched = activeGroup ? groupSchedule[activeGroup.key] : undefined;

    const modalStylistId = activeGroup ? groupStaff[activeGroup.key] : undefined;
    const modalStylistName = getStaffName(modalStylistId);

    // The stylist's existing appointments on this day (with when each one ends)
    const stylistBusyBlocks =
      modalStylistId && activeGroup && selectedDateForModal
        ? getRelevantBusyBlocks(
            busyIndex,
            modalStylistId,
            toDateStr(selectedDateForModal),
            activeGroup.services.map((s) => s.id)
          )
        : [];

    const slotsWithStatus = rawTimeSlots.map((time) => {
      const isPast = selectedDateForModal ? isPastSlotOnToday(selectedDateForModal, time) : false;
      const isBooked =
        !isPast && isBarberGroup && selectedDateForModal
          ? isTimeSlotTakenByBarber(selectedDateForModal, time)
          : false;
      const isStylistBusy =
        !isPast && !isBooked && selectedDateForModal
          ? !!getStylistConflict(modalStylistId, selectedDateForModal, time, activeGroup)
          : false;
      const isConflict =
        !isPast && !isBooked && !isStylistBusy && selectedDateForModal && activeGroup
          ? hasConflictWithOtherGroups(selectedDateForModal, time, activeGroup.key)
          : false;
      return {
        time,
        isPast,
        isBooked,
        isStylistBusy,
        isConflict,
        isBlocked: isPast || isBooked || isStylistBusy || isConflict,
      };
    });

    const availableCount = slotsWithStatus.filter((s) => !s.isBlocked).length;
    const bookedCount = slotsWithStatus.filter((s) => s.isBooked).length;
    const stylistBusyCount = slotsWithStatus.filter((s) => s.isStylistBusy).length;
    const pastCount = slotsWithStatus.filter((s) => s.isPast).length;
    const conflictCount = slotsWithStatus.filter((s) => s.isConflict).length;
    const allBlocked = rawTimeSlots.length > 0 && availableCount === 0;

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showTimePickerModal}
        onRequestClose={() => {
          setShowTimePickerModal(false);
          setSelectedDateForModal(null);
        }}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">
                  Select Time for {selectedDateForModal ? toLocalDate(selectedDateForModal).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : ''}
                </Text>
                {activeGroup && (
                  <Text className="text-xs text-pink-500 mt-0.5">
                    {activeGroup.label}: {activeGroup.services.map(s => s.service_name).join(' + ')}
                  </Text>
                )}
                <Text className="text-xs text-gray-400">
                  Duration: {groupDuration} minutes
                </Text>
                {isBarberGroup && (
                  <Text className="text-[11px] text-pink-500 mt-1">
                    Barber services allow 1 booking per time slot
                  </Text>
                )}
              </View>
              <TouchableOpacity onPress={() => { setShowTimePickerModal(false); setSelectedDateForModal(null); }}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {stylistBusyBlocks.length > 0 && (
              <View className="mb-3 p-3 bg-orange-50 rounded-xl border border-orange-200">
                <Text className="text-orange-700 text-xs font-semibold mb-1">
                  {modalStylistName || 'This stylist'}{' '}
                  {STYLIST_CONFLICT_MODE === 'same_services'
                    ? 'already has an appointment for the same service on this day:'
                    : 'already has appointments on this day:'}
                </Text>
                {stylistBusyBlocks.map((block, i) => (
                  <Text key={i} className="text-orange-700 text-xs">
                    • {formatTime12(minutesToTime(block.start))} – {formatTime12(minutesToTime(block.end))}
                    {' '}({block.end - block.start} mins)
                  </Text>
                ))}
                <Text className="text-orange-600 text-[11px] mt-1">
                  You can book right after an appointment ends — pick a time at or after its end time.
                </Text>
              </View>
            )}

            {rawTimeSlots.length > 0 && (
              <View className="flex-row items-center flex-wrap gap-4 mb-3 pb-3 border-b border-gray-100">
                <View className="flex-row items-center gap-1">
                  <View className="w-3 h-3 rounded-full bg-green-500" />
                  <Text className="text-xs text-gray-600">Available ({availableCount})</Text>
                </View>
                {pastCount > 0 && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-gray-300" />
                    <Text className="text-xs text-gray-600">Past ({pastCount})</Text>
                  </View>
                )}
                {isBarberGroup && bookedCount > 0 && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-gray-400" />
                    <Text className="text-xs text-gray-600">Booked ({bookedCount})</Text>
                  </View>
                )}
                {stylistBusyCount > 0 && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-red-300" />
                    <Text className="text-xs text-gray-600">Stylist busy ({stylistBusyCount})</Text>
                  </View>
                )}
                {conflictCount > 0 && (
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-orange-300" />
                    <Text className="text-xs text-gray-600">Overlaps ({conflictCount})</Text>
                  </View>
                )}
              </View>
            )}

            {rawTimeSlots.length === 0 ? (
              <View className="py-8 items-center">
                <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-center mt-3">
                  No available time slots for this date
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="max-h-96">
                <View className="flex-row flex-wrap justify-between">
                  {slotsWithStatus.map(({ time, isBlocked, isBooked, isStylistBusy, isPast, isConflict }) => {
                    const isSelected =
                      !isBlocked &&
                      !!activeSched &&
                      !!selectedDateForModal &&
                      toDateStr(activeSched.date) === toDateStr(selectedDateForModal) &&
                      activeSched.time === time;

                    return (
                      <TouchableOpacity
                        key={time}
                        className={`w-[30%] py-3 mb-3 rounded-xl border-2 items-center relative ${
                          isSelected
                            ? 'border-pink-500'
                            : isBlocked
                              ? 'border-gray-200 bg-gray-100'
                              : 'border-gray-200'
                        }`}
                        style={{
                          backgroundColor: isSelected
                            ? '#ec4899'
                            : isBlocked
                              ? '#f3f4f6'
                              : 'white',
                        }}
                        onPress={() => !isBlocked && handleTimeSelect(time)}
                        disabled={isBlocked}
                        activeOpacity={isBlocked ? 1 : 0.7}
                      >
                        <Text
                          className={
                            isSelected
                              ? 'text-white font-bold'
                              : isBlocked
                                ? 'text-gray-400 line-through'
                                : 'text-gray-700'
                          }
                        >
                          {formatTime12(time)}
                        </Text>

                        {isPast && !isSelected && (
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons name="time-outline" size={10} color="#6b7280" />
                            <Text className="text-[9px] text-gray-500 ml-0.5 font-semibold">
                              Past
                            </Text>
                          </View>
                        )}

                        {isBooked && !isSelected && (
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons name="close-circle" size={10} color="#9ca3af" />
                            <Text className="text-[9px] text-gray-500 ml-0.5 font-semibold">
                              Booked
                            </Text>
                          </View>
                        )}

                        {isStylistBusy && !isSelected && (
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons name="person-remove-outline" size={10} color="#ef4444" />
                            <Text className="text-[9px] text-red-400 ml-0.5 font-semibold">
                              Stylist busy
                            </Text>
                          </View>
                        )}

                        {isConflict && !isSelected && (
                          <View className="flex-row items-center mt-0.5">
                            <Ionicons name="swap-horizontal" size={10} color="#fb923c" />
                            <Text className="text-[9px] text-orange-400 ml-0.5 font-semibold">
                              Overlaps
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            {allBlocked && (
              <View className="mt-4 p-3 bg-yellow-50 rounded-xl border border-yellow-200">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="information-circle-outline" size={16} color="#eab308" />
                  <Text className="text-yellow-700 text-xs flex-1">
                    No valid time slots for this date. Slots may be in the past, already taken with this stylist, or overlapping your other appointment. Please pick another date.
                  </Text>
                </View>
              </View>
            )}

            {availableCount > 0 && pastCount > 0 && (
              <Text className="text-gray-400 text-[10px] text-center mt-3">
                Times that have already passed today are not bookable.
              </Text>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ── Receipt Modal ──
  const ReceiptModal = () => {
    if (!receiptData) return null;

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={showReceipt}
        onRequestClose={handleCloseReceipt}
      >
        <View className="flex-1 justify-center items-center bg-black/50 p-4">
          <ScrollView className="max-h-[90%]" showsVerticalScrollIndicator={false}>
            <View className="bg-white rounded-2xl overflow-hidden w-full" style={{ minWidth: 320 }}>
              <View
                className="px-6 py-4 items-center"
                style={{ backgroundColor: '#ec4899' }}
              >
                <Text className="text-white text-2xl font-bold mb-1">Reshel Oco Hair Salon</Text>
                <Text className="text-white opacity-90 text-sm">Official Receipt</Text>
                <View
                  className="rounded-full px-3 py-1 mt-2"
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
                >
                  <Text className="text-white text-xs font-mono">{receiptData.bookingId}</Text>
                </View>
              </View>

              <View className="p-6">
                <View className="bg-yellow-50 rounded-xl p-3 mb-4 items-center border border-yellow-200">
                  <Text className="text-yellow-700 font-semibold text-sm">{receiptData.status}</Text>
                  <Text className="text-gray-500 text-xs mt-1">Thank you for booking with us!</Text>
                </View>

                <View className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="warning-outline" size={16} color="#ef4444" />
                    <Text className="text-red-600 text-xs flex-1 font-semibold">
                      No-Show Policy: Payments are non-refundable if you fail to show up for your scheduled appointment.
                      Please arrive on time.
                    </Text>
                  </View>
                </View>

                <View className="border-b border-gray-200 pb-3 mb-3">
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">
                    {receiptData.appointments.length > 1 ? 'Appointments' : 'Booking Details'}
                  </Text>
                  {receiptData.appointments.map((appt, index) => (
                    <View
                      key={`${appt.groupLabel}-${index}`}
                      className={index > 0 ? 'mt-3 pt-3 border-t border-dashed border-gray-200' : ''}
                    >
                      {receiptData.appointments.length > 1 && (
                        <Text className="text-pink-500 text-xs font-semibold mb-1">
                          Appointment {index + 1} · {appt.groupLabel}
                        </Text>
                      )}
                      <View className="space-y-2">
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600 text-sm">Service(s)</Text>
                          <Text className="text-gray-800 font-semibold text-sm flex-1 text-right ml-3">{appt.serviceName}</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600 text-sm">Date</Text>
                          <Text className="text-gray-800 text-sm">{appt.date}</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600 text-sm">Time</Text>
                          <Text className="text-gray-800 text-sm">{appt.time}</Text>
                        </View>
                        <View className="flex-row justify-between">
                          <Text className="text-gray-600 text-sm">Stylist</Text>
                          <Text className="text-gray-800 text-sm">{appt.stylistName}</Text>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>

                <View className="border-b border-gray-200 pb-3 mb-3">
                  <Text className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2">Payment Details</Text>
                  <View className="space-y-2">
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Total Amount</Text>
                      <Text className="text-gray-800 font-semibold text-sm">₱{receiptData.totalAmount.toLocaleString()}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Payment Type</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.paymentType}</Text>
                    </View>
                    <View className="flex-row justify-between">
                      <Text className="text-gray-600 text-sm">Payment Method</Text>
                      <Text className="text-gray-800 text-sm">{receiptData.paymentMethod}</Text>
                    </View>
                    <View className="flex-row justify-between pt-2 border-t border-dashed border-gray-200">
                      <Text className="text-gray-600 text-sm font-semibold">Amount Paid</Text>
                      <Text className="text-green-600 font-bold text-base">₱{receiptData.amountPaid.toLocaleString()}</Text>
                    </View>
                    {receiptData.remainingBalance > 0 && (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600 text-sm">Remaining Balance</Text>
                        <Text className="text-orange-600 font-semibold text-sm">₱{receiptData.remainingBalance.toLocaleString()}</Text>
                      </View>
                    )}
                    {receiptData.remainingBalance === 0 && (
                      <View className="flex-row justify-between">
                        <Text className="text-gray-600 text-sm">Remaining Balance</Text>
                        <Text className="text-green-600 font-semibold text-sm">₱0 (Paid in Full)</Text>
                      </View>
                    )}
                    {receiptData.paymentProof && (
                      <View className="flex-row justify-between pt-1">
                        <Text className="text-gray-600 text-sm">Payment Proof</Text>
                        <Text className="text-green-600 text-xs font-semibold">Uploaded ✓</Text>
                      </View>
                    )}
                  </View>
                </View>

                <View className="bg-gray-50 rounded-xl p-3 mb-4">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="information-circle-outline" size={16} color="#ec4899" />
                    <Text className="text-gray-500 text-xs flex-1">
                      Please arrive 10 minutes before your scheduled time.
                      {receiptData.remainingBalance > 0 && ' The remaining balance can be paid at the salon.'}
                    </Text>
                  </View>
                </View>

                <Text className="text-gray-400 text-center text-xs border-t border-gray-100 pt-3">
                  Booked on {receiptData.bookingDate}
                </Text>
              </View>

              <View className="border-t border-pink-100 px-6 py-4 flex-row gap-3">
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl border border-pink-500"
                  onPress={handleCloseReceipt}
                >
                  <Text className="text-pink-500 text-center font-semibold">Close</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-3 rounded-xl"
                  style={{ backgroundColor: '#ec4899' }}
                  onPress={handleCloseReceipt}
                >
                  <Text className="text-white text-center font-semibold">View My Bookings</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  };

  // ── Stylist ratings & details popup ──
  const StaffDetailsModal = () => {
    const target = detailsTarget;
    const member = target ? staff.find((s) => s.id === target.staffId) : null;
    const targetGroup = target ? groups.find((g) => g.key === target.groupKey) ?? null : null;
    const closeDetails = () => setDetailsTarget(null);

    const { average, count } = member ? getStaffRating(member.id) : { average: 0, count: 0 };
    const breakdown = member ? getRatingBreakdown(member.id) : { total: 0, rows: [] as { star: number; count: number; percent: number }[] };
    const reviews = member ? getRecentReviews(member.id) : [];
    const nextAvail = member && targetGroup ? getNextAvailableInfo(member.id, targetGroup.key) : null;
    const completedCount = member ? getCompletedAppointmentsCount(member.id) : 0;
    const profileImage = member
      ? getImageUrl(member.profile_image || member.user?.profile_image)
      : null;
    const isChosen = !!member && !!targetGroup && groupStaff[targetGroup.key] === member.id;

    return (
      <Modal
        transparent={true}
        animationType="slide"
        visible={!!member}
        onRequestClose={closeDetails}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '88%' }}>
            {/* Header */}
            <View className="px-6 pt-5 pb-3 border-b border-gray-100 flex-row items-center">
              {profileImage ? (
                <Image source={{ uri: profileImage }} className="w-14 h-14 rounded-full" resizeMode="cover" />
              ) : (
                <View
                  className="w-14 h-14 rounded-full items-center justify-center"
                  style={{ backgroundColor: '#ec4899' }}
                >
                  <Text className="text-white font-bold text-xl">
                    {member?.first_name?.charAt(0)}{member?.last_name?.charAt(0)}
                  </Text>
                </View>
              )}
              <View className="ml-3 flex-1">
                <Text className="text-lg font-bold text-gray-800" numberOfLines={1}>
                  {member?.first_name} {member?.last_name}
                </Text>
                <Text className="text-gray-500 text-xs" numberOfLines={2}>
                  {member ? getStaffSpecialties(member.id) : ''}
                </Text>
              </View>
              <TouchableOpacity onPress={closeDetails} className="p-1">
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 24, paddingTop: 16, paddingBottom: 16 }}
              style={{ maxHeight: 520 }}
            >
              {/* Quick facts */}
              <View className="bg-gray-50 rounded-xl p-3 mb-4">
                {nextAvail && (
                  <View className="flex-row items-center">
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={nextAvail.isToday ? '#16a34a' : '#6b7280'}
                    />
                    <Text
                      className={`text-sm ml-2 ${nextAvail.isToday ? 'text-green-600 font-semibold' : 'text-gray-700'}`}
                    >
                      {nextAvail.text}
                    </Text>
                  </View>
                )}
                <View className={`flex-row items-center ${nextAvail ? 'mt-2' : ''}`}>
                  <Ionicons name="checkmark-done-outline" size={16} color="#6b7280" />
                  <Text className="text-gray-700 text-sm ml-2">{formatCompletedLabel(completedCount)}</Text>
                </View>
              </View>

              {/* Rating summary */}
              <Text className="text-gray-800 font-bold text-base mb-2">Ratings</Text>
              {breakdown.total === 0 ? (
                <View className="bg-gray-50 rounded-xl p-4 items-center mb-4">
                  <Ionicons name="star-outline" size={28} color="#d1d5db" />
                  <Text className="text-gray-500 text-sm mt-1">No ratings yet</Text>
                </View>
              ) : (
                <View className="flex-row items-center mb-4">
                  <View className="items-center mr-5">
                    <Text className="text-4xl font-bold text-gray-800">{average.toFixed(1)}</Text>
                    <View className="flex-row mt-1">{renderStars(average)}</View>
                    <Text className="text-gray-500 text-xs mt-1">
                      {count} {count === 1 ? 'review' : 'reviews'}
                    </Text>
                  </View>

                  <View className="flex-1">
                    {breakdown.rows.map((row) => (
                      <View key={row.star} className="flex-row items-center mb-1">
                        <Text className="text-gray-600 text-xs w-6">{row.star}★</Text>
                        <View className="flex-1 h-2 bg-gray-200 rounded-full mx-2 overflow-hidden">
                          <View
                            style={{
                              width: `${row.percent}%`,
                              height: '100%',
                              backgroundColor: '#fbbf24',
                            }}
                          />
                        </View>
                        <Text className="text-gray-500 text-xs w-9 text-right">{row.percent}%</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

              {/* Recent written reviews */}
              <Text className="text-gray-800 font-bold text-base mb-2">Recent Reviews</Text>
              {reviews.length === 0 ? (
                <View className="bg-gray-50 rounded-xl p-4 items-center mb-2">
                  <Ionicons name="chatbubble-ellipses-outline" size={28} color="#d1d5db" />
                  <Text className="text-gray-500 text-sm mt-1">No written reviews yet</Text>
                </View>
              ) : (
                reviews.map((review) => {
                  const reviewDate = review.created_at ? new Date(review.created_at) : null;
                  const hasValidDate = !!reviewDate && !isNaN(reviewDate.getTime());
                  return (
                    <View key={review.id} className="bg-gray-50 rounded-xl p-3 mb-2">
                      <View className="flex-row items-center justify-between mb-1">
                        <View className="flex-row">{renderStars(review.rating)}</View>
                        {hasValidDate && (
                          <Text className="text-gray-400 text-[10px]">
                            {reviewDate!.toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </Text>
                        )}
                      </View>
                      <Text className="text-gray-700 text-sm">{review.comment}</Text>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Footer */}
            <View className="px-6 py-4 border-t border-gray-100">
              {member && targetGroup ? (
                <TouchableOpacity
                  onPress={() => {
                    handleStaffSelectForGroup(targetGroup.key, member.id);
                    closeDetails();
                  }}
                  className="py-3 rounded-xl bg-pink-500"
                >
                  <Text className="text-white text-center font-semibold">
                    {isChosen ? 'Selected ✓' : `Select ${member.first_name}`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity onPress={closeDetails} className="py-3 rounded-xl bg-pink-500">
                  <Text className="text-white text-center font-semibold">Close</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    const totalPrice = getTotalPriceWithAdjustments();
    const totalDuration = getTotalDuration();
    const paymentAmount = selectedPaymentType === 'full' ? totalPrice : totalPrice / 2;
    const selectedColorObj = getSelectedHairColorObject();
    const serviceSections = getServiceSections();
    const activeSched = activeGroup ? groupSchedule[activeGroup.key] : undefined;
    const activeStaffId = activeGroup ? groupStaff[activeGroup.key] : undefined;
    const hasMultipleGroups = groups.length > 1;

    const stepSubtitle = (() => {
      switch (bookingStep) {
        case 'services':
          return 'Choose one or more services';
        case 'hair_options':
          return 'Select hair details for your service';
        case 'stylist':
          return hasMultipleGroups
            ? 'Choose a stylist for each appointment'
            : 'Choose your preferred stylist';
        case 'datetime':
          return hasMultipleGroups
            ? 'Set a separate date & time for each appointment'
            : `Selected: ${getServiceNames()}`;
        default:
          return 'Complete your booking with GCash payment';
      }
    })();

    return (
      <View className="flex-1">
        <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
          <View className="px-5 pt-6">
            {bookingStep !== 'services' && (
              <TouchableOpacity
                className="flex-row items-center mb-4"
                onPress={handleBack}
                disabled={isProcessing}
              >
                <Ionicons name="arrow-back" size={24} color="#ec4899" />
                <Text className="text-pink-500 font-semibold ml-2">{getBackLabel()}</Text>
              </TouchableOpacity>
            )}

            <Text className="text-3xl font-bold text-gray-800 mb-2">
              {bookingStep === 'services' ? 'Select Services' :
               bookingStep === 'hair_options' ? 'Hair Options' :
               bookingStep === 'stylist' ? (hasMultipleGroups ? 'Select Stylists' : 'Select Stylist') :
               bookingStep === 'datetime' ? 'Select Date & Time' :
               'Payment & Confirmation'}
            </Text>
            <Text className="text-gray-500 mb-6">{stepSubtitle}</Text>

            {/* Step 1: Service Selection */}
            {bookingStep === 'services' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <Text className="text-gray-500 text-sm mb-4">
                  Multitaskable services of the same specialty are booked together. Services that
                  aren't multitaskable are booked as a separate appointment with their own time.
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
                      No services are available right now
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
                        const requiresHairColor = service.reqHairColor === 1;
                        const hasPriceAdjustments = service.service_price_adjustments && service.service_price_adjustments.length > 0;
                        const blockReason = getServiceBlockReason(service);

                        return (
                          <TouchableOpacity
                            key={service.id}
                            className={`rounded-2xl p-4 mb-3 border-2 ${
                              isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                            } ${blockReason ? 'opacity-50' : ''}`}
                            onPress={() => handleServiceSelect(service.id)}
                            activeOpacity={0.7}
                            disabled={isProcessing}
                          >
                            <View className="flex-row items-start">
                              <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${
                                isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                              }`}>
                                {isSelected && <Ionicons name="checkmark" size={14} color="white" />}
                              </View>

                              <View className="flex-1">
                                <Text className="text-lg font-semibold text-gray-800">{service.service_name}</Text>
                                <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                                  {service.description}
                                </Text>
                                <View className="flex-row items-center mt-2 flex-wrap gap-1">
                                  <Ionicons name="time-outline" size={14} color="#9ca3af" />
                                  <Text className="text-gray-500 text-xs mr-2">{service.duration_minutes} mins</Text>
                                  {isMultitaskable && (
                                    <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                      <Text className="text-green-600 text-xs">Multitaskable</Text>
                                    </View>
                                  )}
                                  {!isMultitaskable && (
                                    <View className="bg-orange-100 px-2 py-0.5 rounded-full">
                                      <Text className="text-orange-600 text-xs">Separate Appointment</Text>
                                    </View>
                                  )}
                                  {requiresHairColor && (
                                    <View className="bg-purple-100 px-2 py-0.5 rounded-full">
                                      <Text className="text-purple-600 text-xs">Hair Color</Text>
                                    </View>
                                  )}
                                  {hasPriceAdjustments && (
                                    <View className="bg-blue-100 px-2 py-0.5 rounded-full">
                                      <Text className="text-blue-600 text-xs">Price Varies</Text>
                                    </View>
                                  )}
                                </View>
                                {blockReason && (
                                  <Text className="text-red-500 text-[11px] mt-1">{blockReason}</Text>
                                )}
                              </View>
                              <Text className="text-pink-500 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
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
                          {group.label}{hasMultipleGroups ? ` · Appointment ${index + 1}` : ''}
                        </Text>
                        <Text className="text-gray-700 text-sm">
                          {group.services.map(s => s.service_name).join(' + ')}
                        </Text>
                      </View>
                    ))}

                    {hasMultipleGroups && (
                      <View className="bg-blue-50 rounded-lg p-2 mb-2">
                        <Text className="text-blue-700 text-xs">
                          Your services are split into {groups.length} appointments. You'll choose a stylist and a
                          separate time for each.
                        </Text>
                      </View>
                    )}

                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-600 text-sm">Total Duration: {totalDuration} mins</Text>
                      <Text className="text-pink-500 font-bold text-lg">₱{totalPrice.toLocaleString()}</Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-600 text-sm">Downpayment (50%):</Text>
                      <Text className="text-blue-500 font-bold text-lg">₱{(totalPrice / 2).toLocaleString()}</Text>
                    </View>
                    <Text className="text-gray-400 text-[10px] mt-1">
                      Final price may change based on hair length & thickness adjustments.
                    </Text>
                  </View>
                )}

                <TouchableOpacity
                  className={`py-4 rounded-xl mt-6 ${selectedServiceIds.length === 0 ? 'bg-gray-400' : 'bg-pink-500'}`}
                  onPress={handleContinueToHairOptions}
                  disabled={selectedServiceIds.length === 0 || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    {needsHairOptions() ? 'Continue to Hair Options' : 'Continue to Stylist'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 2: Hair Options */}
            {bookingStep === 'hair_options' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Selected Services</Text>
                  <Text className="text-lg font-bold text-gray-800">{getServiceNames()}</Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-gray-500 text-sm">{selectedServiceIds.length} service(s)</Text>
                    <Text className="text-pink-500 font-bold">Base: ₱{getServicePrice().toLocaleString()}</Text>
                  </View>
                </View>

                {(() => {
                  const hasPriceAdjustments = selectedServiceIds.some((id: number) => {
                    const adjustments = getPriceAdjustmentsForService(id);
                    return adjustments.length > 0;
                  });

                  const requiresHairColor = selectedServiceIds.some((id: number) => doesServiceRequireHairColor(id));
                  const hairLengthOptions = [
                    { value: 'short', label: 'Short' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'long', label: 'Long' }
                  ];

                  const hairThicknessOptions = [
                    { value: 'thin', label: 'Thin' },
                    { value: 'medium', label: 'Medium' },
                    { value: 'thick', label: 'Thick' }
                  ];

                  return (
                    <>
                      {hasPriceAdjustments && (
                        <>
                          <Text className="text-lg font-semibold text-gray-800 mb-2">Hair Details for Pricing</Text>
                          <Text className="text-gray-500 text-sm mb-4">
                            Select your hair length and thickness to determine the final price.
                          </Text>

                          <Text className="text-gray-700 font-semibold text-sm mb-2">Hair Length</Text>
                          <View className="flex-row flex-wrap gap-2 mb-4">
                            {hairLengthOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                className={`px-4 py-2 rounded-xl border-2 ${
                                  selectedHairLength === option.value ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                                }`}
                                onPress={() => setSelectedHairLength(option.value)}
                              >
                                <Text className={`${selectedHairLength === option.value ? 'text-pink-600 font-semibold' : 'text-gray-700'}`}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          <Text className="text-gray-700 font-semibold text-sm mb-2">Hair Thickness</Text>
                          <View className="flex-row flex-wrap gap-2 mb-4">
                            {hairThicknessOptions.map((option) => (
                              <TouchableOpacity
                                key={option.value}
                                className={`px-4 py-2 rounded-xl border-2 ${
                                  selectedHairThickness === option.value ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                                }`}
                                onPress={() => setSelectedHairThickness(option.value)}
                              >
                                <Text className={`${selectedHairThickness === option.value ? 'text-pink-600 font-semibold' : 'text-gray-700'}`}>
                                  {option.label}
                                </Text>
                              </TouchableOpacity>
                            ))}
                          </View>

                          {selectedHairLength && selectedHairThickness && (
                            <View className="bg-blue-50 rounded-xl p-3 mb-4">
                              <Text className="text-gray-600 text-sm">Price Preview</Text>
                              {selectedServiceIds.map((id: number) => {
                                const service = services.find((s: Service) => s.id === id);
                                const price = calculatePriceWithAdjustments(id, selectedHairLength, selectedHairThickness);
                                const basePrice = service?.price || 0;
                                const additional = price - basePrice;
                                return (
                                  <View key={id} className="flex-row justify-between mt-1">
                                    <Text className="text-gray-600 text-sm">{service?.service_name}</Text>
                                    <Text className="text-gray-800 font-semibold text-sm">
                                      ₱{price.toLocaleString()}
                                      {additional > 0 && (
                                        <Text className="text-green-600 text-xs ml-1">(+₱{additional.toLocaleString()})</Text>
                                      )}
                                    </Text>
                                  </View>
                                );
                              })}
                              <View className="flex-row justify-between mt-2 pt-2 border-t border-blue-200">
                                <Text className="text-gray-800 font-bold">Total:</Text>
                                <Text className="text-pink-600 font-bold">₱{getTotalPriceWithAdjustments().toLocaleString()}</Text>
                              </View>
                            </View>
                          )}
                        </>
                      )}

                      {requiresHairColor && (
                        <>
                          <View className={hasPriceAdjustments ? 'border-t border-gray-200 pt-4' : ''}>
                            <Text className="text-lg font-semibold text-gray-800 mb-2">Select Hair Color</Text>
                            <Text className="text-gray-500 text-sm mb-4">
                              Choose your preferred hair color. Tap to browse all available shades.
                            </Text>

                            <TouchableOpacity
                              onPress={() => setShowHairColorModal(true)}
                              activeOpacity={0.8}
                              className={`rounded-2xl p-4 border-2 flex-row items-center ${
                                selectedColorObj ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                              }`}
                            >
                              {selectedColorObj ? (
                                <>
                                  <View
                                    className="w-12 h-12 rounded-full border-2 border-pink-500"
                                    style={{ backgroundColor: selectedColorObj.color_code || '#808080' }}
                                  />
                                  <View className="ml-3 flex-1">
                                    <Text className="text-xs text-gray-500">Selected color</Text>
                                    <Text className="text-base font-semibold text-gray-800">
                                      {selectedColorObj.color_name}
                                    </Text>
                                    <Text className="text-[10px] text-gray-400 font-mono">
                                      {selectedColorObj.color_code}
                                    </Text>
                                  </View>
                                  <View className="flex-row items-center">
                                    <Text className="text-pink-500 text-xs font-semibold mr-1">Change</Text>
                                    <Ionicons name="chevron-forward" size={18} color="#ec4899" />
                                  </View>
                                </>
                              ) : (
                                <>
                                  <View className="w-12 h-12 rounded-full bg-gray-100 border-2 border-dashed border-gray-300 items-center justify-center">
                                    <Ionicons name="color-palette-outline" size={22} color="#9ca3af" />
                                  </View>
                                  <View className="ml-3 flex-1">
                                    <Text className="text-base font-semibold text-gray-800">
                                      Select a hair color
                                    </Text>
                                    <Text className="text-xs text-gray-500 mt-0.5">
                                      {masterHairColors.length} shade{masterHairColors.length !== 1 ? 's' : ''} available
                                    </Text>
                                  </View>
                                  <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                                </>
                              )}
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </>
                  );
                })()}

                <TouchableOpacity
                  className="bg-pink-500 py-4 rounded-xl mt-4"
                  onPress={handleContinueToStylist}
                  disabled={isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Stylist
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 3: Stylist Selection (one stylist per appointment group) */}
            {bookingStep === 'stylist' && (
              <View>
                {groups.map((group, index) => {
                  // Eligibility depends on the real specialty, not the unique group key
                  const eligible = getEligibleStaffForGroup(group.specialtyKey);
                  const chosenId = groupStaff[group.key];
                  // Which stylists could also handle the OTHER appointments the customer selected
                  const otherCoverage = groups
                    .filter((g) => g.key !== group.key)
                    .map((g) => ({
                      group: g,
                      ids: new Set(getEligibleStaffForGroup(g.specialtyKey).map((m) => m.id)),
                    }));

                  return (
                    <View key={group.key} className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                      <View className="bg-pink-50 rounded-xl p-3 mb-4">
                        <Text className="text-gray-500 text-xs uppercase font-semibold">
                          {hasMultipleGroups ? `Appointment ${index + 1} · ` : ''}{group.label}
                        </Text>
                        <Text className="text-base font-bold text-gray-800">
                          {group.services.map(s => s.service_name).join(' + ')}
                        </Text>
                        <Text className="text-gray-500 text-xs mt-1">
                          {getGroupDuration(group)} mins · ₱{getGroupTotal(group).toLocaleString()}
                        </Text>
                      </View>

                      {eligible.length === 0 ? (
                        <View className="py-6 items-center">
                          <Ionicons name="people-outline" size={40} color="#d1d5db" />
                          <Text className="text-gray-500 text-center mt-2">
                            No stylists available for {group.label}
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
                            const nextAvail = getNextAvailableInfo(staffMember.id, group.key);
                            const completedCount = getCompletedAppointmentsCount(staffMember.id);
                            const alsoCovers = otherCoverage
                              .filter((o) => o.ids.has(staffMember.id))
                              .reduce<string[]>(
                                (acc, o) => acc.concat(o.group.services.map((s) => s.service_name)),
                                []
                              );

                            return (
                              <TouchableOpacity
                                key={staffMember.id}
                                style={{ width: 200, marginRight: 12 }}
                                onPress={() => handleStaffSelectForGroup(group.key, staffMember.id)}
                                activeOpacity={0.85}
                                disabled={isProcessing}
                              >
                                <View
                                  className={`bg-white rounded-2xl overflow-hidden border-2 ${
                                    isChosen ? 'border-pink-500' : 'border-gray-100'
                                  }`}
                                  style={{ elevation: 3 }}
                                >
                                  <View className="relative">
                                    {profileImage ? (
                                      <Image
                                        source={{ uri: profileImage }}
                                        className="w-full h-36"
                                        resizeMode="cover"
                                      />
                                    ) : (
                                      <View
                                        className="w-full h-36 items-center justify-center"
                                        style={{ backgroundColor: '#ec4899' }}
                                      >
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

                                    {nextAvail.isToday && (
                                      <View className="absolute bottom-2 left-2 bg-green-500 rounded-full px-2 py-0.5">
                                        <Text className="text-white text-[10px] font-semibold">Available today</Text>
                                      </View>
                                    )}
                                  </View>

                                  <View className="p-3">
                                    <Text className="text-sm font-bold text-gray-800" numberOfLines={1}>
                                      {staffMember.first_name} {staffMember.last_name}
                                    </Text>
                                    <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>{specialties}</Text>

                                    <View className="flex-row items-center mt-2">
                                      {average > 0 ? renderStars(average) : (
                                        <Text className="text-gray-400 text-xs">No ratings yet</Text>
                                      )}
                                    </View>

                                    {/* Next availability + experience */}
                                    <View className="mt-2">
                                      <View className="flex-row items-center">
                                        <Ionicons
                                          name="calendar-outline"
                                          size={12}
                                          color={nextAvail.isToday ? '#16a34a' : '#6b7280'}
                                        />
                                        <Text
                                          className={`text-[11px] ml-1 flex-1 ${
                                            nextAvail.isToday ? 'text-green-600 font-semibold' : 'text-gray-600'
                                          }`}
                                          numberOfLines={1}
                                        >
                                          {nextAvail.text}
                                        </Text>
                                      </View>
                                      <View className="flex-row items-center mt-1">
                                        <Ionicons name="checkmark-done-outline" size={12} color="#6b7280" />
                                        <Text className="text-gray-600 text-[11px] ml-1 flex-1" numberOfLines={1}>
                                          {formatCompletedLabel(completedCount)}
                                        </Text>
                                      </View>
                                    </View>

                                    {/* Which of the customer's services this stylist covers */}
                                    <View className="mt-2 bg-green-50 rounded-lg p-2">
                                      <Text className="text-green-700 text-[10px] font-semibold">
                                        ✓ Can do your services
                                      </Text>
                                      <Text className="text-gray-600 text-[10px] mt-0.5" numberOfLines={2}>
                                        {group.services.map((s) => s.service_name).join(', ')}
                                      </Text>
                                      {alsoCovers.length > 0 && (
                                        <Text className="text-blue-600 text-[10px] mt-1" numberOfLines={2}>
                                          Also qualified for: {alsoCovers.join(', ')}
                                        </Text>
                                      )}
                                    </View>

                                    <View className={`mt-3 rounded-full py-2 items-center ${isChosen ? 'bg-pink-500' : 'bg-pink-100'}`}>
                                      <Text className={`font-semibold text-xs ${isChosen ? 'text-white' : 'text-pink-600'}`}>
                                        {isChosen ? 'Selected ✓' : 'Select Stylist'}
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
                  className={`py-4 rounded-xl mb-6 ${allGroupsHaveStaff ? 'bg-pink-500' : 'bg-gray-400'}`}
                  onPress={handleContinueToDateTime}
                  disabled={!allGroupsHaveStaff || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Date & Time
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Step 4: Calendar + Time Selection (one time per group) */}
            {bookingStep === 'datetime' && activeGroup && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                {hasMultipleGroups && (
                  <View className="mb-4">
                    <Text className="text-gray-500 text-xs mb-2">
                      Each appointment needs its own date & time. Tap a tab to set it.
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {groups.map((group, index) => {
                        const sched = groupSchedule[group.key];
                        const isActive = activeGroup.key === group.key;
                        return (
                          <TouchableOpacity
                            key={group.key}
                            onPress={() => setActiveGroupKey(group.key)}
                            className={`mr-2 px-4 py-2 rounded-xl border-2 ${
                              isActive ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <View className="flex-row items-center">
                              {sched && <Ionicons name="checkmark-circle" size={14} color="#10b981" />}
                              <Text className={`text-sm font-semibold ${sched ? 'ml-1' : ''} ${isActive ? 'text-pink-600' : 'text-gray-700'}`}>
                                {index + 1}. {group.label}
                              </Text>
                            </View>
                            <Text className="text-[10px] text-gray-500 mt-0.5">
                              {sched
                                ? `${toLocalDate(sched.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · ${formatTime12(sched.time)}`
                                : 'Not set'}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">
                    {hasMultipleGroups ? `Setting time for ${activeGroup.label}` : 'Booking Summary'}
                  </Text>
                  <Text className="text-lg font-bold text-gray-800">
                    {activeGroup.services.map(s => s.service_name).join(' + ')}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">Stylist: {getStaffName(activeStaffId)}</Text>
                  <View className="flex-row justify-between mt-2">
                    <Text className="text-gray-500 text-sm">
                      {activeGroup.services.length} service(s) • {getGroupDuration(activeGroup)} mins
                    </Text>
                    <Text className="text-pink-500 font-bold">₱{getGroupTotal(activeGroup).toLocaleString()}</Text>
                  </View>
                  {selectedHairLength && selectedHairThickness && (
                    <Text className="text-gray-500 text-xs mt-1">
                      Hair: {selectedHairLength} / {selectedHairThickness}
                      {selectedColorObj && ` • Color: ${selectedColorObj.color_name}`}
                    </Text>
                  )}
                </View>

                <View className="flex-row justify-around mb-4 pb-3 border-b border-gray-100">
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-green-500" />
                    <Text className="text-xs text-gray-600">Open</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-red-500" />
                    <Text className="text-xs text-gray-600">Closed</Text>
                  </View>
                  <View className="flex-row items-center gap-1">
                    <View className="w-3 h-3 rounded-full bg-gray-300" />
                    <Text className="text-xs text-gray-600">No Schedule</Text>
                  </View>
                </View>

                <View className="flex-row justify-between items-center mb-4">
                  <TouchableOpacity onPress={() => changeMonth(-1)} className="p-2">
                    <Ionicons name="chevron-back" size={24} color="#ec4899" />
                  </TouchableOpacity>
                  <Text className="text-lg font-semibold text-gray-800">
                    {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                  </Text>
                  <TouchableOpacity onPress={() => changeMonth(1)} className="p-2">
                    <Ionicons name="chevron-forward" size={24} color="#ec4899" />
                  </TouchableOpacity>
                </View>

                <View className="flex-row mb-2">
                  {weekDays.map((day, index) => (
                    <View key={index} className="flex-1 items-center py-2">
                      <Text className="text-gray-500 text-xs font-medium">{day}</Text>
                    </View>
                  ))}
                </View>

                <View className="flex-row flex-wrap">
                  {getDaysInMonth(currentMonth).map((date, index) => {
                    if (!date) return <View key={`empty-${index}`} className="w-[14.28%] aspect-square p-1" />;

                    const isSelected = !!activeSched && toDateStr(activeSched.date) === toDateStr(date);
                    const isTodayDate = isToday(date);
                    const isPast = isPastDate(date);
                    const scheduleStatus = getScheduleStatus(date);
                    const isStaffAvailable = activeStaffId ? isStaffAvailableOnDate(activeStaffId, date) : false;
                    const isBookable = !isPast && isDateBookable(date, activeGroup.key) && isStaffAvailable;

                    let cellBgColor = 'bg-gray-50';
                    let indicatorColor = null;

                    if (!isPast) {
                      if (isBookable) {
                        cellBgColor = 'bg-green-50';
                        indicatorColor = 'bg-green-500';
                      } else if (scheduleStatus.status === 'closed') {
                        cellBgColor = 'bg-red-50';
                        indicatorColor = 'bg-red-500';
                      } else {
                        cellBgColor = 'bg-gray-100';
                        indicatorColor = 'bg-gray-400';
                      }
                    } else {
                      cellBgColor = 'bg-gray-100';
                    }

                    const dayNumber = date.getUTCDate();

                    return (
                      <TouchableOpacity
                        key={date.toISOString()}
                        className={`w-[14.28%] aspect-square p-1 ${isPast ? 'opacity-40' : ''}`}
                        onPress={() => !isPast && handleDateSelect(date)}
                        disabled={isPast || !isBookable}
                      >
                        <View className={`flex-1 items-center justify-center rounded-full ${cellBgColor} ${isSelected ? 'border-2 border-pink-500' : ''}`}>
                          <Text className={`text-sm ${
                            isSelected ? 'text-pink-600 font-bold' :
                            isTodayDate ? 'text-pink-600 font-semibold' :
                            isPast ? 'text-gray-400' :
                            isBookable ? 'text-green-700' :
                            scheduleStatus.status === 'closed' ? 'text-red-700' :
                            'text-gray-500'
                          }`}>
                            {dayNumber}
                          </Text>
                          {indicatorColor && !isSelected && (
                            <View className={`w-1.5 h-1.5 rounded-full ${indicatorColor} mt-0.5`} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {activeSched && (
                  <View className="mt-6 p-4 bg-gray-50 rounded-xl">
                    <Text className="text-gray-600 text-sm">
                      {hasMultipleGroups ? `${activeGroup.label} · Selected Date` : 'Selected Date'}
                    </Text>
                    <Text className="text-lg font-bold text-gray-800">
                      {formatDateLong(activeSched.date)}
                    </Text>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="time-outline" size={16} color="#ec4899" />
                      <Text className="text-pink-600 font-semibold ml-1">{formatTime12(activeSched.time)}</Text>
                      <Text className="text-gray-400 text-xs ml-2">({getGroupDuration(activeGroup)} min duration)</Text>
                    </View>
                  </View>
                )}

                {activeSched && (
                  <TouchableOpacity
                    className="flex-row items-center justify-center py-3 mt-3 border border-pink-500 rounded-xl"
                    onPress={() => {
                      setSelectedDateForModal(activeSched.date);
                      setShowTimePickerModal(true);
                    }}
                  >
                    <Ionicons name="time-outline" size={20} color="#ec4899" />
                    <Text className="text-pink-500 font-semibold ml-2">Change Time</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  className={`py-4 rounded-xl mt-4 ${allGroupsScheduled ? 'bg-pink-500' : 'bg-gray-400'}`}
                  onPress={() => setBookingStep('payment')}
                  disabled={!allGroupsScheduled || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Payment
                  </Text>
                </TouchableOpacity>

                {!allGroupsScheduled && (
                  <Text className="text-gray-400 text-xs text-center mt-2">
                    {hasMultipleGroups
                      ? `Still need a time for: ${groups.filter(g => !groupSchedule[g.key]).map(g => g.label).join(', ')}`
                      : 'Pick a date and time to continue'}
                  </Text>
                )}
              </View>
            )}

            {/* Step 5: Payment */}
            {bookingStep === 'payment' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-4">
                  <Text className="text-gray-500 text-sm">Booking Summary</Text>

                  {groups.map((group, index) => {
                    const sched = groupSchedule[group.key];
                    return (
                      <View
                        key={group.key}
                        className={index > 0 ? 'mt-3 pt-3 border-t border-pink-200' : 'mt-1'}
                      >
                        {hasMultipleGroups && (
                          <Text className="text-pink-500 text-[11px] font-semibold uppercase">
                            Appointment {index + 1} · {group.label}
                          </Text>
                        )}
                        <Text className="text-lg font-bold text-gray-800">
                          {group.services.map(s => s.service_name).join(' + ')}
                        </Text>
                        {sched && (
                          <>
                            <Text className="text-gray-500 text-sm mt-1">
                              Date: {toLocalDate(sched.date).toLocaleDateString()}
                            </Text>
                            <Text className="text-gray-500 text-sm mt-1">Time: {formatTime12(sched.time)}</Text>
                          </>
                        )}
                        <Text className="text-gray-500 text-sm mt-1">Stylist: {getStaffName(groupStaff[group.key])}</Text>
                        {hasMultipleGroups && (
                          <Text className="text-gray-500 text-sm mt-1">
                            Subtotal: ₱{getGroupTotal(group).toLocaleString()}
                          </Text>
                        )}
                      </View>
                    );
                  })}

                  {selectedHairLength && selectedHairThickness && (
                    <View className="flex-row justify-between mt-3">
                      <Text className="text-gray-500 text-sm">Hair Details:</Text>
                      <Text className="text-gray-700 text-sm">
                        {selectedHairLength} / {selectedHairThickness}
                        {selectedColorObj && ` • ${selectedColorObj.color_name}`}
                      </Text>
                    </View>
                  )}
                  <View className="flex-row justify-between mt-2 pt-2 border-t border-pink-200">
                    <Text className="text-gray-600 font-semibold">Total Amount:</Text>
                    <Text className="text-pink-500 font-bold">₱{totalPrice.toLocaleString()}</Text>
                  </View>
                </View>

                <Text className="text-gray-700 font-semibold text-sm mb-2">Payment Option</Text>
                <View className="flex-row gap-2 mb-4">
                  <TouchableOpacity
                    className={`flex-1 p-3 rounded-xl border-2 ${
                      selectedPaymentType === 'downpayment'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setSelectedPaymentType('downpayment')}
                    disabled={isProcessing}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className={`text-sm font-semibold ${
                          selectedPaymentType === 'downpayment' ? 'text-pink-600' : 'text-gray-800'
                        }`}>
                          Downpayment
                        </Text>
                        <Text className="text-gray-500 text-[10px] mt-0.5">50% now, rest at salon</Text>
                      </View>
                      <Text className={`text-sm font-bold ${
                        selectedPaymentType === 'downpayment' ? 'text-pink-600' : 'text-gray-700'
                      }`}>
                        ₱{(totalPrice / 2).toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    className={`flex-1 p-3 rounded-xl border-2 ${
                      selectedPaymentType === 'full'
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setSelectedPaymentType('full')}
                    disabled={isProcessing}
                  >
                    <View className="flex-row items-center justify-between">
                      <View>
                        <Text className={`text-sm font-semibold ${
                          selectedPaymentType === 'full' ? 'text-pink-600' : 'text-gray-800'
                        }`}>
                          Full Payment
                        </Text>
                        <Text className="text-gray-500 text-[10px] mt-0.5">Pay everything now</Text>
                      </View>
                      <Text className={`text-sm font-bold ${
                        selectedPaymentType === 'full' ? 'text-pink-600' : 'text-gray-700'
                      }`}>
                        ₱{totalPrice.toLocaleString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                </View>

                <View className="bg-gray-50 rounded-xl p-3 mb-4">
                  <View className="flex-row justify-between">
                    <Text className="text-gray-600">Amount to Pay Now:</Text>
                    <Text className="text-blue-600 font-bold text-lg">₱{paymentAmount.toLocaleString()}</Text>
                  </View>
                  {selectedPaymentType === 'downpayment' && (
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-xs">Remaining Balance:</Text>
                      <Text className="text-orange-500 font-semibold text-sm">₱{(totalPrice - paymentAmount).toLocaleString()}</Text>
                    </View>
                  )}
                  {selectedPaymentType === 'full' && (
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-xs">Remaining Balance:</Text>
                      <Text className="text-green-600 font-semibold text-sm">₱0 (Paid in Full)</Text>
                    </View>
                  )}
                  {hasMultipleGroups && (
                    <Text className="text-gray-400 text-[10px] mt-2">
                      One payment covers all {groups.length} appointments.
                    </Text>
                  )}
                </View>

                <View className="items-center mb-4">
                  <Text className="text-gray-700 font-semibold text-base mb-2">Scan to Pay with GCash</Text>

                  {isLoadingQr ? (
                    <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md w-40 h-40 items-center justify-center">
                      <ActivityIndicator size="large" color="#ec4899" />
                    </View>
                  ) : qrImageUrl ? (
                    <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md">
                      <Image
                        source={{ uri: qrImageUrl }}
                        className="w-40 h-40"
                        resizeMode="contain"
                      />
                    </View>
                  ) : (
                    <View className="bg-gray-100 rounded-xl p-6 w-40 h-40 items-center justify-center border-2 border-dashed border-gray-300">
                      <Ionicons name="qr-code-outline" size={48} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs text-center mt-2">
                        QR code not available
                      </Text>
                    </View>
                  )}

                  <Text className="text-gray-500 text-sm mt-2 text-center">
                    Amount to pay: <Text className="font-bold text-blue-600">₱{paymentAmount.toLocaleString()}</Text>
                  </Text>

                  {gcashNumber ? (
                    <View className="mt-3 bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
                      <Text className="text-[10px] text-gray-500 text-center">GCash Number</Text>
                      <Text className="text-sm font-bold text-gray-800 tracking-wide text-center">
                        {gcashNumber}
                      </Text>
                    </View>
                  ) : null}
                </View>

                <View className="bg-blue-50 rounded-xl p-3 mb-4">
                  <Text className="text-blue-800 font-semibold text-sm mb-1">📋 How to Pay:</Text>
                  <View className="space-y-1">
                    <Text className="text-gray-600 text-xs">1. Open GCash app → Tap "Pay QR"</Text>
                    <Text className="text-gray-600 text-xs">2. Scan the QR code above</Text>
                    <Text className="text-gray-600 text-xs">3. Enter amount: <Text className="font-bold">₱{paymentAmount.toLocaleString()}</Text></Text>
                    <Text className="text-gray-600 text-xs">4. Complete payment & take a screenshot</Text>
                    <Text className="text-gray-600 text-xs">5. Upload the screenshot below</Text>
                  </View>
                </View>

                <Text className="text-gray-700 font-semibold text-sm mb-2">Payment Method</Text>
                <TouchableOpacity
                  className={`flex-row items-center justify-between p-3 rounded-xl mb-4 border-2 ${
                    selectedPaymentMethod === 'gcash' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                  }`}
                  onPress={() => setSelectedPaymentMethod('gcash')}
                  disabled={isProcessing}
                >
                  <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                      <Ionicons name="phone-portrait-outline" size={16} color="#3b82f6" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold text-sm">GCash</Text>
                      <Text className="text-gray-500 text-xs">Pay your {selectedPaymentType === 'full' ? 'full payment' : 'downpayment'} via GCash</Text>
                    </View>
                  </View>
                  <View className={`w-5 h-5 rounded-full border-2 items-center justify-center ${
                    selectedPaymentMethod === 'gcash' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                  }`}>
                    {selectedPaymentMethod === 'gcash' && <Ionicons name="checkmark" size={12} color="white" />}
                  </View>
                </TouchableOpacity>

                <View className="mb-4">
                  <Text className="text-gray-700 font-semibold text-sm mb-2">Upload Payment Proof</Text>
                  <Text className="text-gray-500 text-xs mb-2">
                    Take a screenshot of your GCash payment receipt and upload it here
                  </Text>

                  <TouchableOpacity
                    className="flex-row items-center justify-center p-4 border-2 border-dashed border-pink-300 rounded-xl bg-pink-50"
                    onPress={pickImageFromGallery}
                    disabled={isProcessing}
                  >
                    <Ionicons name={paymentProof ? "checkmark-circle" : "cloud-upload-outline"} size={24} color={paymentProof ? "#10b981" : "#ec4899"} />
                    <Text className={`ml-2 font-semibold ${paymentProof ? 'text-green-600' : 'text-pink-500'}`}>
                      {paymentProof ? 'Receipt Uploaded ✓' : 'Tap to Upload Receipt'}
                    </Text>
                  </TouchableOpacity>

                  {paymentProof && (
                    <View className="mt-2">
                      <Image source={{ uri: paymentProof.uri }} className="w-full h-48 rounded-xl" resizeMode="cover" />
                      <TouchableOpacity className="mt-1 self-end" onPress={() => setPaymentProof(null)}>
                        <Text className="text-red-500 text-xs font-semibold">Remove</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                <View className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="information-circle-outline" size={16} color="#eab308" />
                    <Text className="text-yellow-700 text-xs flex-1">
                      Please upload a clear screenshot of your GCash payment receipt.
                      This will be reviewed by our staff to confirm your booking.
                    </Text>
                  </View>
                </View>

                <View className="bg-red-50 rounded-xl p-3 mb-4 border border-red-200">
                  <View className="flex-row items-start gap-2">
                    <Ionicons name="warning-outline" size={16} color="#ef4444" />
                    <Text className="text-red-600 text-xs flex-1 font-semibold">
                      No-Show Policy: All payments are NON-REFUNDABLE if you fail to show up
                      for your scheduled appointment. Please make sure you can attend before confirming.
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  className={`py-4 rounded-xl ${(!selectedPaymentMethod || !paymentProof) ? 'bg-gray-400' : 'bg-pink-500'}`}
                  onPress={handleConfirmBooking}
                  disabled={!selectedPaymentMethod || !paymentProof || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    {isProcessing ? 'Processing...' : 'Confirm Booking'}
                  </Text>
                </TouchableOpacity>

                {(!selectedPaymentMethod || !paymentProof) && (
                  <Text className="text-gray-400 text-xs text-center mt-2">
                    {!selectedPaymentMethod ? 'Please select a payment method' : 'Please upload your payment receipt'}
                  </Text>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* Called as functions (not <Component />) so they aren't remounted on every render,
            which keeps the hair color search input from losing focus while typing. */}
        {TimePickerModal()}
        {HairColorPickerModal()}
        {ReceiptModal()}
        {StaffDetailsModal()}
      </View>
    );
  };

  return renderContent();
}