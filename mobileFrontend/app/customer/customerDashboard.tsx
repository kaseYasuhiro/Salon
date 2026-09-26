import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, Image, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import api from '@/api/axios';
import * as DocumentPicker from 'expo-document-picker';
import CustomerBooking from "./customerBookTab";
import CustomerHistoryTab from "./customerHistoryTab";
import CustomerSettingsTab from "./customerSettingsTab";

// ─────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────
interface Transaction {
  id: number;
  appointment_id: number;
  service_id: number;
  service_name: string;
  duration_minutes: number;
  price: string;
  service_status: string;
  assigned_employee_id?: number;
}

interface Appointment {
  id: number;
  customer_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_names: string[];
  services: Array<{
    service_name: string;
    duration_minutes: number;
    price: string;
    service_status: string;
  }>;
  total_price: number;
  total_duration: number;
  service_name?: string;
  duration_minutes?: number;
  price?: string;
  service_status?: string;

  billing_total_amount?: number | null;
  billing_paid_amount?: number | null;
  billing_balance?: number | null;
  billing_payment_type?: string | null;

  stylist_name?: string;
  stylist_id?: number;

  has_remaining_balance?: boolean;

  grace_period_minutes?: number;
  grace_period_ends_at?: string | null;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  profile_image?: string;
}

interface Service {
  id: number;
  service_name: string;
  description: string;
  price: number;
  duration_minutes: number;
  service_status?: string;
  is_multitaskable: number;
  created_at?: string;
  updated_at?: string;
}

interface AppointmentRequest {
  id: number;
  appointment_id: number;
  customer_id: number;
  request_type: 'cancel' | 'reschedule';
  reason?: string | null;
  preferred_date?: string | null;
  preferred_time?: string | null;
  request_status: 'pending' | 'approved' | 'rejected';
  reviewed_at?: string | null;
  created_at?: string;
}

interface BusinessSchedule {
  id: number;
  business_date: string;
  open_time: string;
  close_time: string;
  is_open: number;
}

type GraceStatus =
  | { kind: 'upcoming'; minutesUntilStart: number }
  | { kind: 'in_grace'; minutesLeft: number }
  | { kind: 'expired' }
  | { kind: 'not_today' }
  | { kind: 'no_time' };

// ─────────────────────────────────────────────────────────────
// Formatting helpers
// ─────────────────────────────────────────────────────────────
const formatDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const formatLongDate = (date: string) => {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
};

