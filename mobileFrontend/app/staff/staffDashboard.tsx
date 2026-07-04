import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import api from '@/api/axios';
import StaffAppointments from "../staff/staffAppointments";
import StaffSchedule from "../staff/staffSchedule";

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
  };
  business_schedules?: BusinessSchedule;
}

interface Appointment {
  id: number;
  service_id?: number;
  customer_name: string;
  customer_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_status: string;
  service_name: string;
  duration_minutes: number;
  price: string;
  notes?: string;
  transaction_id: number;
  is_walk_in?: boolean;
}

interface InventoryItem {
  id: number;
  product_id: number;
  product_quantity: number;
  current_usages: number;
  reorder_level: number;
  expiration_date: string;
  products?: {
    id: number;
    product_name: string;
    description: string;
    price: number;
  };
}

interface WalkIn {
  id: number;
  customer_name: string;
  service_id: number;
  stylist_id: number;
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
}

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'schedule' | 'settings'>('home');
  const [refreshing, setRefreshing] = useState(false);
  
  // Remittance states
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [isSubmittingRemit, setIsSubmittingRemit] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);
  const [remitAmount, setRemitAmount] = useState(0);

  // Report states
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportAppointment, setReportAppointment] = useState<Appointment | null>(null);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [reportFormData, setReportFormData] = useState({
    incident_type: '',
    category: '',
    amount: '',
    description: '',
    inventory_id: '',
    transaction_id: ''
  });
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  
  const { 
    user, 
    staffAppointments, 
    fetchStaffAppointments, 
    updateServiceWithInventory,
    logout,
    employeeCommissions,
    fetchEmployeeCommissions,
    submitRemittance,
    fetchRemittances,
    submitLossDamage,
    fetchLossDamages,
    transactions,
    walkIns,
    fetchWalkIns
  } = useAuth();

  // Fetch inventory items
  const fetchInventoryItems = async () => {
    try {
      const response = await api.get('/inventory');
      console.log('Fetched inventory items:', response.data);
      if (Array.isArray(response.data)) {
        setInventoryItems(response.data);
      }
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  // Get UTC date string from Date object
  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  // Get today's date string
  const getTodayDateStr = () => {
    const today = new Date();
    return getUTCDateString(today);
  };

  // Calculate today's earnings including walk-ins
  const getTodayEarnings = () => {
    const todayStr = getTodayDateStr();
    const currentStaffId = user?.id;
    
    // Get today's completed appointments for this staff member
    const todayCompletedAppointments = staffAppointments.filter(app => {
      const appointmentDate = app.appointment_date;
      const isCompleted = app.service_status === 'completed' || app.status === 'completed';
      return appointmentDate === todayStr && isCompleted;
    });
    
    // Get today's completed walk-ins for this staff member
    const todayCompletedWalkIns = walkIns.filter((walkIn: WalkIn) => {
      const walkInDate = walkIn.created_at ? walkIn.created_at.split('T')[0] : '';
      const isFinished = walkIn.is_finished === 1;
      return walkInDate === todayStr && walkIn.stylist_id === currentStaffId && isFinished;
    });
    
    // Calculate total earnings from appointments
    const appointmentEarnings = todayCompletedAppointments.reduce((sum, app) => {
      const price = parseFloat(app.price) || 0;
      return sum + price;
    }, 0);
    
    // Calculate total earnings from walk-ins
    const walkInEarnings = todayCompletedWalkIns.reduce((sum, walkIn) => {
      const price = parseFloat(walkIn.services?.price || '0');
      return sum + price;
    }, 0);
    
    // Total earnings (appointments + walk-ins)
    const totalEarnings = appointmentEarnings + walkInEarnings;
    
    // Get the commission rate for this staff member
    const staffCommission = employeeCommissions.find(c => c.employee_id === user?.id);
    const commissionRate = staffCommission ? staffCommission.commission_amount : 0;
    
    // Calculate commission earnings (total earnings * commission rate)
    // Both appointments AND walk-ins are affected by the commission rate
    const commissionEarnings = totalEarnings * commissionRate;
    
    // Calculate profit (total earnings - commission earnings)
    const profit = totalEarnings - commissionEarnings;
    
    return {
      totalEarnings,
      commissionRate,
      commissionEarnings,
      profit,
      appointmentEarnings,
      walkInEarnings,
      appointmentCount: todayCompletedAppointments.length,
      walkInCount: todayCompletedWalkIns.length,
      totalCount: todayCompletedAppointments.length + todayCompletedWalkIns.length
    };
  };

  // Load remittance data
  const loadRemittanceData = () => {
    const earnings = getTodayEarnings();
    setTotalProfit(earnings.profit);
    setRemitAmount(earnings.profit);
  };

  // Handle open remit modal
  const handleOpenRemitModal = () => {
    loadRemittanceData();
    setShowRemitModal(true);
  };

  // Handle submit remittance
  const handleSubmitRemittance = async () => {
    if (remitAmount <= 0) {
      Alert.alert('Invalid Amount', 'Remittance amount must be greater than 0');
      return;
    }

    // Get today's business schedule
    const todayStr = getTodayDateStr();
    const schedule = businessSchedules.find(s => s.business_date === todayStr);
    
    if (!schedule) {
      Alert.alert('No Schedule', 'No business schedule found for today');
      return;
    }

    setIsSubmittingRemit(true);
    try {
      await submitRemittance({
        business_date_id: schedule.id,
        remittance_amount: remitAmount
      });
      
      Alert.alert('Success', 'Remittance submitted successfully!');
      setShowRemitModal(false);
      // Refresh data
      await Promise.all([
        fetchStaffAppointments(),
        fetchEmployeeCommissions(),
        fetchRemittances(),
        fetchWalkIns()
      ]);
    } catch (error: any) {
      console.error('Error submitting remittance:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit remittance');
    } finally {
      setIsSubmittingRemit(false);
    }
  };

  // Handle submit report
  const handleSubmitReport = async () => {
    // Validate form
    if (!reportFormData.incident_type) {
      Alert.alert('Validation Error', 'Please select an incident type');
      return;
    }
    if (!reportFormData.category) {
      Alert.alert('Validation Error', 'Please select a category');
      return;
    }
    if (!reportFormData.amount || parseFloat(reportFormData.amount) <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid amount');
      return;
    }
    if (!reportFormData.description) {
      Alert.alert('Validation Error', 'Please enter a description');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const today = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
      
      await submitLossDamage({
        date: dateStr,
        incident_type: reportFormData.incident_type,
        category: reportFormData.category,
        amount: parseFloat(reportFormData.amount),
        description: reportFormData.description,
        staff_id: user?.id || 0,
        inventory_id: reportFormData.inventory_id ? parseInt(reportFormData.inventory_id) : null,
        transaction_id: reportFormData.transaction_id ? parseInt(reportFormData.transaction_id) : null,
        status: 'reported'
      });
      
      Alert.alert('Success', 'Report submitted successfully!');
      setShowReportModal(false);
      setReportAppointment(null);
      setReportFormData({
        incident_type: '',
        category: '',
        amount: '',
        description: '',
        inventory_id: '',
        transaction_id: ''
      });
      // Refresh data
      await fetchLossDamages();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Filter appointments for today - using UTC date comparison
  const todayAppointments = staffAppointments.filter(app => {
    const today = getUTCDateString(new Date());
    return app.appointment_date === today;
  });

  // Calculate earnings from staff appointments
  const completedEarnings = staffAppointments
    .filter(app => app.service_status === 'completed' || app.status === 'completed')
    .reduce((sum, app) => sum + parseFloat(app.price || '0'), 0);

  const staffName = user ? `${user.first_name} ${user.last_name}` : 'Staff';

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  // Fetch business schedules - needed for remittance
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);

  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching business schedules:', error);
    }
  };

  // Fetch staff assignments - needed for schedule tab
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);

  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      if (Array.isArray(response.data)) {
        setStaffAssignments(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    if (user?.id) {
      console.log("Fetching data for user:", user.id);
      fetchStaffAppointments();
      fetchBusinessSchedules();
      fetchStaffAssignments();
      fetchEmployeeCommissions();
      fetchRemittances();
      fetchInventoryItems();
      fetchLossDamages();
      fetchWalkIns();
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStaffAppointments(),
      fetchBusinessSchedules(),
      fetchStaffAssignments(),
      fetchEmployeeCommissions(),
      fetchRemittances(),
      fetchInventoryItems(),
      fetchLossDamages(),
      fetchWalkIns()
    ]);
    setRefreshing(false);
  }, [fetchStaffAppointments, fetchEmployeeCommissions, fetchRemittances, fetchWalkIns]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("Logout Error.", error);
      router.replace("/");
    }
  };

  // Remittance Modal - Memoized to prevent re-renders
  const RemittanceModal = React.memo(() => {
    // Local state for the modal to prevent re-renders
    const [localRemitAmount, setLocalRemitAmount] = useState(remitAmount);
    const [localIsSubmitting, setLocalIsSubmitting] = useState(isSubmittingRemit);

    // Update local state when props change
    useEffect(() => {
      setLocalRemitAmount(remitAmount);
    }, [remitAmount]);

    useEffect(() => {
      setLocalIsSubmitting(isSubmittingRemit);
    }, [isSubmittingRemit]);

    const handleAmountChange = (text: string) => {
      const num = parseFloat(text) || 0;
      setLocalRemitAmount(num);
      // Update parent state
      setRemitAmount(num);
    };

    const handleSubmit = async () => {
      if (localRemitAmount <= 0) {
        Alert.alert('Invalid Amount', 'Remittance amount must be greater than 0');
        return;
      }
      await handleSubmitRemittance();
    };

    // Get earnings data for display
    const earnings = getTodayEarnings();

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRemitModal}
        onRequestClose={() => setShowRemitModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90%] overflow-hidden">
            <View className="bg-purple-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Remit Profit</Text>
              <TouchableOpacity onPress={() => setShowRemitModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              className="p-6"
              showsVerticalScrollIndicator={true}
              contentContainerStyle={{ paddingBottom: 20 }}
            >
              <Text className="text-gray-500 text-sm mb-4">Today's Remittance Summary</Text>
              
              {/* Summary Cards */}
              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Appointments Completed</Text>
                  <Text className="text-blue-600 font-bold">{earnings.appointmentCount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Walk-ins Completed</Text>
                  <Text className="text-green-600 font-bold">{earnings.walkInCount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2 border-t border-gray-200 pt-2">
                  <Text className="text-gray-600">Total Services Completed</Text>
                  <Text className="text-purple-600 font-bold">{earnings.totalCount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Appointment Earnings</Text>
                  <Text className="text-blue-600 font-bold text-lg">₱{earnings.appointmentEarnings.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Walk-in Earnings</Text>
                  <Text className="text-green-600 font-bold text-lg">₱{earnings.walkInEarnings.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2 border-t border-gray-200 pt-2">
                  <Text className="text-gray-600 font-bold">Total Earnings</Text>
                  <Text className="text-purple-600 font-bold text-lg">₱{earnings.totalEarnings.toLocaleString()}</Text>
                </View>
                
                {/* Commission Section - Shows both appointments and walk-ins are affected */}
                <View className="mt-2 bg-purple-50 rounded-xl p-3">
                  <Text className="text-gray-700 font-semibold text-sm mb-2">Commission Calculation</Text>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-600 text-xs">Commission Rate</Text>
                    <Text className="text-purple-600 font-bold">{earnings.commissionRate * 100}%</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-600 text-xs">Applied to Total Earnings (Appointments + Walk-ins)</Text>
                    <Text className="text-purple-600 font-bold">✓</Text>
                  </View>
                  <View className="flex-row justify-between items-center pt-1 border-t border-purple-200">
                    <Text className="text-gray-700 font-semibold">Commission Amount</Text>
                    <Text className="text-orange-600 font-bold text-lg">₱{earnings.commissionEarnings.toLocaleString()}</Text>
                  </View>
                </View>
                
                <View className="border-t border-gray-200 pt-2 mt-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-800 font-bold">Total Profit to Remit</Text>
                    <Text className="text-purple-600 font-bold text-xl">₱{totalProfit.toLocaleString()}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs mt-1">
                    Total Earnings - Commission ({earnings.commissionRate * 100}%)
                  </Text>
                </View>
              </View>
              
              {/* Today's Completed Appointments List */}
              {todayAppointments.filter(app => app.service_status === 'completed' || app.status === 'completed').length > 0 && (
                <View className="mb-4">
                  <Text className="text-gray-700 font-semibold mb-2">Today's Completed Appointments</Text>
                  {todayAppointments
                    .filter(app => app.service_status === 'completed' || app.status === 'completed')
                    .map((app) => (
                      <View key={app.id} className="bg-blue-50 rounded-xl p-3 mb-2">
                        <View className="flex-row justify-between items-center">
                          <View>
                            <Text className="text-gray-800 font-semibold">{app.service_name}</Text>
                            <Text className="text-gray-500 text-xs">
                              {app.customer_name} • {formatTime(app.appointment_time)}
                            </Text>
                          </View>
                          <Text className="text-blue-600 font-bold">₱{parseFloat(app.price).toLocaleString()}</Text>
                        </View>
                      </View>
                    ))}
                </View>
              )}
              
              {/* Today's Completed Walk-ins List */}
              {(() => {
                const currentStaffId = user?.id;
                const todayStr = getTodayDateStr();
                const completedWalkIns = walkIns.filter((walkIn: WalkIn) => {
                  const walkInDate = walkIn.created_at ? walkIn.created_at.split('T')[0] : '';
                  const isFinished = walkIn.is_finished === 1;
                  return walkInDate === todayStr && walkIn.stylist_id === currentStaffId && isFinished;
                });
                
                if (completedWalkIns.length > 0) {
                  return (
                    <View className="mb-4">
                      <Text className="text-gray-700 font-semibold mb-2">Today's Completed Walk-ins</Text>
                      {completedWalkIns.map((walkIn) => (
                        <View key={walkIn.id} className="bg-green-50 rounded-xl p-3 mb-2">
                          <View className="flex-row justify-between items-center">
                            <View>
                              <Text className="text-gray-800 font-semibold">{walkIn.services?.service_name || 'Unknown Service'}</Text>
                              <Text className="text-gray-500 text-xs">
                                {walkIn.customer_name} • Walk-in
                              </Text>
                            </View>
                            <Text className="text-green-600 font-bold">₱{parseFloat(walkIn.services?.price || '0').toLocaleString()}</Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  );
                }
                return null;
              })()}
              
              {todayAppointments.filter(app => app.service_status === 'completed' || app.status === 'completed').length === 0 && 
               walkIns.filter((walkIn: WalkIn) => {
                 const walkInDate = walkIn.created_at ? walkIn.created_at.split('T')[0] : '';
                 const isFinished = walkIn.is_finished === 1;
                 return walkInDate === getTodayDateStr() && walkIn.stylist_id === user?.id && isFinished;
               }).length === 0 && (
                <View className="bg-yellow-50 rounded-xl p-4 mb-4">
                  <Text className="text-yellow-600 text-center">No completed appointments or walk-ins for today</Text>
                </View>
              )}
              
              {/* Remittance Amount */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Remittance Amount</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                  <Text className="text-gray-800 font-bold text-lg mr-2">₱</Text>
                  <TextInput
                    value={localRemitAmount.toString()}
                    onChangeText={handleAmountChange}
                    keyboardType="numeric"
                    className="flex-1 text-lg text-gray-800"
                  />
                </View>
                <Text className="text-gray-400 text-xs mt-1">Amount to be remitted (Total Earnings - Commission)</Text>
              </View>
              
              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={localIsSubmitting || earnings.totalCount === 0}
                className={`py-3 rounded-xl mt-2 ${earnings.totalCount === 0 ? 'bg-gray-400' : 'bg-purple-600'}`}
              >
                <Text className="text-white text-center font-semibold">
                  {localIsSubmitting ? 'Submitting...' : 'Submit Remittance'}
                </Text>
              </TouchableOpacity>
              
              {earnings.totalCount === 0 && (
                <Text className="text-gray-400 text-xs text-center mt-2">
                  No completed services to remit
                </Text>
              )}
              
              {/* Add extra padding at the bottom for better scrolling */}
              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  });

  // Report Modal
  const ReportModal = React.memo(() => {
    const [localReportFormData, setLocalReportFormData] = useState(reportFormData);
    const [localIsSubmitting, setLocalIsSubmitting] = useState(isSubmittingReport);

    useEffect(() => {
      setLocalReportFormData(reportFormData);
    }, [reportFormData]);

    useEffect(() => {
      setLocalIsSubmitting(isSubmittingReport);
    }, [isSubmittingReport]);

    const handleInputChange = (field: string, value: string) => {
      setLocalReportFormData(prev => ({ ...prev, [field]: value }));
      setReportFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
      // Use local form data for validation
      if (!localReportFormData.incident_type) {
        Alert.alert('Validation Error', 'Please select an incident type');
        return;
      }
      if (!localReportFormData.category) {
        Alert.alert('Validation Error', 'Please select a category');
        return;
      }
      if (!localReportFormData.amount || parseFloat(localReportFormData.amount) <= 0) {
        Alert.alert('Validation Error', 'Please enter a valid amount');
        return;
      }
      if (!localReportFormData.description) {
        Alert.alert('Validation Error', 'Please enter a description');
        return;
      }
      await handleSubmitReport();
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showReportModal}
        onRequestClose={() => {
          setShowReportModal(false);
          setReportAppointment(null);
          setReportFormData({
            incident_type: '',
            category: '',
            amount: '',
            description: '',
            inventory_id: '',
            transaction_id: ''
          });
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
            <View className="bg-red-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Report Incident</Text>
              <TouchableOpacity onPress={() => {
                setShowReportModal(false);
                setReportAppointment(null);
                setReportFormData({
                  incident_type: '',
                  category: '',
                  amount: '',
                  description: '',
                  inventory_id: '',
                  transaction_id: ''
                });
              }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-6">
              {/* Appointment Info */}
              {reportAppointment && (
                <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <Text className="text-gray-500 text-sm">Appointment Details</Text>
                  <Text className="text-gray-800 font-semibold">{reportAppointment.service_name}</Text>
                  <Text className="text-gray-500 text-xs">
                    {reportAppointment.customer_name} • {formatTime(reportAppointment.appointment_time)}
                  </Text>
                  <Text className="text-gray-500 text-xs">Transaction ID: {reportAppointment.transaction_id}</Text>
                </View>
              )}

              {/* Incident Type */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Incident Type *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['damage', 'inventory_loss', 'theft'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => handleInputChange('incident_type', type)}
                      className={`px-4 py-2 rounded-full ${
                        localReportFormData.incident_type === type 
                          ? 'bg-red-600' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`capitalize ${localReportFormData.incident_type === type ? 'text-white' : 'text-gray-700'}`}>
                        {type === 'inventory_loss' ? 'Inventory Loss' : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Category *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['product', 'service', 'other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => handleInputChange('category', cat)}
                      className={`px-4 py-2 rounded-full ${
                        localReportFormData.category === cat 
                          ? 'bg-red-600' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`capitalize ${localReportFormData.category === cat ? 'text-white' : 'text-gray-700'}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Amount *</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                  <Text className="text-gray-800 font-bold text-lg mr-2">₱</Text>
                  <TextInput
                    value={localReportFormData.amount}
                    onChangeText={(text) => handleInputChange('amount', text)}
                    placeholder="0.00"
                    keyboardType="numeric"
                    className="flex-1 text-lg text-gray-800"
                  />
                </View>
              </View>

              {/* Inventory ID (Optional) */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Inventory Item (Optional)</Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-2 border border-gray-200">
                  <Ionicons name="cube-outline" size={20} color="#9ca3af" />
                  <TextInput
                    value={localReportFormData.inventory_id}
                    onChangeText={(text) => handleInputChange('inventory_id', text)}
                    placeholder="Enter inventory ID (optional)"
                    keyboardType="numeric"
                    className="flex-1 ml-2 text-gray-800"
                  />
                </View>
                {inventoryItems.length > 0 && (
                  <View className="mt-2">
                    <Text className="text-gray-500 text-xs">Available Inventory Items:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-1">
                      {inventoryItems.slice(0, 5).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          onPress={() => handleInputChange('inventory_id', item.id.toString())}
                          className="bg-gray-100 rounded-full px-3 py-1 mr-2"
                        >
                          <Text className="text-xs text-gray-600">
                            #{item.id} - {item.products?.product_name || 'Item'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              {/* Description */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Description *</Text>
                <TextInput
                  value={localReportFormData.description}
                  onChangeText={(text) => handleInputChange('description', text)}
                  placeholder="Describe the incident in detail..."
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                  className="border border-gray-200 rounded-xl p-3 text-gray-700 min-h-[100px]"
                />
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleSubmit}
                disabled={localIsSubmitting}
                className="bg-red-600 py-3 rounded-xl mt-2"
              >
                <Text className="text-white text-center font-semibold">
                  {localIsSubmitting ? 'Submitting...' : 'Submit Report'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  });

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333ea']} />
            }
          >
            {/* Header */}
            <View className="bg-purple-600 px-5 pt-12 pb-8" style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Hello, {staffName.split(' ')[0]}! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have {todayAppointments.length} appointment(s) today
                  </Text>
                </View>
                <TouchableOpacity className="bg-white/20 p-2 rounded-full">
                  <Ionicons name="person-circle-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View className="flex-row justify-between px-4 mt-6" style={{ marginTop: -25 }}>
              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Today</Text>
                  <View className="bg-purple-100 p-2 rounded-full">
                    <Ionicons name="calendar" size={18} color="#9333ea" />
                  </View>
                </View>
                <Text className="text-purple-600 text-3xl font-bold mt-3">{todayAppointments.length}</Text>
                <Text className="text-gray-400 text-xs mt-1">Appointments</Text>
              </View>

              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Today's Earnings</Text>
                  <View className="bg-green-100 p-2 rounded-full">
                    <Ionicons name="cash-outline" size={18} color="#10b981" />
                  </View>
                </View>
                <Text className="text-green-600 text-3xl font-bold mt-3">₱{getTodayEarnings().commissionEarnings.toLocaleString()}</Text>
                <Text className="text-gray-400 text-xs mt-1">Commission Earnings</Text>
              </View>
            </View>

            {/* Remit Profit Button */}
            <View className="px-5 mt-4">
              <TouchableOpacity
                onPress={handleOpenRemitModal}
                className="bg-gradient-to-r from-purple-500 to-purple-700 py-4 rounded-2xl shadow-lg"
              >
                <View className="flex-row items-center justify-center gap-3">
                  <Ionicons name="cash-outline" size={24} color="white" />
                  <Text className="text-white font-bold text-lg">Remit Profit</Text>
                  <Ionicons name="arrow-forward-circle-outline" size={24} color="white" />
                </View>
              </TouchableOpacity>
            </View>

            {/* Today's Schedule */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Today's Appointments</Text>
                <TouchableOpacity onPress={() => setActiveTab('appointments')}>
                  <Text className="text-purple-600 font-semibold">View All</Text>
                </TouchableOpacity>
              </View>

              {todayAppointments.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center">
                  <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-400 mt-3 text-center">No appointments today</Text>
                </View>
              ) : (
                todayAppointments.slice(0, 3).map((app) => (
                  <View key={app.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm border border-gray-100">
                    <View className="flex-row justify-between items-start mb-3">
                      <View className="flex-1">
                        <View className="flex-row items-center mb-2">
                          <View className="bg-purple-100 p-2 rounded-full mr-3">
                            <Ionicons name="person-outline" size={20} color="#9333ea" />
                          </View>
                          <View>
                            <Text className="text-gray-800 font-bold text-lg">
                              {app.customer_name !== 'Walk-in Customer' ? app.customer_name : 'Customer #' + (app.id || '?')}
                            </Text>
                            {app.customer_phone !== 'N/A' && app.customer_phone && (
                              <Text className="text-gray-500 text-xs">{app.customer_phone}</Text>
                            )}
                          </View>
                        </View>
                        
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="time-outline" size={14} color="#9ca3af" />
                          <Text className="text-gray-600 text-sm ml-1">{formatTime(app.appointment_time)}</Text>
                          <Text className="text-gray-400 text-sm mx-2">•</Text>
                          <Ionicons name="cut-outline" size={14} color="#9ca3af" />
                          <Text className="text-gray-600 text-sm ml-1">{app.service_name}</Text>
                        </View>
                        
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="hourglass-outline" size={14} color="#9ca3af" />
                          <Text className="text-gray-500 text-xs ml-1">{app.duration_minutes} mins</Text>
                        </View>
                      </View>
                      
                      <View className={`px-3 py-1.5 rounded-full ${
                        app.service_status === 'completed' ? 'bg-green-100' :
                        app.service_status === 'in_progress' ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
                        <Text className={`text-xs font-semibold ${
                          app.service_status === 'in_progress' ? 'text-blue-700' :
                          app.service_status === 'completed' ? 'text-green-700' : 'text-purple-700'
                        }`}>
                          {app.service_status === 'in_progress' ? 'IN PROGRESS' : 
                           app.service_status === 'completed' ? 'COMPLETED' : 
                           app.service_status?.toUpperCase() || 'PENDING'}
                        </Text>
                      </View>
                    </View>
                    
                    <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <Text className="text-purple-600 font-bold text-lg">₱{parseFloat(app.price).toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Total Earnings Card */}
            <View className="px-5 mt-4 mb-6">
              <View className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl p-5">
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-white opacity-90 text-sm">Total Earnings</Text>
                    <Text className="text-white text-4xl font-bold mt-2">₱{completedEarnings.toLocaleString()}</Text>
                    <Text className="text-white opacity-75 text-xs mt-2">From completed services</Text>
                  </View>
                  <View className="bg-white/20 p-3 rounded-full">
                    <Ionicons name="trophy-outline" size={28} color="white" />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );
      
      case 'appointments':
        return (
          <StaffAppointments 
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      
      case 'schedule':
        return (
          <StaffSchedule 
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        );
      
      case 'settings':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>
              
              {/* Profile Card */}
              <View className="bg-white rounded-2xl p-6 mb-4 items-center shadow-sm">
                <View className="bg-purple-100 p-4 rounded-full mb-3">
                  <Ionicons name="person" size={50} color="#9333ea" />
                </View>
                <Text className="text-xl font-bold text-gray-800">{staffName}</Text>
                <Text className="text-gray-500">Salon Staff</Text>
                <Text className="text-gray-400 text-sm mt-2">{user?.email}</Text>
                <Text className="text-gray-400 text-sm">{user?.phone_number}</Text>
              </View>
              
              {/* Options */}
              <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
                <TouchableOpacity className="flex-row items-center px-5 py-4 border-b border-gray-100">
                  <Ionicons name="notifications-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center px-5 py-4">
                  <Ionicons name="lock-closed-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Privacy & Security</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              {/* Logout Button */}
              <TouchableOpacity 
                className="bg-red-500 py-4 rounded-xl mb-6"
                onPress={handleLogout}
              >
                <Text className="text-white text-center font-semibold text-lg">Log Out</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      
      default:
        return null;
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50">
      <View className="flex-1">
        {renderContent()}
      </View>
      
      {/* Remittance Modal */}
      <RemittanceModal />
      
      {/* Report Modal */}
      <ReportModal />
      
      {/* Bottom Navigation */}
      <View className="flex-row justify-around items-center border-t border-gray-200 bg-white py-3">
        <TouchableOpacity 
          className="items-center py-1 px-5"
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name={activeTab === 'home' ? "home" : "home-outline"} 
            size={24} 
            color={activeTab === 'home' ? "#9333ea" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'home' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1 px-5"
          onPress={() => setActiveTab('appointments')}
        >
          <Ionicons 
            name={activeTab === 'appointments' ? "calendar" : "calendar-outline"} 
            size={24} 
            color={activeTab === 'appointments' ? "#9333ea" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'appointments' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Appointments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1 px-5"
          onPress={() => setActiveTab('schedule')}
        >
          <Ionicons 
            name={activeTab === 'schedule' ? "calendar" : "calendar-outline"} 
            size={24} 
            color={activeTab === 'schedule' ? "#9333ea" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'schedule' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Schedule
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1 px-5"
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name={activeTab === 'settings' ? "settings" : "settings-outline"} 
            size={24} 
            color={activeTab === 'settings' ? "#9333ea" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'settings' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}