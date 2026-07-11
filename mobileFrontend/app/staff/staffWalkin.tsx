import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, Modal, ActivityIndicator, Image, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

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
  profile_image?: string;
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

interface StaffWalkInProps {
  onSuccess?: () => void;
}

export default function StaffWalkIn({ onSuccess }: StaffWalkInProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<number | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [bookingStep, setBookingStep] = useState<'stylist' | 'services' | 'confirm'>('stylist');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [showUnauthorizedModal, setShowUnauthorizedModal] = useState(false);
  
  // Local state for data
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceSpecialties, setServiceSpecialties] = useState<any[]>([]);
  const [staffFeedbacks, setStaffFeedbacks] = useState<StaffFeedback[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { 
    user,
  } = useAuth();

  // State for business schedules and staff assignments (for filtering available staff)
  const [localBusinessSchedules, setLocalBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [localStaffAssignments, setLocalStaffAssignments] = useState<StaffAssignment[]>([]);

  // Fetch staff
  const fetchStaff = async () => {
    try {
      const response = await api.get("/employee/specialties");
      console.log("Fetched staff with specialties:", response.data);
      
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) {
        staffData = response.data;
      }
      
      setStaff(staffData);
      return staffData;
    } catch (error) {
      console.log("Error fetching staff:", error);
      return [];
    }
  };

  // Fetch services
  const fetchServices = async () => {
    try {
      const response = await api.get("/services");
      console.log("Fetched services:", response.data);
      
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
    } catch (error) {
      console.log("Error fetching services:", error);
      return [];
    }
  };

  // Fetch service specialties
  const fetchServiceSpecialties = async () => {
    try {
      const response = await api.get("/services/specialties");
      console.log("Fetched service specialties:", response.data);
      
      let specialtiesData: any[] = [];
      if (Array.isArray(response.data)) {
        specialtiesData = response.data;
      }
      
      setServiceSpecialties(specialtiesData);
      return specialtiesData;
    } catch (error) {
      console.log("Error fetching service specialties:", error);
      return [];
    }
  };

  // Fetch staff feedbacks
  const fetchStaffFeedbacks = async () => {
    try {
      const response = await api.get("/feedbacks/staff");
      console.log("Raw staff feedbacks response:", response.data);
      
      let staffFeedbacksData: StaffFeedback[] = [];
      if (Array.isArray(response.data)) {
        staffFeedbacksData = response.data.map((item: any) => ({
          id: item.id || 0,
          staff_id: item.staff_id || 0,
          rating: parseFloat(item.rating) || 0
        }));
      }
      
      console.log("Processed staff feedbacks:", staffFeedbacksData);
      setStaffFeedbacks(staffFeedbacksData);
      return staffFeedbacksData;
    } catch (error) {
      console.log("Error fetching staff feedbacks:", error);
      return [];
    }
  };

  // Submit walk-in
  const submitWalkIn = async (data: { customer_name: string; service_id: number; stylist_id: number; is_finished: number }) => {
    try {
      const response = await api.post('/walk-in/add', {
        customer_name: data.customer_name,
        service_id: data.service_id,
        stylist_id: data.stylist_id,
        is_finished: data.is_finished !== undefined ? data.is_finished : 0
      });
      console.log('Walk-in submitted:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error submitting walk-in:', error);
      throw error;
    }
  };

  // Fetch walk-ins
  const fetchWalkIns = async () => {
    try {
      const response = await api.get('/walk-in');
      console.log('Fetched walk-ins:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching walk-ins:', error);
      return [];
    }
  };

  // Check if the current staff is authorized for walk-in
  const checkWalkInAuthorization = async () => {
    setIsCheckingAuth(true);
    try {
      const response = await api.get('/walk-in/staff');
      console.log('Walk-in authorization data:', response.data);
      
      if (Array.isArray(response.data)) {
        // Find the current staff's authorization
        const currentStaffId = user?.id;
        const authData = response.data.find(
          (auth: WalkInAuthorization) => auth.staff_id === currentStaffId
        );
        
        console.log('Auth data for staff:', authData);
        
        // Check both possible field names
        const isAuthorizedWalkIn = 
          authData?.isAuthorizedForWalkin === 1 || 
          authData?.isAuthorizedForWalkIn === 1;
        
        console.log('Is authorized:', isAuthorizedWalkIn);
        
        setIsAuthorized(isAuthorizedWalkIn);
        
        if (!isAuthorizedWalkIn) {
          setShowUnauthorizedModal(true);
        }
      } else {
        // If no data, assume not authorized
        setIsAuthorized(false);
        setShowUnauthorizedModal(true);
      }
    } catch (error) {
      console.error('Error checking walk-in authorization:', error);
      // If error, assume not authorized
      setIsAuthorized(false);
      setShowUnauthorizedModal(true);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  // Fetch business schedules
  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      if (Array.isArray(response.data)) {
        setLocalBusinessSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching business schedules:', error);
    }
  };

  // Fetch staff assignments
  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      if (Array.isArray(response.data)) {
        setLocalStaffAssignments(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    }
  };

  // Get UTC date string from Date object
  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  // Get staff assigned to today
  const getTodayStaff = useCallback(() => {
    const todayStr = getUTCDateString(new Date());
    const schedule = localBusinessSchedules.find(s => s.business_date === todayStr);
    if (!schedule) return [];
    
    const assignments = localStaffAssignments.filter(a => a.business_date_id === schedule.id);
    const staffIds = assignments.map(a => a.staff_id);
    return staff.filter(s => staffIds.includes(s.id));
  }, [localBusinessSchedules, localStaffAssignments, staff]);

  // Get service specialties
  const getServiceSpecialties = (serviceId: number) => {
    return serviceSpecialties.filter(item => item.service_id === serviceId);
  };

  // Get services based on staff's specialty
  const getServicesForStaff = () => {
    if (!selectedStaffId) return [];
    
    const selectedStaff = staff.find(s => s.id === selectedStaffId);
    if (!selectedStaff) return [];
    
    // Get all specialties of the selected staff
    const staffSpecialties = selectedStaff.staff_specialties
      ?.filter(s => s.is_active === 1)
      .map(s => s.specialties?.specialty_name?.toLowerCase()) || [];
    
    // Get all active services
    const activeServices = services.filter(s => s.service_status === 'active');
    
    // Filter services that match the staff's specialties
    return activeServices.filter(service => {
      const serviceSpecialties = getServiceSpecialties(service.id);
      return serviceSpecialties.some(ss => {
        const specialtyName = ss.specialties?.specialty_name?.toLowerCase();
        return staffSpecialties.includes(specialtyName);
      });
    });
  };

  const handleStaffSelect = (staffId: number) => {
    setSelectedStaffId(staffId);
    setSelectedServiceId(null);
    setBookingStep('services');
  };

  const handleServiceSelect = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    setBookingStep('confirm');
  };

  const handleBackToStylist = () => {
    setBookingStep('stylist');
    setSelectedServiceId(null);
  };

  const handleBackToServices = () => {
    setBookingStep('services');
  };

  const handleConfirmWalkIn = async () => {
    if (!customerName.trim()) {
      Alert.alert("Validation Error", "Please enter the customer's name");
      return;
    }
    
    if (!selectedStaffId) {
      Alert.alert("Validation Error", "Please select a stylist");
      return;
    }
    
    if (!selectedServiceId) {
      Alert.alert("Validation Error", "Please select a service");
      return;
    }

    setIsProcessing(true);
    try {
      const data = {
        customer_name: customerName.trim(),
        service_id: selectedServiceId,
        stylist_id: selectedStaffId,
        is_finished: 0
      };
      
      console.log("Submitting walk-in with data:", data);
      await submitWalkIn(data);
      
      Alert.alert("Success", "Walk-in customer added successfully!");
      
      // Reset form
      setCustomerName('');
      setSelectedStaffId(null);
      setSelectedServiceId(null);
      setBookingStep('stylist');
      
      // Refresh walk-ins
      await fetchWalkIns();
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      console.error("Error submitting walk-in:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to add walk-in customer");
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions
  const getStaffName = (staffId: number | null) => {
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

  const getServiceName = () => {
    if (!selectedServiceId) return '';
    const service = services.find(s => s.id === selectedServiceId);
    return service?.service_name || '';
  };

  const getServicePrice = () => {
    if (!selectedServiceId) return 0;
    const service = services.find(s => s.id === selectedServiceId);
    return service?.price || 0;
  };

  // Get staff rating with error handling
  const getStaffRating = (staffId: number) => {
    try {
      const staffReviews = staffFeedbacks.filter(f => f.staff_id === staffId);
      if (staffReviews.length === 0) return { average: 0, count: 0 };
      
      const total = staffReviews.reduce((sum, feedback) => {
        const rating = typeof feedback.rating === 'number' ? feedback.rating : parseFloat(feedback.rating as any) || 0;
        return sum + rating;
      }, 0);
      
      const average = parseFloat((total / staffReviews.length).toFixed(1));
      return { 
        average: average, 
        count: staffReviews.length 
      };
    } catch (error) {
      console.error(`Error getting rating for staff ${staffId}:`, error);
      return { average: 0, count: 0 };
    }
  };

  // Generate star rating display with error handling
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

  // Load data on mount
  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      fetchBusinessSchedules(),
      fetchStaffAssignments(),
      fetchStaff(),
      fetchServices(),
      fetchServiceSpecialties(),
      fetchStaffFeedbacks(),
      checkWalkInAuthorization()
    ]).finally(() => setIsLoading(false));
  }, []);

  const todayStaff = getTodayStaff();

  // Unauthorized Modal
  const UnauthorizedModal = () => {
    return (
      <Modal
        transparent={true}
        animationType="fade"
        visible={showUnauthorizedModal}
        onRequestClose={() => {}}
      >
        <View className="flex-1 justify-center items-center bg-black/60">
          <View className="bg-white rounded-2xl w-[85%] max-w-sm p-6">
            <View className="items-center mb-4">
              <View className="w-20 h-20 bg-pink-100 rounded-full items-center justify-center mb-3">
                <Ionicons name="alert-circle" size={50} color="#ec4899" />
              </View>
              <Text className="text-2xl font-bold text-gray-800 text-center">
                Not Authorized
              </Text>
            </View>
            
            <Text className="text-gray-600 text-center mb-6">
              You are not authorized to add walk-in customers. Please contact the salon owner to request access.
            </Text>
            
            <TouchableOpacity
              className="bg-pink-500 py-3 rounded-xl"
              onPress={() => {
                setShowUnauthorizedModal(false);
                // Go back to previous screen or close the tab
                if (onSuccess) {
                  onSuccess();
                }
              }}
            >
              <Text className="text-white text-center font-semibold text-lg">
                Go Back
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  };

  // Loading screen while checking authorization
  if (isCheckingAuth) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-50">
        <ActivityIndicator size="large" color="#ec4899" />
        <Text className="text-gray-500 mt-4">Checking authorization...</Text>
      </View>
    );
  }

  // If not authorized, show just the modal overlay with disabled content
  if (!isAuthorized) {
    return (
      <>
        <View className="flex-1 bg-gray-50 opacity-50">
          <View className="flex-1 justify-center items-center">
            <Ionicons name="lock-closed" size={60} color="#9ca3af" />
            <Text className="text-gray-400 text-lg mt-4">Walk-in feature is locked</Text>
            <Text className="text-gray-400 text-sm">You are not authorized to use this feature</Text>
          </View>
        </View>
        <UnauthorizedModal />
      </>
    );
  }

  const renderContent = () => {
    const selectedStaff = selectedStaffId ? staff.find(s => s.id === selectedStaffId) : null;
    const servicesForStaff = getServicesForStaff();
    const totalPrice = getServicePrice();

    return (
      <View className="flex-1 bg-gray-50">
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          className="flex-1"
        >
          <View className="px-5 pt-6">
            {/* Back Button */}
            {(bookingStep === 'services' || bookingStep === 'confirm') && (
              <TouchableOpacity 
                className="flex-row items-center mb-4"
                onPress={
                  bookingStep === 'confirm' ? handleBackToServices : handleBackToStylist
                }
                disabled={isProcessing}
              >
                <Ionicons name="arrow-back" size={24} color="#ec4899" />
                <Text className="text-pink-600 font-semibold ml-2">
                  {bookingStep === 'confirm' ? 'Back to Services' : 'Back to Stylists'}
                </Text>
              </TouchableOpacity>
            )}
            
            <Text className="text-3xl font-bold text-gray-800 mb-2">
              {bookingStep === 'stylist' ? 'Select Stylist' : 
               bookingStep === 'services' ? 'Select Service' : 
               'Confirm Walk-in'}
            </Text>
            <Text className="text-gray-500 mb-6">
              {bookingStep === 'stylist' ? 'Choose a stylist for the walk-in customer' : 
               bookingStep === 'services' ? `Selected: ${selectedStaff?.first_name} ${selectedStaff?.last_name}` : 
               `Review walk-in details`}
            </Text>
            
            {/* Step 1: Customer Name Input + Stylist Selection */}
            {bookingStep === 'stylist' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm mb-4" style={{ elevation: 2 }}>
                <Text className="text-gray-700 font-semibold mb-2">Customer Name *</Text>
                <TextInput
                  value={customerName}
                  onChangeText={setCustomerName}
                  placeholder="Enter customer name"
                  className="border border-gray-300 rounded-lg px-4 py-3 text-gray-700 mb-4"
                />
                
                <Text className="text-lg font-semibold text-gray-800 mb-4">Select Stylist</Text>
                
                {isLoading ? (
                  <View className="py-10 items-center">
                    <ActivityIndicator size="large" color="#ec4899" />
                    <Text className="text-center text-gray-500 mt-2">Loading stylists...</Text>
                  </View>
                ) : todayStaff.length === 0 ? (
                  <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                    <Ionicons name="people-outline" size={50} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">No stylists available today</Text>
                  </View>
                ) : (
                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    className="mb-4"
                  >
                    <View className="flex-row flex-wrap justify-between">
                      {todayStaff.map((staffMember) => {
                        const ratingData = getStaffRating(staffMember.id);
                        const { average, count } = ratingData;
                        const specialties = getStaffSpecialties(staffMember.id);
                        const profileImage = (staffMember as any).profile_image;
                        const isSelected = selectedStaffId === staffMember.id;
                        
                        return (
                          <TouchableOpacity 
                            key={staffMember.id} 
                            className={`w-[48%] mb-4 ${isSelected ? 'ring-2 ring-pink-500' : ''}`}
                            onPress={() => handleStaffSelect(staffMember.id)}
                            activeOpacity={0.85}
                            disabled={isProcessing}
                          >
                            <View className="bg-white rounded-2xl shadow-lg overflow-hidden" style={{ elevation: 4 }}>
                              <View className="relative">
                                {profileImage ? (
                                  <Image 
                                    source={{ uri: profileImage }} 
                                    className="w-full h-48"
                                    resizeMode="cover"
                                  />
                                ) : (
                                  <View className="w-full h-48 bg-gradient-to-br from-pink-400 to-pink-600 items-center justify-center">
                                    <Text className="text-white font-bold text-5xl">
                                      {staffMember.first_name?.charAt(0)}{staffMember.last_name?.charAt(0)}
                                    </Text>
                                  </View>
                                )}
                                
                                {average > 0 && (
                                  <View className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm rounded-full px-3 py-1.5 flex-row items-center">
                                    <Ionicons name="star" size={14} color="#fbbf24" />
                                    <Text className="text-white font-bold text-xs ml-1">
                                      {typeof average === 'number' && !isNaN(average) ? average.toFixed(1) : '0.0'}
                                    </Text>
                                    <Text className="text-white/70 text-xs ml-1">
                                      ({count})
                                    </Text>
                                  </View>
                                )}
                                
                                <View className="absolute bottom-3 left-3 bg-pink-500 rounded-full px-3 py-1">
                                  <Text className="text-white text-xs font-semibold">Available</Text>
                                </View>
                              </View>
                              
                              <View className="p-3">
                                <Text className="text-base font-bold text-gray-800" numberOfLines={1}>
                                  {staffMember.first_name} {staffMember.last_name}
                                </Text>
                                <Text className="text-gray-500 text-xs mt-1" numberOfLines={2}>
                                  {specialties}
                                </Text>
                                <View className="flex-row items-center mt-2">
                                  <View className="flex-row">
                                    {average > 0 ? (
                                      renderStars(average)
                                    ) : (
                                      <Text className="text-gray-400 text-xs">No ratings yet</Text>
                                    )}
                                  </View>
                                </View>
                                <View className="mt-3 pt-3 border-t border-gray-100">
                                  <View className={`rounded-full py-2 items-center ${isSelected ? 'bg-pink-600' : 'bg-gray-200'}`}>
                                    <Text className={isSelected ? 'text-white font-semibold text-sm' : 'text-gray-600 text-sm'}>
                                      {isSelected ? '✓ Selected' : 'Select Stylist'}
                                    </Text>
                                  </View>
                                </View>
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </ScrollView>
                )}
                
                <TouchableOpacity 
                  className="bg-pink-600 py-4 rounded-xl mt-2"
                  onPress={() => {
                    if (!customerName.trim()) {
                      Alert.alert("Validation Error", "Please enter the customer's name");
                      return;
                    }
                    if (!selectedStaffId) {
                      Alert.alert("Validation Error", "Please select a stylist");
                      return;
                    }
                    setBookingStep('services');
                  }}
                  disabled={isProcessing || !selectedStaffId || !customerName.trim()}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Services
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Step 2: Service Selection */}
            {bookingStep === 'services' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Selected Stylist</Text>
                  <Text className="text-lg font-bold text-gray-800">
                    {selectedStaff?.first_name} {selectedStaff?.last_name}
                  </Text>
                  <Text className="text-gray-500 text-sm mt-1">
                    {getStaffSpecialties(selectedStaffId)}
                  </Text>
                  <View className="flex-row items-center mt-2">
                    <View className="flex-row">
                      {(() => {
                        const { average, count } = getStaffRating(selectedStaffId!);
                        return average > 0 ? (
                          <>
                            {renderStars(average)}
                            <Text className="text-gray-500 text-xs ml-1">
                              ({average.toFixed(1)} · {count} {count === 1 ? 'review' : 'reviews'})
                            </Text>
                          </>
                        ) : (
                          <Text className="text-gray-400 text-xs">No ratings yet</Text>
                        );
                      })()}
                    </View>
                  </View>
                </View>

                <Text className="text-lg font-semibold text-gray-800 mb-2">Select Service</Text>
                <Text className="text-gray-500 text-sm mb-4">
                  Choose a service for the walk-in customer
                </Text>
                
                {servicesForStaff.length === 0 ? (
                  <View className="py-8 items-center">
                    <Ionicons name="alert-circle-outline" size={48} color="#d1d5db" />
                    <Text className="text-gray-500 text-center mt-3">
                      No services available for this stylist's specialty
                    </Text>
                  </View>
                ) : (
                  servicesForStaff.map((service) => {
                    const isSelected = selectedServiceId === service.id;
                    const isMultitaskable = service.is_multitaskable === 1;
                    
                    return (
                      <TouchableOpacity 
                        key={service.id} 
                        className={`rounded-2xl p-4 mb-3 border-2 ${
                          isSelected ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                        }`}
                        onPress={() => handleServiceSelect(service.id)}
                        activeOpacity={0.7}
                        disabled={isProcessing}
                      >
                        <View className="flex-row items-start">
                          <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${
                            isSelected ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                          }`}>
                            {isSelected && (
                              <Ionicons name="checkmark" size={14} color="white" />
                            )}
                          </View>
                          
                          <View className="flex-1">
                            <Text className="text-lg font-semibold text-gray-800">{service.service_name}</Text>
                            <Text className="text-gray-500 text-sm mt-1" numberOfLines={1}>
                              {service.description}
                            </Text>
                            <View className="flex-row items-center mt-2">
                              <Ionicons name="time-outline" size={14} color="#9ca3af" />
                              <Text className="text-gray-500 text-xs ml-1">{service.duration_minutes} mins</Text>
                              {isMultitaskable && (
                                <View className="ml-3 bg-pink-100 px-2 py-0.5 rounded-full">
                                  <Text className="text-pink-600 text-xs">Multitaskable</Text>
                                </View>
                              )}
                            </View>
                          </View>
                          <Text className="text-pink-600 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
                
                <TouchableOpacity 
                  className="bg-pink-600 py-4 rounded-xl mt-4"
                  onPress={() => {
                    if (!selectedServiceId) {
                      Alert.alert("Selection Required", "Please select a service.");
                      return;
                    }
                    setBookingStep('confirm');
                  }}
                  disabled={!selectedServiceId || isProcessing}
                >
                  <Text className="text-white text-center font-semibold text-lg">
                    Continue to Confirm
                  </Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Step 3: Confirm Walk-in */}
            {bookingStep === 'confirm' && (
              <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                <View className="bg-pink-50 rounded-xl p-4 mb-6">
                  <Text className="text-gray-500 text-sm">Walk-in Summary</Text>
                  
                  <View className="mt-3 space-y-2">
                    <View className="flex-row justify-between items-center py-1">
                      <Text className="text-gray-600 text-sm">Customer</Text>
                      <Text className="text-gray-800 font-semibold">{customerName}</Text>
                    </View>
                    <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                      <Text className="text-gray-600 text-sm">Stylist</Text>
                      <Text className="text-gray-800 font-semibold">{getStaffName(selectedStaffId)}</Text>
                    </View>
                    <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                      <Text className="text-gray-600 text-sm">Service</Text>
                      <Text className="text-gray-800 font-semibold">{getServiceName()}</Text>
                    </View>
                    <View className="flex-row justify-between items-center py-1 border-t border-gray-200">
                      <Text className="text-gray-600 text-sm">Price</Text>
                      <Text className="text-pink-600 font-bold text-lg">₱{totalPrice.toLocaleString()}</Text>
                    </View>
                  </View>
                </View>

                <View className="bg-yellow-50 rounded-xl p-4 mb-4 border border-yellow-200">
                  <View className="flex-row items-center">
                    <Ionicons name="information-circle-outline" size={20} color="#eab308" />
                    <Text className="text-yellow-700 text-sm ml-2 flex-1">
                      This walk-in will be marked as pending. You can update it later.
                    </Text>
                  </View>
                </View>

                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={handleBackToServices}
                    className="flex-1 py-3 rounded-xl border border-gray-300"
                  >
                    <Text className="text-gray-600 text-center font-semibold">Back</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    onPress={handleConfirmWalkIn}
                    disabled={isProcessing}
                    className="flex-1 py-3 rounded-xl bg-pink-600"
                  >
                    <Text className="text-white text-center font-semibold">
                      {isProcessing ? 'Adding...' : 'Add Walk-in'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    );
  };

  return renderContent();
}