const formatTime = (time: string) => {
  if (!time) return '';
  const parts = time.split(':');
  if (parts.length < 2) return time;
  const hours = parseInt(parts[0]);
  const minutes = parts[1];
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getTodayLocalStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');

const getImageUrl = (imagePath: string | null | undefined) => {
  if (!imagePath) return null;
  if (imagePath.startsWith('http')) return imagePath;
  if (imagePath.startsWith('/storage/')) return `${BASE_URL}${imagePath}`;
  return `${BASE_URL}/storage/${imagePath}`;
};

// ✅ Generate 30-min time slots between open_time and close_time
const generateTimeSlots = (openTime: string, closeTime: string): string[] => {
  const slots: string[] = [];
  const startHour = parseInt(openTime.split(':')[0]);
  const startMinute = parseInt(openTime.split(':')[1] || '0');
  const endHour = parseInt(closeTime.split(':')[0]);
  const endMinute = parseInt(closeTime.split(':')[1] || '0');

  let h = startHour;
  let m = startMinute;

  while (h < endHour || (h === endHour && m < endMinute)) {
    slots.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    m += 30;
    if (m >= 60) { m = 0; h++; }
  }
  return slots;
};

// ═════════════════════════════════════════════════════════════
// Receipt Modal
// ═════════════════════════════════════════════════════════════
interface ReceiptModalProps {
  visible: boolean;
  appointment: Appointment | null;
  customerName: string;
  stylistName: string;
  onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible, appointment, customerName, stylistName, onClose,
}) => {
  if (!appointment) return null;

  const totalAmount = appointment.billing_total_amount ?? appointment.total_price ?? 0;
  const paidAmount = appointment.billing_paid_amount ?? 0;
  const balance = appointment.billing_balance ?? (totalAmount - paidAmount);
  const services = appointment.services || [];
  const serviceNames = appointment.service_names || ['No Service'];

  const paymentStatus =
    balance <= 0 ? 'PAID IN FULL' :
    paidAmount > 0 ? 'PARTIAL PAYMENT' :
    'UNPAID';

  const statusColor =
    balance <= 0 ? '#10b981' :
    paidAmount > 0 ? '#f59e0b' :
    '#ef4444';

  const receiptNo = `RCP-${String(appointment.id).padStart(6, '0')}`;

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-2xl overflow-hidden w-full" style={{ minWidth: 320, maxHeight: '90%' }}>
          <View className="px-6 py-4 items-center" style={{ backgroundColor: '#ec4899' }}>
            <Text className="text-white text-xl font-bold">Reshel Oco Hair Salon</Text>
            <Text className="text-white opacity-90 text-sm mt-0.5">Official Appointment Receipt</Text>
            <View className="mt-2 px-3 py-0.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}>
              <Text className="text-white text-xs font-mono">{receiptNo}</Text>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-5">
              <View className="rounded-xl py-2 items-center mb-4"
                style={{ backgroundColor: `${statusColor}20`, borderWidth: 1, borderColor: `${statusColor}40` }}>
                <Text className="text-xs font-bold" style={{ color: statusColor }}>{paymentStatus}</Text>
              </View>

              <View className="border-b border-gray-100 pb-3 mb-3">
                <Text className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Customer</Text>
                <Text className="text-base font-bold text-gray-800">{customerName || 'Customer'}</Text>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">{formatLongDate(appointment.appointment_date)}</Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="time-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">{formatTime(appointment.appointment_time)}</Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="hourglass-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">Total duration: {appointment.total_duration} mins</Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="person-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    Assigned Stylist: <Text className="font-semibold text-gray-800">{stylistName || 'Not assigned'}</Text>
                  </Text>
                </View>

                <View className="flex-row items-center mt-1">
                  <Ionicons name="checkmark-circle-outline" size={12} color="#9ca3af" />
                  <Text className="text-xs text-gray-600 ml-1">
                    Status: {appointment.status ? appointment.status.toUpperCase() : 'PENDING'}
                  </Text>
                </View>
              </View>

              <View className="border-b border-gray-100 pb-3 mb-3">
                <Text className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">
                  Services ({services.length})
                </Text>
                {services.length > 0 ? (
                  services.map((svc, idx) => (
                    <View key={idx} className="flex-row justify-between items-start py-1">
                      <View className="flex-1 mr-2">
                        <Text className="text-sm text-gray-800">{svc.service_name}</Text>
                        <Text className="text-[10px] text-gray-500">{svc.duration_minutes} mins</Text>
                      </View>
                      <Text className="text-sm text-gray-700 font-medium">
                        ₱{parseFloat(svc.price).toLocaleString()}
                      </Text>
                    </View>
                  ))
                ) : (
                  <Text className="text-sm text-gray-500">{serviceNames.join(' + ')}</Text>
                )}
              </View>

              <View className="border-b border-gray-100 pb-3 mb-3">
                <Text className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-2">Payment Details</Text>

                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-sm text-gray-600">Total Amount</Text>
                  <Text className="text-sm font-semibold text-gray-800">₱{totalAmount.toLocaleString()}</Text>
                </View>

                <View className="flex-row justify-between items-center py-1">
                  <Text className="text-sm text-gray-600">Amount Paid</Text>
                  <Text className="text-sm font-semibold text-green-600">₱{paidAmount.toLocaleString()}</Text>
                </View>

                {balance > 0 && (
                  <View className="flex-row justify-between items-center py-1">
                    <Text className="text-sm text-gray-600">Remaining Balance</Text>
                    <Text className="text-sm font-semibold text-orange-600">₱{balance.toLocaleString()}</Text>
                  </View>
                )}

                <View className="flex-row justify-between items-center py-2 mt-1 bg-pink-50 rounded-lg px-3">
                  <Text className="text-xs font-semibold text-gray-700">
                    {balance <= 0 ? 'Payment Status' : 'Balance Due at Salon'}
                  </Text>
                  <Text className="text-base font-bold" style={{ color: balance <= 0 ? '#10b981' : '#ec4899' }}>
                    {balance <= 0 ? 'PAID' : `₱${balance.toLocaleString()}`}
                  </Text>
                </View>
              </View>

              <View className="bg-gray-50 rounded-lg p-3 mb-4">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="information-circle-outline" size={14} color="#ec4899" />
                  <Text className="text-gray-500 text-[11px] flex-1 leading-4">
                    Please present this receipt to the staff upon arrival.
                    Look for <Text className="font-semibold text-gray-700">{stylistName || 'your stylist'}</Text> at the salon.
                    {balance > 0 && ' The remaining balance can be paid at the salon on your appointment day.'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity className="py-3 rounded-xl" style={{ backgroundColor: '#ec4899' }} onPress={onClose}>
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// Payment Modal
// ═════════════════════════════════════════════════════════════
interface PaymentModalProps {
  visible: boolean;
  appointment: Appointment | null;
  paymentProof: any;
  isProcessingPayment: boolean;
  onClose: () => void;
  onPickImage: () => void;
  onRemoveProof: () => void;
  onConfirm: () => void;
  qrImageUrl: string | null;
  gcashNumber: string | null;
  isLoadingQr: boolean;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  visible, appointment, paymentProof, isProcessingPayment,
  onClose, onPickImage, onRemoveProof, onConfirm,
  qrImageUrl, gcashNumber, isLoadingQr,
}) => {
  if (!appointment) return null;

  const totalAmount = appointment.billing_total_amount ?? appointment.total_price ?? 0;
  const paidAmount = appointment.billing_paid_amount ?? 0;
  const remainingBalance = appointment.billing_balance ?? (totalAmount - paidAmount);
  const serviceNames = appointment.service_names || ['No Service'];

  return (
    <Modal transparent animationType="slide" visible={visible} onRequestClose={onClose}>
      <View className="flex-1 justify-center items-center bg-black/50 p-4">
        <View className="bg-white rounded-2xl overflow-hidden w-full" style={{ minWidth: 320, maxHeight: '90%' }}>
          <View className="px-6 py-4" style={{ backgroundColor: '#ec4899' }}>
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-xl font-bold">Pay Remaining Balance</Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View className="p-6">
              <View className="bg-pink-50 rounded-xl p-4 mb-4">
                <Text className="text-gray-500 text-sm">Appointment Summary</Text>
                <Text className="text-lg font-bold text-gray-800">{serviceNames.join(' + ')}</Text>
                <View className="flex-row justify-between mt-2">
                  <Text className="text-gray-500 text-sm">Date</Text>
                  <Text className="text-gray-800 text-sm">{formatDate(appointment.appointment_date)}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Time</Text>
                  <Text className="text-gray-800 text-sm">{formatTime(appointment.appointment_time)}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Total Amount</Text>
                  <Text className="text-gray-800 font-bold text-sm">₱{totalAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-gray-500 text-sm">Already Paid</Text>
                  <Text className="text-green-600 font-semibold text-sm">₱{paidAmount.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between mt-1 pt-1 border-t border-pink-200">
                  <Text className="text-gray-600 font-semibold">Remaining Balance</Text>
                  <Text className="text-orange-600 font-bold text-lg">₱{remainingBalance.toLocaleString()}</Text>
                </View>
              </View>

              <View className="items-center mb-4">
                <Text className="text-gray-700 font-semibold text-base mb-2">Pay with GCash</Text>

                {isLoadingQr ? (
                  <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md w-40 h-40 items-center justify-center">
                    <Text className="text-gray-400 text-xs">Loading QR...</Text>
                  </View>
                ) : qrImageUrl ? (
                  <View className="bg-white rounded-xl p-3 border-2 border-pink-200 shadow-md">
                    <Image source={{ uri: qrImageUrl }} className="w-40 h-40" resizeMode="contain" />
                  </View>
                ) : (
                  <View className="bg-gray-100 rounded-xl p-6 w-40 h-40 items-center justify-center border-2 border-dashed border-gray-300">
                    <Ionicons name="qr-code-outline" size={48} color="#9ca3af" />
                    <Text className="text-gray-400 text-xs text-center mt-2">QR code not available</Text>
                  </View>
                )}

                <Text className="text-gray-500 text-sm mt-2 text-center">
                  Amount to pay: <Text className="font-bold text-orange-600">₱{remainingBalance.toLocaleString()}</Text>
                </Text>

                {gcashNumber ? (
                  <View className="mt-3 bg-blue-50 rounded-xl px-4 py-2 border border-blue-200">
                    <Text className="text-[10px] text-gray-500 text-center">GCash Number</Text>
                    <Text className="text-sm font-bold text-gray-800 tracking-wide text-center">{gcashNumber}</Text>
                  </View>
                ) : null}
              </View>

              <View className="bg-blue-50 rounded-xl p-3 mb-4">
                <Text className="text-blue-800 font-semibold text-sm mb-1">📋 How to Pay:</Text>
                <View className="space-y-1">
                  <Text className="text-gray-600 text-xs">1. Open GCash app → Tap "Pay QR"</Text>
                  <Text className="text-gray-600 text-xs">2. Scan the QR code above</Text>
                  <Text className="text-gray-600 text-xs">3. Enter amount: <Text className="font-bold">₱{remainingBalance.toLocaleString()}</Text></Text>
                  <Text className="text-gray-600 text-xs">4. Complete payment & take a screenshot</Text>
                  <Text className="text-gray-600 text-xs">5. Upload the screenshot below</Text>
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold text-sm mb-2">Payment Method</Text>
                <TouchableOpacity className="flex-row items-center justify-center p-4 rounded-xl border-2 border-pink-500 bg-pink-50" disabled>
                  <View className="w-8 h-8 bg-blue-100 rounded-full items-center justify-center mr-3">
                    <Ionicons name="phone-portrait-outline" size={16} color="#3b82f6" />
                  </View>
                  <Text className="font-semibold text-pink-600">GCash</Text>
                  <View className="ml-auto w-5 h-5 rounded-full bg-pink-500 items-center justify-center">
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                </TouchableOpacity>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold text-sm mb-2">Upload Payment Proof</Text>
                <Text className="text-gray-500 text-xs mb-2">
                  Take a screenshot of your GCash payment receipt and upload it here
                </Text>

                <TouchableOpacity
                  className="flex-row items-center justify-center p-4 border-2 border-dashed border-pink-300 rounded-xl bg-pink-50"
                  onPress={onPickImage}
                  disabled={isProcessingPayment}
                >
                  <Ionicons name={paymentProof ? "checkmark-circle" : "cloud-upload-outline"} size={24}
                    color={paymentProof ? "#10b981" : "#ec4899"} />
                  <Text className={`ml-2 font-semibold ${paymentProof ? 'text-green-600' : 'text-pink-500'}`}>
                    {paymentProof ? 'Receipt Uploaded ✓' : 'Tap to Upload Receipt'}
                  </Text>
                </TouchableOpacity>

                {paymentProof && (
                  <View className="mt-2">
                    <Image source={{ uri: paymentProof.uri }} className="w-full h-48 rounded-xl" resizeMode="cover" />
                    <TouchableOpacity className="mt-1 self-end" onPress={onRemoveProof}>
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
                    This will be reviewed by our staff to confirm your payment.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                className={`py-4 rounded-xl ${!paymentProof ? 'bg-gray-400' : 'bg-pink-500'}`}
                onPress={onConfirm}
                disabled={!paymentProof || isProcessingPayment}
              >
                <Text className="text-white text-center font-semibold text-lg">
                  {isProcessingPayment ? 'Processing...' : 'Confirm Payment'}
                </Text>
              </TouchableOpacity>

              {!paymentProof && (
                <Text className="text-gray-400 text-xs text-center mt-2">
                  Please upload your payment receipt
                </Text>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

// ═════════════════════════════════════════════════════════════
// Main dashboard
// ═════════════════════════════════════════════════════════════
type DashboardTab = 'home' | 'book' | 'history' | 'settings' | 'request-cancel' | 'request-reschedule';

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState<DashboardTab>('home');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(0);
  const [upcomingCount, setUpcomingCount] = useState(0);

  const [now, setNow] = useState(new Date());

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedAppointmentForPayment, setSelectedAppointmentForPayment] = useState<Appointment | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>('gcash');
  const [paymentProof, setPaymentProof] = useState<any>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [selectedAppointmentForReceipt, setSelectedAppointmentForReceipt] = useState<Appointment | null>(null);

  const [qrImageUrl, setQrImageUrl] = useState<string | null>(null);
  const [gcashNumber, setGcashNumber] = useState<string | null>(null);
  const [isLoadingQr, setIsLoadingQr] = useState(false);

  const [myRequests, setMyRequests] = useState<AppointmentRequest[]>([]);
  const [selectedAppointmentForRequest, setSelectedAppointmentForRequest] = useState<Appointment | null>(null);
  const [requestReason, setRequestReason] = useState('');
  const [requestPreferredDate, setRequestPreferredDate] = useState('');
  const [requestPreferredTime, setRequestPreferredTime] = useState('');
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const [isWithdrawingRequest, setIsWithdrawingRequest] = useState(false);

  const [openScheduleDates, setOpenScheduleDates] = useState<string[]>([]);
  const [isLoadingDates, setIsLoadingDates] = useState(false);
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);

  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [showTimePickerModal, setShowTimePickerModal] = useState(false);

  const { user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  // ── Fetch staff ──
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) {
        staffData = response.data.map((s: any) => ({
          id: s.id,
          first_name: s.first_name,
          last_name: s.last_name,
          profile_image: s.profile_image,
        }));
      }
      setStaff(staffData);
      return staffData;
    } catch { return []; }
  };

  const fetchQrCode = async () => {
    setIsLoadingQr(true);
    try {
      const response = await api.get('/qr-code');
      const data = response.data;
      setQrImageUrl(getImageUrl(data?.qr_image || data?.qr_image_path) || null);
      setGcashNumber(data?.gcash_number || null);
      return data;
    } catch {
      setQrImageUrl(null);
      setGcashNumber(null);
      return null;
    } finally {
      setIsLoadingQr(false);
    }
  };

  const fetchOpenScheduleDates = async () => {
    setIsLoadingDates(true);
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);

        const today = getTodayLocalStr();
        const futureOpenDates = response.data
          .filter((schedule: BusinessSchedule) => schedule.is_open === 1 && schedule.business_date >= today)
          .map((schedule: BusinessSchedule) => schedule.business_date)
          .sort();
        setOpenScheduleDates(futureOpenDates);
        return futureOpenDates;
      }
      setOpenScheduleDates([]);
      return [];
    } catch {
      setOpenScheduleDates([]);
      return [];
    } finally {
      setIsLoadingDates(false);
    }
  };

  const getPreferredDateTimeSlots = (): string[] => {
    if (!requestPreferredDate) return [];
    const schedule = businessSchedules.find(s => s.business_date === requestPreferredDate);
    if (!schedule) return [];
    return generateTimeSlots(schedule.open_time, schedule.close_time);
  };

  const fetchMyRequests = async () => {
    try {
      const response = await api.get('/user/appointment/requests');
      let data: AppointmentRequest[] = [];
      if (Array.isArray(response.data)) data = response.data;
      setMyRequests(data);
      return data;
    } catch {
      setMyRequests([]);
      return [];
    }
  };

  const fetchUserAppointments = async (staffOverride?: StaffMember[]) => {
    setIsLoading(true);
    try {
      const response = await api.get("/appointments");
      const activeStaff = staffOverride ?? staff;

      let transactions: Transaction[] = [];
      if (Array.isArray(response.data)) {
        transactions = response.data.map((item: any) => ({
          id: item.id,
          appointment_id: item.id,
          service_id: item.service_id,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price,
          service_status: item.service_status,
          assigned_employee_id: item.assigned_employee_id,
        }));
      }

      const appointmentMap = new Map<number, any>();

      transactions.forEach((transaction) => {
        const appointmentId = transaction.appointment_id;

        if (!appointmentMap.has(appointmentId)) {
          const originalData = response.data.find((item: any) => item.id === appointmentId);
          appointmentMap.set(appointmentId, {
            id: appointmentId,
            customer_id: user?.id || 0,
            appointment_date: originalData?.appointment_date || '',
            appointment_time: originalData?.appointment_time || '',
            status: originalData?.status || '',
            services: [],
            billing_total_amount: originalData?.billing_total_amount ?? null,
            billing_paid_amount: originalData?.billing_paid_amount ?? null,
            billing_balance: originalData?.billing_balance ?? null,
            billing_payment_type: originalData?.billing_payment_type ?? null,
            assigned_employee_id: originalData?.assigned_employee_id ?? null,
            grace_period_minutes: originalData?.grace_period_minutes ?? null,
            grace_period_ends_at: originalData?.grace_period_ends_at ?? null,
          });
        }

        const appointment = appointmentMap.get(appointmentId)!;
        appointment.services.push({
          service_name: transaction.service_name || 'Unknown Service',
          duration_minutes: transaction.duration_minutes || 0,
          price: transaction.price || '0',
          service_status: transaction.service_status || 'pending'
        });
      });

      const groupedAppointments: Appointment[] = Array.from(appointmentMap.values()).map((appointment) => {
        const serviceNames = appointment.services.map((s: any) => s.service_name);
        const totalDuration = appointment.services.reduce((sum: number, s: any) => sum + s.duration_minutes, 0);
        const basePriceSum = appointment.services.reduce((sum: number, s: any) => sum + parseFloat(s.price || '0'), 0);
        const totalPrice = (appointment.billing_total_amount != null && appointment.billing_total_amount > 0)
          ? appointment.billing_total_amount
          : basePriceSum;

        const billingBalance = appointment.billing_balance ?? null;
        const hasRemainingBalance = (billingBalance != null) ? billingBalance > 0 : true;

        const stylistMember = activeStaff.find(s => s.id === appointment.assigned_employee_id);
        const stylistName = stylistMember
          ? `${stylistMember.first_name} ${stylistMember.last_name}`
          : 'Not assigned';

        const overallStatus = appointment.services.some((s: any) => s.service_status === 'pending')
          ? 'pending'
          : appointment.services.every((s: any) => s.service_status === 'completed')
            ? 'completed'
            : 'in_progress';

        return {
          id: appointment.id,
          customer_id: appointment.customer_id,
          appointment_date: appointment.appointment_date,
          appointment_time: appointment.appointment_time,
          status: appointment.status,
          service_names: serviceNames,
          services: appointment.services,
          total_price: totalPrice,
          total_duration: totalDuration,
          service_name: serviceNames.join(' + '),
          duration_minutes: totalDuration,
          price: totalPrice.toString(),
          service_status: overallStatus,

          billing_total_amount: appointment.billing_total_amount ?? totalPrice,
          billing_paid_amount: appointment.billing_paid_amount ?? 0,
          billing_balance: appointment.billing_balance ?? (totalPrice / 2),
          billing_payment_type: appointment.billing_payment_type ?? 'downpayment',
          has_remaining_balance: hasRemainingBalance,

          stylist_name: stylistName,
          stylist_id: appointment.assigned_employee_id ?? undefined,

          grace_period_minutes: appointment.grace_period_minutes ?? 30,
          grace_period_ends_at: appointment.grace_period_ends_at ?? null,
        };
      });

      setAppointments(groupedAppointments);

      const upcoming = groupedAppointments.filter((item) => {
        if (isGracePeriodExpired(item, new Date())) return false;
        return item.status === "pending" || item.status === "confirmed";
      });
      setUpcomingCount(upcoming.length);

      const total = groupedAppointments
        .filter((item: Appointment) => item.service_status === "completed")
        .reduce((sum: number, item: Appointment) => sum + (item.billing_paid_amount ?? (item.total_price / 2)), 0);
      setTotalSpent(total);

      return groupedAppointments;
    } catch {
      return [];
    } finally {
      setIsLoading(false);
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
          created_at: service.created_at,
          updated_at: service.updated_at,
        }));
      }
      setServices(servicesData);
      return servicesData;
    } catch { return []; }
  };

  const pickImageFromGallery = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        let fileType = 'jpeg';
        if (asset.mimeType) {
          const mimeParts = asset.mimeType.split('/');
          if (mimeParts.length > 1) fileType = mimeParts[1];
        } else if (asset.uri) {
          const uriParts = asset.uri.split('.');
          fileType = uriParts[uriParts.length - 1].toLowerCase();
        }
        setPaymentProof({
          uri: asset.uri,
          name: asset.name || `payment_${Date.now()}.${fileType}`,
          type: asset.mimeType || `image/${fileType}`,
        });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const isGracePeriodExpired = (item: Appointment, ref: Date = new Date()) => {
    if (!item.grace_period_ends_at) return false;
    try {
      const end = new Date(item.grace_period_ends_at);
      return ref.getTime() > end.getTime();
    } catch { return false; }
  };

  const getGraceStatus = (item: Appointment, ref: Date = now): GraceStatus => {
    if (!item.appointment_date || !item.appointment_time || !item.grace_period_ends_at) {
      return { kind: 'no_time' };
    }
    const todayStr = getTodayLocalStr();
    if (item.appointment_date !== todayStr) return { kind: 'not_today' };

    const start = new Date(`${item.appointment_date}T${item.appointment_time.slice(0, 5)}:00`);
    const graceEnd = new Date(item.grace_period_ends_at);
    const refMs = ref.getTime();

    if (refMs < start.getTime()) {
      const minutes = Math.max(0, Math.round((start.getTime() - refMs) / 60000));
      return { kind: 'upcoming', minutesUntilStart: minutes };
    }
    if (refMs <= graceEnd.getTime()) {
      const minutes = Math.max(0, Math.round((graceEnd.getTime() - refMs) / 60000));
      return { kind: 'in_grace', minutesLeft: minutes };
    }
    return { kind: 'expired' };
  };

  const handlePayBalance = (appointment: Appointment) => {
    setSelectedAppointmentForPayment(appointment);
    setSelectedPaymentMethod('gcash');
    setPaymentProof(null);
    setShowPaymentModal(true);
  };

  const handleClosePaymentModal = () => {
    setShowPaymentModal(false);
    setSelectedAppointmentForPayment(null);
    setSelectedPaymentMethod('gcash');
    setPaymentProof(null);
  };

  const handleViewReceipt = (appointment: Appointment) => {
    setSelectedAppointmentForReceipt(appointment);
    setShowReceiptModal(true);
  };

  const handleCloseReceiptModal = () => {
    setShowReceiptModal(false);
    setSelectedAppointmentForReceipt(null);
  };

  const handleConfirmPayment = async () => {
    if (!selectedAppointmentForPayment) {
      Alert.alert("Error", "No appointment selected for payment.");
      return;
    }
    if (!paymentProof) {
      Alert.alert("Upload Required", "Please upload your payment receipt as proof of payment.");
      return;
    }

    setIsProcessingPayment(true);
    try {
      const totalAmount = selectedAppointmentForPayment.billing_total_amount ?? selectedAppointmentForPayment.total_price ?? 0;
      const paidAmount = selectedAppointmentForPayment.billing_paid_amount ?? 0;
      const remainingBalance = selectedAppointmentForPayment.billing_balance ?? (totalAmount - paidAmount);

      const formData = new FormData();
      formData.append('appointment_id', selectedAppointmentForPayment.id.toString());
      formData.append('total_amount', remainingBalance.toString());
      formData.append('payment_type', 'remaining');
      formData.append('payment_method', selectedPaymentMethod || 'gcash');

      if (paymentProof) {
        let fileType = 'jpeg';
        let mimeType = 'image/jpeg';
        if (paymentProof.type) {
          mimeType = paymentProof.type;
          const mimeParts = mimeType.split('/');
          if (mimeParts.length > 1) fileType = mimeParts[1];
        } else if (paymentProof.uri) {
          const uriParts = paymentProof.uri.split('.');
          fileType = uriParts[uriParts.length - 1].toLowerCase();
          mimeType = `image/${fileType}`;
        }
        const validTypes = ['jpeg', 'jpg', 'png', 'gif'];
        if (!validTypes.includes(fileType)) {
          fileType = 'jpeg';
          mimeType = 'image/jpeg';
        }
        formData.append('payment_proof', {
          uri: paymentProof.uri,
          name: paymentProof.name || `payment_${Date.now()}.${fileType}`,
          type: mimeType,
        } as any);
      }

      await api.post('/payment/remaining', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      Alert.alert("Payment Successful", "Your remaining balance has been paid. Thank you!");
      handleClosePaymentModal();
      await fetchStaff();
      await fetchUserAppointments();
    } catch (error: any) {
      Alert.alert(
        "Payment Failed",
        error.response?.data?.message || "Failed to process payment. Please try again."
      );
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const getUpcomingAppointments = () => {
    return appointments.filter((item: Appointment) => {
      if (isGracePeriodExpired(item, now)) return false;
      return item.status === "pending" || item.status === "confirmed";
    });
  };

  const getPendingRequestFor = (appointmentId: number): AppointmentRequest | null => {
    const list = myRequests
      .filter(r => r.appointment_id === appointmentId && r.request_status === 'pending')
      .sort((a, b) => (b.id - a.id));
    return list[0] || null;
  };

  const openCancelRequest = (appointment: Appointment) => {
    setSelectedAppointmentForRequest(appointment);
    setRequestReason('');
    setRequestPreferredDate('');
    setRequestPreferredTime('');
    setActiveTab('request-cancel');
  };

  const openRescheduleRequest = async (appointment: Appointment) => {
    setSelectedAppointmentForRequest(appointment);
    setRequestReason('');
    setRequestPreferredDate(appointment.appointment_date || '');
    setRequestPreferredTime((appointment.appointment_time || '').slice(0, 5));
    setActiveTab('request-reschedule');
    await fetchOpenScheduleDates();
  };

  const closeRequestPage = () => {
    setActiveTab('home');
    setSelectedAppointmentForRequest(null);
    setRequestReason('');
    setRequestPreferredDate('');
    setRequestPreferredTime('');
    setShowDatePickerModal(false);
    setShowTimePickerModal(false);
  };

  const submitAppointmentRequest = async () => {
    if (!selectedAppointmentForRequest) return;

    const type = activeTab === 'request-cancel' ? 'cancel' : 'reschedule';

    if (type === 'cancel' && !requestReason.trim()) {
      Alert.alert('Reason Required', 'Please tell us why you want to cancel.');
      return;
    }
    if (type === 'reschedule') {
      if (!requestPreferredDate.trim()) {
        Alert.alert('Preferred Date Required', 'Please pick a preferred date.');
        return;
      }
      if (!requestPreferredTime.trim()) {
        Alert.alert('Preferred Time Required', 'Please pick a preferred time.');
        return;
      }
    }

    setIsSubmittingRequest(true);
    try {
      await api.post('/user/appointment/requests/submit', {
        appointment_id: selectedAppointmentForRequest.id,
        request_type: type,
        reason: requestReason.trim() || null,
        preferred_date: type === 'reschedule' ? requestPreferredDate.trim() : null,
        preferred_time: type === 'reschedule' ? requestPreferredTime.trim() : null,
      });

      Alert.alert(
        'Request Submitted',
        type === 'cancel'
          ? 'Your cancellation request has been sent. The salon will review it shortly.'
          : 'Your reschedule request has been sent. The salon will review it shortly.',
        [{ text: 'OK', onPress: () => { closeRequestPage(); fetchMyRequests(); } }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit request.');
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  // ✅ Withdraw request — route now takes the ID in the URL: /user/appointment/request/cancel/{id}
  const withdrawRequest = async (requestId: number) => {
    Alert.alert(
      'Withdraw Request',
      'Are you sure you want to withdraw this pending request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Withdraw',
          style: 'destructive',
          onPress: async () => {
            setIsWithdrawingRequest(true);
            try {
              await api.post(`/user/appointment/request/cancel/${requestId}`);
              Alert.alert('Withdrawn', 'Your request has been withdrawn.');
              await fetchMyRequests();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to withdraw request.');
            } finally {
              setIsWithdrawingRequest(false);
            }
          },
        },
      ]
    );
  };

  useEffect(() => {
    const loadInitial = async () => {
      const staffData = await fetchStaff();
      await fetchUserAppointments(staffData);
      await fetchServices();
      await fetchQrCode();
      await fetchMyRequests();
    };
    loadInitial();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (activeTab !== 'home') return;
    const id = setInterval(() => {
      fetchUserAppointments();
      fetchMyRequests();
    }, 120000);
    return () => clearInterval(id);
  }, [activeTab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    const staffData = await fetchStaff();
    await Promise.all([
      fetchUserAppointments(staffData),
      fetchServices(),
      fetchQrCode(),
      fetchMyRequests(),
    ]);
    setRefreshing(false);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch {
      router.replace("/");
    }
  };

  const handleBookingSuccess = async () => {
    setRefreshTrigger(prev => prev + 1);
    const staffData = await fetchStaff();
    await fetchUserAppointments(staffData);
    await fetchMyRequests();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      case 'no_show': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // ── Cancel Request page ──
  const renderCancelRequestPage = () => {
    const appt = selectedAppointmentForRequest;
    if (!appt) return null;

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-pink-500 px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={closeRequestPage} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold ml-2">Request Cancellation</Text>
          </View>
        </View>

        <View className="px-5 mt-5">
          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
            <Text className="text-xs text-gray-500 mb-1">Appointment</Text>
            <Text className="text-base font-bold text-gray-800">
              {appt.service_names?.join(' + ') || appt.service_name || 'Appointment'}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">{formatDate(appt.appointment_date)}</Text>
            </View>
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="time-outline" size={12} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">{formatTime(appt.appointment_time)}</Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
            <Text className="text-sm font-semibold text-gray-700 mb-1">Reason for Cancellation *</Text>
            <TextInput
              value={requestReason}
              onChangeText={setRequestReason}
              placeholder="Tell us why you want to cancel..."
              multiline
              numberOfLines={4}
              className="border border-gray-200 rounded-xl p-3 text-gray-800 min-h-[110px] text-sm"
              textAlignVertical="top"
            />
          </View>

          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5">
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={16} color="#eab308" />
              <Text className="text-yellow-700 text-xs flex-1">
                The salon will review your request. You will be notified once it is approved or rejected.
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-gray-300 bg-white"
              onPress={closeRequestPage}
              disabled={isSubmittingRequest}
            >
              <Text className="text-gray-700 text-center font-semibold">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl"
              style={{ backgroundColor: isSubmittingRequest ? '#f9a8d4' : '#ec4899' }}
              onPress={submitAppointmentRequest}
              disabled={isSubmittingRequest}
            >
              <Text className="text-white text-center font-semibold">
                {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Reschedule Request page ──
  const renderRescheduleRequestPage = () => {
    const appt = selectedAppointmentForRequest;
    if (!appt) return null;

    const timeSlots = getPreferredDateTimeSlots();
    const hasDatePicked = !!requestPreferredDate;

    return (
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <View className="bg-pink-500 px-5 pb-6" style={{ paddingTop: insets.top + 12 }}>
          <View className="flex-row items-center">
            <TouchableOpacity onPress={closeRequestPage} className="p-2">
              <Ionicons name="arrow-back" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-xl font-bold ml-2">Request Reschedule</Text>
          </View>
        </View>

        <View className="px-5 mt-5">
          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
            <Text className="text-xs text-gray-500 mb-1">Current Appointment</Text>
            <Text className="text-base font-bold text-gray-800">
              {appt.service_names?.join(' + ') || appt.service_name || 'Appointment'}
            </Text>
            <View className="flex-row items-center mt-1">
              <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">{formatDate(appt.appointment_date)}</Text>
            </View>
            <View className="flex-row items-center mt-0.5">
              <Ionicons name="time-outline" size={12} color="#9ca3af" />
              <Text className="text-gray-500 text-xs ml-1">{formatTime(appt.appointment_time)}</Text>
            </View>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
            <Text className="text-sm font-semibold text-gray-700 mb-1">Preferred New Date *</Text>

            <TouchableOpacity
              onPress={() => {
                if (isLoadingDates) return;
                setShowDatePickerModal(true);
              }}
              disabled={isLoadingDates}
              activeOpacity={0.7}
              className="border border-gray-200 rounded-xl px-3 py-3 mb-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={requestPreferredDate ? "#ec4899" : "#9ca3af"}
                />
                <Text
                  className={`ml-2 text-sm ${
                    requestPreferredDate ? 'text-gray-800' : 'text-gray-400'
                  }`}
                >
                  {isLoadingDates
                    ? 'Loading available dates...'
                    : requestPreferredDate
                      ? formatLongDate(requestPreferredDate)
                      : 'Select an available date'}
                </Text>
              </View>
              <Ionicons
                name="chevron-down"
                size={18}
                color={isLoadingDates ? "#d1d5db" : "#9ca3af"}
              />
            </TouchableOpacity>

            {!isLoadingDates && openScheduleDates.length === 0 && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-3">
                <View className="flex-row items-start gap-2">
                  <Ionicons name="alert-circle-outline" size={16} color="#eab308" />
                  <Text className="text-yellow-700 text-xs flex-1">
                    No future open dates are available right now. Please try again later or contact the salon.
                  </Text>
                </View>
              </View>
            )}

            <Text className="text-sm font-semibold text-gray-700 mb-1">Preferred New Time *</Text>

            <TouchableOpacity
              onPress={() => {
                if (!hasDatePicked) {
                  Alert.alert('Pick a date first', 'Please choose your preferred date before selecting a time.');
                  return;
                }
                if (timeSlots.length === 0) {
                  Alert.alert('No slots', 'No time slots are available for the selected date.');
                  return;
                }
                setShowTimePickerModal(true);
              }}
              activeOpacity={0.7}
              className="border border-gray-200 rounded-xl px-3 py-3 flex-row items-center justify-between"
            >
              <View className="flex-row items-center flex-1">
                <Ionicons
                  name="time-outline"
                  size={18}
                  color={requestPreferredTime ? "#ec4899" : "#9ca3af"}
                />
                {requestPreferredTime ? (
                  <View className="flex-row items-center ml-2">
                    <Text className="text-sm text-gray-800">
                      {formatTime(requestPreferredTime).replace(/\s?(AM|PM)$/i, '')}
                    </Text>
                    <View className="ml-2 bg-pink-100 px-2 py-0.5 rounded-md">
                      <Text className="text-[10px] font-black text-pink-600 tracking-wide">
                        {requestPreferredTime.split(':')[0] && parseInt(requestPreferredTime.split(':')[0], 10) >= 12 ? 'PM' : 'AM'}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text className={`ml-2 text-sm ${hasDatePicked ? 'text-gray-400' : 'text-gray-400'}`}>
                    {hasDatePicked ? 'Select a preferred time' : 'Pick a date first'}
                  </Text>
                )}
              </View>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>

            <Text className="text-gray-400 text-[10px] mt-1">
              Available slots are based on the salon's business hours for the selected date.
            </Text>
          </View>

          <View className="bg-white rounded-2xl p-4 mb-4" style={{ elevation: 2 }}>
            <Text className="text-sm font-semibold text-gray-700 mb-1">Reason (optional)</Text>
            <TextInput
              value={requestReason}
              onChangeText={setRequestReason}
              placeholder="Why do you need to reschedule?"
              multiline
              numberOfLines={3}
              className="border border-gray-200 rounded-xl p-3 text-gray-800 min-h-[90px] text-sm"
              textAlignVertical="top"
            />
          </View>

          <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-5">
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={16} color="#eab308" />
              <Text className="text-yellow-700 text-xs flex-1">
                Your preferred date and time are just a request. The salon may propose a different slot when approving.
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3 mb-5">
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl border border-gray-300 bg-white"
              onPress={closeRequestPage}
              disabled={isSubmittingRequest}
            >
              <Text className="text-gray-700 text-center font-semibold">Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 py-3 rounded-xl"
              style={{ backgroundColor: isSubmittingRequest ? '#f9a8d4' : '#ec4899' }}
              onPress={submitAppointmentRequest}
              disabled={isSubmittingRequest}
            >
              <Text className="text-white text-center font-semibold">
                {isSubmittingRequest ? 'Submitting...' : 'Submit Request'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  };

  // ── Date picker bottom sheet ──
  const renderDatePickerModal = () => {
    return (
      <Modal
        transparent
        animationType="slide"
        visible={showDatePickerModal}
        onRequestClose={() => setShowDatePickerModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '80%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">Pick a Preferred Date</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {openScheduleDates.length} available date{openScheduleDates.length === 1 ? '' : 's'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {openScheduleDates.length === 0 ? (
              <View className="py-10 items-center">
                <Ionicons name="calendar-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-center mt-3">No available dates</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
                {openScheduleDates.map((date) => {
                  const isSelected = requestPreferredDate === date;
                  return (
                    <TouchableOpacity
                      key={date}
                      onPress={() => {
                        setRequestPreferredDate(date);
                        setRequestPreferredTime('');
                        setShowDatePickerModal(false);
                      }}
                      activeOpacity={0.75}
                      className={`flex-row items-center justify-between py-3 px-4 mb-2 rounded-xl border-2 ${
                        isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                      }`}
                    >
                      <View className="flex-row items-center">
                        <Ionicons
                          name="calendar-outline"
                          size={18}
                          color={isSelected ? '#ec4899' : '#9ca3af'}
                        />
                        <Text
                          className={`ml-2 ${
                            isSelected ? 'text-pink-600 font-semibold' : 'text-gray-800'
                          }`}
                        >
                          {formatLongDate(date)}
                        </Text>
                      </View>
                      {isSelected && <Ionicons name="checkmark-circle" size={20} color="#ec4899" />}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  // ✅ Time picker bottom sheet — 12-hour format with prominent AM/PM indicator
  const renderTimePickerModal = () => {
    const timeSlots = getPreferredDateTimeSlots();
    const hasDatePicked = !!requestPreferredDate;

    const parseSlot = (slot: string) => {
      const [hStr, mStr] = slot.split(':');
      const hour24 = parseInt(hStr, 10);
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const displayHour = hour24 % 12 || 12;
      return {
        display: `${displayHour}:${mStr}`,
        period,
        hour24,
        minutes: mStr,
      };
    };

    const morningSlots: string[] = [];
    const afternoonSlots: string[] = [];
    const eveningSlots: string[] = [];

    timeSlots.forEach((slot) => {
      const { hour24 } = parseSlot(slot);
      if (hour24 < 12) morningSlots.push(slot);
      else if (hour24 < 17) afternoonSlots.push(slot);
      else eveningSlots.push(slot);
    });

    const renderGroup = (label: string, slots: string[], iconName: any) => {
      if (slots.length === 0) return null;
      return (
        <View className="mb-3" key={label}>
          <View className="flex-row items-center mb-2">
            <View className="w-6 h-6 rounded-full bg-pink-100 items-center justify-center mr-2">
              <Ionicons name={iconName} size={13} color="#ec4899" />
            </View>
            <Text className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              {label}
            </Text>
            <View className="flex-1 h-px bg-gray-100 ml-2" />
          </View>

          <View className="flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
            {slots.map((slot) => {
              const isSelected = requestPreferredTime === slot;
              const { display, period } = parseSlot(slot);
              return (
                <View
                  key={slot}
                  style={{ width: '33.333%', paddingHorizontal: 4, marginBottom: 8 }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setRequestPreferredTime(slot);
                      setShowTimePickerModal(false);
                    }}
                    activeOpacity={0.75}
                    className={`rounded-xl border-2 py-2.5 items-center ${
                      isSelected ? 'border-pink-500 bg-pink-500' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <View className="flex-row items-baseline">
                      <Text
                        className={`text-base font-bold ${
                          isSelected ? 'text-white' : 'text-gray-800'
                        }`}
                      >
                        {display}
                      </Text>
                      <Text
                        className={`text-[10px] font-black ml-1 ${
                          isSelected ? 'text-white' : 'text-pink-500'
                        }`}
                      >
                        {period}
                      </Text>
                    </View>
                    <View
                      className={`h-0.5 w-6 rounded-full mt-1 ${
                        isSelected ? 'bg-white' : 'bg-pink-200'
                      }`}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>
      );
    };

    return (
      <Modal
        transparent
        animationType="slide"
        visible={showTimePickerModal}
        onRequestClose={() => setShowTimePickerModal(false)}
      >
        <View className="flex-1 justify-end bg-black/50">
          <View className="bg-white rounded-t-3xl p-6" style={{ maxHeight: '85%' }}>
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-1">
                <Text className="text-lg font-semibold text-gray-800">Pick a Preferred Time</Text>
                <Text className="text-xs text-gray-400 mt-0.5">
                  {hasDatePicked
                    ? `Available on ${formatLongDate(requestPreferredDate)}`
                    : 'Pick a date first'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setShowTimePickerModal(false)}>
                <Ionicons name="close" size={24} color="#9ca3af" />
              </TouchableOpacity>
            </View>

            {hasDatePicked && timeSlots.length > 0 && (
              <View className="flex-row items-center justify-between mb-3 px-3 py-2 bg-pink-50 rounded-xl border border-pink-100">
                <View className="flex-row items-center">
                  <Ionicons name="sunny-outline" size={14} color="#ec4899" />
                  <Text className="text-[11px] text-gray-700 ml-1.5">
                    <Text className="font-bold text-pink-600">AM</Text>
                    {' '}= Morning
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Ionicons name="moon-outline" size={14} color="#ec4899" />
                  <Text className="text-[11px] text-gray-700 ml-1.5">
                    <Text className="font-bold text-pink-600">PM</Text>
                    {' '}= Afternoon / Evening
                  </Text>
                </View>
              </View>
            )}

            {!hasDatePicked || timeSlots.length === 0 ? (
              <View className="py-10 items-center">
                <Ionicons name="time-outline" size={48} color="#d1d5db" />
                <Text className="text-gray-500 text-center mt-3">
                  {hasDatePicked ? 'No time slots available for this date' : 'Please pick a date first'}
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {renderGroup('Morning', morningSlots, 'sunny-outline')}
                {renderGroup('Afternoon', afternoonSlots, 'partly-sunny-outline')}
                {renderGroup('Evening', eveningSlots, 'moon-outline')}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView
            showsVerticalScrollIndicator={false}
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
            }
          >
            <View
              className="bg-pink-500 px-5 pb-8"
              style={{
                paddingTop: insets.top + 12,
                borderBottomLeftRadius: 30,
                borderBottomRightRadius: 30,
              }}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Welcome Back, {user?.first_name}! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have {upcomingCount} Upcoming Appointment(s)
                  </Text>
                </View>

                <TouchableOpacity
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 9999 }}
                >
                  <Ionicons name="notifications-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row justify-between px-4 mt-6" style={{ marginTop: -25 }}>
              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Upcoming</Text>
                  <View className="bg-pink-100 p-2 rounded-full">
                    <Ionicons name="calendar" size={18} color="#ec4899" />
                  </View>
                </View>
                <Text className="text-pink-500 text-3xl font-bold mt-3">{upcomingCount}</Text>
                <Text className="text-gray-400 text-xs mt-1">Appointments</Text>
              </View>

              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Total Spent</Text>
                  <View className="bg-green-100 p-2 rounded-full">
                    <Ionicons name="cash-outline" size={18} color="#10b981" />
                  </View>
                </View>
                <Text className="text-green-600 text-3xl font-bold mt-3">₱{totalSpent.toLocaleString()}</Text>
                <Text className="text-gray-400 text-xs mt-1">All Time</Text>
              </View>
            </View>

            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Upcoming Appointments</Text>
                <TouchableOpacity className="flex-row items-center" onPress={() => setActiveTab('history')}>
                  <Text className="text-pink-500 font-semibold mr-1">View All</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View className="py-10">
                  <Text className="text-center text-gray-500">Loading appointments...</Text>
                </View>
              ) : getUpcomingAppointments().length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                  <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">No upcoming appointments</Text>
                  <TouchableOpacity className="mt-4 bg-pink-500 px-6 py-2 rounded-full" onPress={() => setActiveTab('book')}>
                    <Text className="text-white font-semibold">Book Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                getUpcomingAppointments().map((item: Appointment) => {
                  const remainingBalance = item.billing_balance ?? 0;
                  const paidAmount = item.billing_paid_amount ?? 0;
                  const hasRemainingBalance = remainingBalance > 0;

                  const isMultipleServices = item.services && item.services.length > 1;
                  const services = item.services || [];
                  const serviceNames = item.service_names || ['No Service'];

                  const graceStatus = getGraceStatus(item);
                  const pendingRequest = getPendingRequestFor(item.id);

                  return (
                    <View key={item.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                      <View className="flex-row justify-between items-start">
                        <View className="flex-1">
                          <View className="flex-row flex-wrap items-center">
                            <Text className="text-lg font-bold text-gray-800">
                              {serviceNames.join(' + ')}
                            </Text>
                            {isMultipleServices && (
                              <View className="ml-2 bg-pink-100 px-2 py-0.5 rounded-full">
                                <Text className="text-pink-600 text-xs font-semibold">
                                  {services.length} services
                                </Text>
                              </View>
                            )}
                          </View>

                          {services.length > 0 && (
                            <View className="mt-1">
                              {services.map((service, index) => (
                                <View key={index} className="flex-row items-center mt-1">
                                  <View className="w-1.5 h-1.5 bg-pink-400 rounded-full mr-2" />
                                  <Text className="text-gray-600 text-sm">
                                    {service.service_name} ({service.duration_minutes} mins) - ₱{parseFloat(service.price).toLocaleString()}
                                  </Text>
                                </View>
                              ))}
                            </View>
                          )}

                          <View className="flex-row items-center mt-2">
                            <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">{formatDate(item.appointment_date)}</Text>
                          </View>

                          {item.appointment_time && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1">{formatTime(item.appointment_time)}</Text>
                            </View>
                          )}

                          <View className="flex-row items-center mt-1">
                            <Ionicons name="person-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">
                              Stylist: <Text className="font-semibold text-gray-700">{item.stylist_name || 'Not assigned'}</Text>
                            </Text>
                          </View>

                          <View className="flex-row items-center mt-1">
                            <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
                            <Text className="text-gray-500 text-xs ml-1">Total: {item.total_duration} mins</Text>
                          </View>

                          {paidAmount > 0 && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="checkmark-circle-outline" size={14} color="#10b981" />
                              <Text className="text-green-600 text-xs ml-1">
                                Paid: ₱{paidAmount.toLocaleString()}
                              </Text>
                            </View>
                          )}
                          {hasRemainingBalance && (
                            <View className="flex-row items-center mt-1">
                              <Ionicons name="cash-outline" size={14} color="#f59e0b" />
                              <Text className="text-orange-500 text-xs ml-1 font-semibold">
                                Balance: ₱{remainingBalance.toLocaleString()}
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text className="text-pink-500 font-bold">
                          ₱{(item.billing_total_amount ?? item.total_price ?? 0).toLocaleString()}
                        </Text>
                      </View>

                      {graceStatus.kind === 'in_grace' && (
                        <View className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-2.5 flex-row items-center">
                          <Ionicons name="alarm-outline" size={16} color="#f97316" />
                          <Text className="text-orange-700 text-xs ml-2 flex-1">
                            <Text className="font-bold">Hurry!</Text>{' '}
                            You have {graceStatus.minutesLeft} min{graceStatus.minutesLeft === 1 ? '' : 's'} left
                            before this appointment is released.
                          </Text>
                        </View>
                      )}

                      {graceStatus.kind === 'upcoming' && graceStatus.minutesUntilStart <= 120 && (
                        <View className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-2.5 flex-row items-center">
                          <Ionicons name="time-outline" size={16} color="#3b82f6" />
                          <Text className="text-blue-700 text-xs ml-2 flex-1">
                            Your appointment starts in {graceStatus.minutesUntilStart} min{graceStatus.minutesUntilStart === 1 ? '' : 's'}.
                            Please arrive on time.
                          </Text>
                        </View>
                      )}

                      <View className="flex-row mt-2">
                        <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status || 'pending')}`}>
                          <Text className="text-xs font-semibold capitalize">{item.status || 'pending'}</Text>
                        </View>
                        {item.service_status && item.service_status !== 'pending' && (
                          <View className="ml-2 px-2 py-1 rounded-full bg-gray-100">
                            <Text className="text-xs font-semibold capitalize text-gray-600">Service: {item.service_status}</Text>
                          </View>
                        )}
                      </View>

                      {pendingRequest && (
                        <View className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                          <View className="flex-row items-center">
                            <Ionicons name="hourglass-outline" size={16} color="#d97706" />
                            <Text className="text-yellow-800 text-xs font-semibold ml-2 flex-1">
                              {pendingRequest.request_type === 'cancel'
                                ? 'Cancellation request pending'
                                : `Reschedule request pending${
                                    pendingRequest.preferred_date
                                      ? ` for ${formatDate(pendingRequest.preferred_date)}${
                                          pendingRequest.preferred_time
                                            ? ` at ${formatTime(pendingRequest.preferred_time)}`
                                            : ''
                                        }`
                                      : ''
                                  }`}
                            </Text>
                          </View>
                          <TouchableOpacity
                            className="mt-2 self-start"
                            onPress={() => withdrawRequest(pendingRequest.id)}
                            disabled={isWithdrawingRequest}
                          >
                            <Text className="text-red-500 text-xs font-semibold underline">
                              {isWithdrawingRequest ? 'Withdrawing...' : 'Withdraw Request'}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      <View className="flex-row mt-3 gap-2">
                        <TouchableOpacity
                          className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border border-pink-500"
                          onPress={() => handleViewReceipt(item)}
                        >
                          <Ionicons name="receipt-outline" size={18} color="#ec4899" />
                          <Text className="text-pink-500 font-semibold text-sm ml-2">View Receipt</Text>
                        </TouchableOpacity>

                        {hasRemainingBalance && (
                          <TouchableOpacity
                            className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                            style={{ backgroundColor: '#f97316' }}
                            onPress={() => handlePayBalance(item)}
                          >
                            <Ionicons name="cash-outline" size={18} color="white" />
                            <Text className="text-white font-semibold text-sm ml-2">Pay Balance</Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      {!pendingRequest && (item.status === 'pending' || item.status === 'confirmed') && (
                        <View className="flex-row mt-2 gap-2">
                          <TouchableOpacity
                            className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border border-blue-500"
                            onPress={() => openRescheduleRequest(item)}
                          >
                            <Ionicons name="calendar-outline" size={18} color="#3b82f6" />
                            <Text className="text-blue-600 font-semibold text-sm ml-2">Request Reschedule</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center border border-red-500"
                            onPress={() => openCancelRequest(item)}
                          >
                            <Ionicons name="close-circle-outline" size={18} color="#ef4444" />
                            <Text className="text-red-500 font-semibold text-sm ml-2">Request Cancellation</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          </ScrollView>
        );

      case 'book':
        return <CustomerBooking onBookingSuccess={handleBookingSuccess} />;

      case 'history':
        return <CustomerHistoryTab refreshTrigger={refreshTrigger} />;

      case 'settings':
        return <CustomerSettingsTab onLogout={handleLogout} />;

      case 'request-cancel':
        return renderCancelRequestPage();

      case 'request-reschedule':
        return renderRescheduleRequestPage();

      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <StatusBar style="light" />

      <View className="flex-1">
        {renderContent()}
      </View>

      <PaymentModal
        visible={showPaymentModal}
        appointment={selectedAppointmentForPayment}
        paymentProof={paymentProof}
        isProcessingPayment={isProcessingPayment}
        onClose={handleClosePaymentModal}
        onPickImage={pickImageFromGallery}
        onRemoveProof={() => setPaymentProof(null)}
        onConfirm={handleConfirmPayment}
        qrImageUrl={qrImageUrl}
        gcashNumber={gcashNumber}
        isLoadingQr={isLoadingQr}
      />

      <ReceiptModal
        visible={showReceiptModal}
        appointment={selectedAppointmentForReceipt}
        customerName={user ? `${user.first_name} ${user.last_name}` : ''}
        stylistName={selectedAppointmentForReceipt?.stylist_name || 'Not assigned'}
        onClose={handleCloseReceiptModal}
      />

      {renderDatePickerModal()}
      {renderTimePickerModal()}

      {(activeTab !== 'request-cancel' && activeTab !== 'request-reschedule') && (
        <View className="flex-row justify-around items-center border-t border-gray-200 bg-white py-3 px-5">
          <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('home')}>
            <Ionicons name={activeTab === 'home' ? "home" : "home-outline"} size={24} color={activeTab === 'home' ? "#ec4899" : "#9ca3af"} />
            <Text className={`text-xs mt-1 ${activeTab === 'home' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>Home</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('book')}>
            <Ionicons name={activeTab === 'book' ? "calendar" : "calendar-outline"} size={24} color={activeTab === 'book' ? "#ec4899" : "#9ca3af"} />
            <Text className={`text-xs mt-1 ${activeTab === 'book' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>Book</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('history')}>
            <Ionicons name={activeTab === 'history' ? "heart" : "heart-outline"} size={24} color={activeTab === 'history' ? "#ec4899" : "#9ca3af"} />
            <Text className={`text-xs mt-1 ${activeTab === 'history' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>History</Text>
          </TouchableOpacity>

          <TouchableOpacity className="items-center py-1" onPress={() => setActiveTab('settings')}>
            <Ionicons name={activeTab === 'settings' ? "settings" : "settings-outline"} size={24} color={activeTab === 'settings' ? "#ec4899" : "#9ca3af"} />
            <Text className={`text-xs mt-1 ${activeTab === 'settings' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}