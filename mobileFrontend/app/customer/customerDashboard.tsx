import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, Platform } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import DateTimePicker from '@react-native-community/datetimepicker';

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [refreshing, setRefreshing] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [bookingStep, setBookingStep] = useState<'service' | 'datetime' | 'paymentType' | 'paymentMethod'>('service');
  const [selectedPaymentType, setSelectedPaymentType] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const { 
    user, 
    appointments,
    services,
    isLoading, 
    fetchUserAppointments,
    fetchServices,
    getUpcomingAppointments,
    getTotalSpent,
    getActiveServices,
    getTotalServices,
    completeBooking,
    logout 
  } = useAuth();

  // Get computed data
  const upcomingAppointments = getUpcomingAppointments();
  const totalSpent = getTotalSpent();
  const upcomingCount = upcomingAppointments.length;
  const activeServices = getActiveServices();
  const totalServices = getTotalServices();
  const selectedService = selectedServiceId ? activeServices.find(s => s.id === selectedServiceId) : null;
  
  // Safe function to get price
  const getServicePrice = () => {
    return selectedService?.price || 0;
  };

  // Calculate amount based on payment type (always half)
  const getAmount = () => {
    const totalPrice = getServicePrice();
    return totalPrice / 2;
  };

  const getPaymentTypeLabel = () => {
    if (selectedPaymentType === 'downpayment') {
      return 'Downpayment (50%)';
    } else if (selectedPaymentType === 'remaining') {
      return 'Remaining Balance (50%)';
    }
    return '';
  };

  // Helper function to format date
  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Fetch data on mount
  useEffect(() => {
    fetchUserAppointments();
    fetchServices();
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserAppointments(),
      fetchServices()
    ]);
    setRefreshing(false);
  }, [fetchUserAppointments, fetchServices]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("Logout Error.", error);
      router.replace("/");
    }
  };

  const handleSelectService = (serviceId: number) => {
    setSelectedServiceId(selectedServiceId === serviceId ? null : serviceId);
  };

  const handleContinueToDateTime = () => {
    if (!selectedServiceId) {
      Alert.alert("Selection Required", "Please select a service first.");
      return;
    }
    setBookingStep('datetime');
  };

  const handleContinueToPaymentType = () => {
    if (!selectedDate) {
      Alert.alert("Selection Required", "Please select a date first.");
      return;
    }
    setBookingStep('paymentType');
  };

  const handleContinueToPaymentMethod = () => {
    if (!selectedPaymentType) {
      Alert.alert("Selection Required", "Please select a payment type.");
      return;
    }
    setBookingStep('paymentMethod');
  };

  const handleConfirmBooking = async () => {
    if (!selectedPaymentMethod) {
      Alert.alert("Selection Required", "Please select a payment method.");
      return;
    }

    setIsProcessing(true);

    try {
      // Single API call for complete booking
      const result = await completeBooking({
        // Appointment details
        customer_id: user?.id || 0,
        appointment_date: selectedDate.toISOString().split('T')[0],
        status: 'pending',
        service_id: selectedServiceId || 0,
        service_status: 'pending',
        
        // Payment details
        total_amount: getServicePrice(),
        payment_type: selectedPaymentType || '',
        payment_method: selectedPaymentMethod || ''
      });

      console.log("Booking result:", result);

      const amount = getAmount();
      const paymentTypeLabel = getPaymentTypeLabel();
      const totalPrice = getServicePrice();
      const paymentMethodLabel = selectedPaymentMethod === 'gcash' ? 'GCash' : 'Cash';

      Alert.alert(
        "Booking Confirmed",
        `Service: ${selectedService?.service_name}\nDate: ${selectedDate.toLocaleDateString()}\nPayment Type: ${paymentTypeLabel}\nPayment Method: ${paymentMethodLabel}\nAmount Due: ₱${amount.toLocaleString()}\nTotal Amount: ₱${totalPrice.toLocaleString()}\n\nThank you for booking!`,
        [
          { 
            text: "OK", 
            onPress: () => {
              setBookingStep('service');
              setSelectedServiceId(null);
              setSelectedPaymentType(null);
              setSelectedPaymentMethod(null);
              setActiveTab('home');
              fetchUserAppointments();
            }
          }
        ]
      );
    } catch (error: any) {
      console.error("Booking error:", error);
      const errorMessage = error.response?.data?.message || error.message || "Failed to complete booking. Please try again.";
      Alert.alert("Error", errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToServices = () => {
    setBookingStep('service');
  };

  const handleBackToDateTime = () => {
    setBookingStep('datetime');
  };

  const handleBackToPaymentType = () => {
    setBookingStep('paymentType');
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

  const canBookToday = (date: Date) => {
    const today = new Date();
    const selected = new Date(date);
    return selected >= new Date(today.setHours(0, 0, 0, 0));
  };

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
            }
          >
            {/* Header */}
            <View className="bg-pink-500 px-5 pt-12 pb-8" style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Welcome Back, {user?.first_name}! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have {upcomingCount} Upcoming Appointment(s)
                  </Text>
                </View>
                <TouchableOpacity className="bg-white bg-opacity-20 p-2 rounded-full">
                  <Ionicons name="notifications-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
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

            {/* Upcoming Appointments Section */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Upcoming Appointments
                </Text>
                <TouchableOpacity className="flex-row items-center" onPress={() => setActiveTab('history')}>
                  <Text className="text-pink-500 font-semibold mr-1">View All</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>

              {isLoading ? (
                <View className="py-10">
                  <Text className="text-center text-gray-500">Loading appointments...</Text>
                </View>
              ) : upcomingAppointments.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                  <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">No upcoming appointments</Text>
                  <TouchableOpacity className="mt-4 bg-pink-500 px-6 py-2 rounded-full" onPress={() => setActiveTab('book')}>
                    <Text className="text-white font-semibold">Book Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                upcomingAppointments.map((item) => (
                  <View key={item.id} className="bg-white rounded-2xl p-4 mb-4 shadow-sm">
                    <View className="flex-row justify-between items-start">
                      <View className="flex-1">
                        <Text className="text-lg font-bold text-gray-800">{item.service_name}</Text>
                        <Text className="text-gray-500 text-sm">{item.duration_minutes} mins</Text>
                        
                        <View className="flex-row items-center mt-2">
                          <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                          <Text className="text-gray-500 text-xs ml-1">{formatDate(item.appointment_date)}</Text>
                        </View>
                      </View>
                      <Text className="text-pink-500 font-bold">₱{parseFloat(item.price).toLocaleString()}</Text>
                    </View>

                    <View className="flex-row mt-2">
                      <View className={`px-2 py-1 rounded-full ${getStatusColor(item.status)}`}>
                        <Text className="text-xs font-semibold capitalize">{item.status}</Text>
                      </View>
                      {item.service_status && item.service_status !== 'pending' && (
                        <View className="ml-2 px-2 py-1 rounded-full bg-gray-100">
                          <Text className="text-xs font-semibold capitalize text-gray-600">Service: {item.service_status}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        );
      
      case 'book':
        const totalPrice = getServicePrice();
        const halfPrice = totalPrice / 2;
        
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
            }
          >
            <View className="px-5 pt-6">
              {/* Back Button */}
              {(bookingStep === 'datetime' || bookingStep === 'paymentType' || bookingStep === 'paymentMethod') && (
                <TouchableOpacity 
                  className="flex-row items-center mb-4"
                  onPress={
                    bookingStep === 'paymentMethod' ? handleBackToPaymentType :
                    bookingStep === 'paymentType' ? handleBackToDateTime : 
                    handleBackToServices
                  }
                  disabled={isProcessing}
                >
                  <Ionicons name="arrow-back" size={24} color="#ec4899" />
                  <Text className="text-pink-500 font-semibold ml-2">
                    {bookingStep === 'paymentMethod' ? 'Back to Payment Type' : 
                     bookingStep === 'paymentType' ? 'Back to Date Selection' : 'Back to Services'}
                  </Text>
                </TouchableOpacity>
              )}
              
              <Text className="text-3xl font-bold text-gray-800 mb-2">
                {bookingStep === 'service' ? 'Book Appointment' : 
                 bookingStep === 'datetime' ? 'Select Date' : 
                 bookingStep === 'paymentType' ? 'Select Payment Type' : 'Select Payment Method'}
              </Text>
              <Text className="text-gray-500 mb-6">
                {bookingStep === 'service' ? 'Choose a service to get started' : 
                 bookingStep === 'datetime' ? `Selected: ${selectedService?.service_name}` : 
                 bookingStep === 'paymentType' ? `Selected Date: ${selectedDate.toLocaleDateString()}` :
                 `Complete your booking`}
              </Text>
              
              {/* Step 1: Service Selection */}
              {bookingStep === 'service' && (
                <>
                  {isLoading ? (
                    <View className="py-10">
                      <Text className="text-center text-gray-500">Loading services...</Text>
                    </View>
                  ) : activeServices.length === 0 ? (
                    <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                      <Ionicons name="cut-outline" size={50} color="#d1d5db" />
                      <Text className="text-gray-500 text-center mt-3">No services available</Text>
                    </View>
                  ) : (
                    <>
                      {activeServices.map((service) => (
                        <TouchableOpacity 
                          key={service.id} 
                          className={`bg-white rounded-2xl p-4 mb-3 shadow-sm border-2 ${
                            selectedServiceId === service.id ? 'border-pink-500' : 'border-transparent'
                          }`}
                          onPress={() => handleSelectService(service.id)}
                          activeOpacity={0.7}
                          disabled={isProcessing}
                        >
                          <View className="flex-row items-start">
                            <View className={`w-6 h-6 rounded-full border-2 mr-3 mt-1 items-center justify-center ${
                              selectedServiceId === service.id ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                            }`}>
                              {selectedServiceId === service.id && (
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
                              </View>
                            </View>
                            <Text className="text-pink-500 font-bold text-lg">₱{service.price.toLocaleString()}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                      
                      {selectedServiceId && (
                        <TouchableOpacity 
                          className="bg-pink-500 py-4 rounded-xl mt-4 mb-6"
                          onPress={handleContinueToDateTime}
                          disabled={isProcessing}
                        >
                          <Text className="text-white text-center font-semibold text-lg">Continue to Date Selection</Text>
                        </TouchableOpacity>
                      )}
                    </>
                  )}
                </>
              )}
              
              {/* Step 2: Date Selection */}
              {bookingStep === 'datetime' && (
                <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                  <View className="bg-pink-50 rounded-xl p-4 mb-6">
                    <Text className="text-gray-500 text-sm">Selected Service</Text>
                    <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-gray-500 text-sm">{selectedService?.duration_minutes} mins</Text>
                      <Text className="text-pink-500 font-bold">₱{totalPrice.toLocaleString()}</Text>
                    </View>
                  </View>
                  
                  <View className="mb-6">
                    <Text className="text-gray-700 font-semibold mb-3">Select Date</Text>
                    <TouchableOpacity 
                      className="flex-row items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
                      onPress={() => setShowDatePicker(true)}
                      disabled={isProcessing}
                    >
                      <View className="flex-row items-center">
                        <Ionicons name="calendar-outline" size={22} color="#ec4899" />
                        <Text className="text-gray-700 ml-3">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                      </View>
                      <Ionicons name="chevron-down" size={20} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                  
                  {showDatePicker && (
                    <Modal
                      transparent={true}
                      animationType="slide"
                      visible={showDatePicker}
                      onRequestClose={() => setShowDatePicker(false)}
                    >
                      <View className="flex-1 justify-end bg-black/50">
                        <View className="bg-white rounded-t-3xl p-4">
                          <View className="flex-row justify-between items-center mb-4">
                            <Text className="text-lg font-semibold text-gray-800">Select Date</Text>
                            <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                              <Text className="text-pink-500 font-semibold">Done</Text>
                            </TouchableOpacity>
                          </View>
                          <DateTimePicker
                            value={selectedDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={(event, date) => {
                              if (date && canBookToday(date)) {
                                setSelectedDate(date);
                              } else if (date && !canBookToday(date)) {
                                Alert.alert("Invalid Date", "Please select today or a future date.");
                              }
                              setShowDatePicker(false);
                            }}
                            minimumDate={new Date()}
                          />
                        </View>
                      </View>
                    </Modal>
                  )}
                  
                  <TouchableOpacity 
                    className="bg-pink-500 py-4 rounded-xl mt-2"
                    onPress={handleContinueToPaymentType}
                    disabled={isProcessing}
                  >
                    <Text className="text-white text-center font-semibold text-lg">Continue to Payment Type</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Step 3: Payment Type Selection */}
              {bookingStep === 'paymentType' && (
                <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                  <View className="bg-pink-50 rounded-xl p-4 mb-6">
                    <Text className="text-gray-500 text-sm">Appointment Summary</Text>
                    <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                    <View className="flex-row justify-between mt-2">
                      <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                      <Text className="text-pink-500 font-bold">₱{totalPrice.toLocaleString()}</Text>
                    </View>
                  </View>

                  <Text className="text-lg font-semibold text-gray-800 mb-3">How would you like to pay?</Text>
                  <Text className="text-gray-500 text-sm mb-4">Choose your payment arrangement</Text>
                  
                  {/* Downpayment Option */}
                  <TouchableOpacity 
                    className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border-2 ${
                      selectedPaymentType === 'downpayment' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setSelectedPaymentType('downpayment')}
                    disabled={isProcessing}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="card-outline" size={20} color="#3b82f6" />
                      </View>
                      <View>
                        <Text className="text-gray-800 font-semibold">Downpayment (50%)</Text>
                        <Text className="text-gray-500 text-xs">Pay ₱{halfPrice.toLocaleString()} now</Text>
                      </View>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedPaymentType === 'downpayment' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                    }`}>
                      {selectedPaymentType === 'downpayment' && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Remaining Balance Option */}
                  <TouchableOpacity 
                    className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                      selectedPaymentType === 'remaining' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setSelectedPaymentType('remaining')}
                    disabled={isProcessing}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="cash-outline" size={20} color="#10b981" />
                      </View>
                      <View>
                        <Text className="text-gray-800 font-semibold">Remaining Balance (50%)</Text>
                        <Text className="text-gray-500 text-xs">Pay ₱{halfPrice.toLocaleString()} at salon</Text>
                      </View>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedPaymentType === 'remaining' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                    }`}>
                      {selectedPaymentType === 'remaining' && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {selectedPaymentType && (
                    <View className="mt-4 p-3 bg-gray-50 rounded-xl">
                      <Text className="text-gray-600 text-sm">Amount Due: ₱{getAmount().toLocaleString()}</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    className="bg-pink-500 py-4 rounded-xl mt-6"
                    onPress={handleContinueToPaymentMethod}
                    disabled={isProcessing}
                  >
                    <Text className="text-white text-center font-semibold text-lg">Continue to Payment Method</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Step 4: Payment Method Selection (GCash or Cash only) */}
              {bookingStep === 'paymentMethod' && (
                <View className="bg-white rounded-2xl p-5 shadow-sm" style={{ elevation: 2 }}>
                  <View className="bg-pink-50 rounded-xl p-4 mb-6">
                    <Text className="text-gray-500 text-sm">Booking Summary</Text>
                    <Text className="text-lg font-bold text-gray-800">{selectedService?.service_name}</Text>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-sm">Date: {selectedDate.toLocaleDateString()}</Text>
                    </View>
                    <View className="flex-row justify-between mt-1">
                      <Text className="text-gray-500 text-sm">Payment Type: {getPaymentTypeLabel()}</Text>
                      <Text className="text-pink-500 font-bold">₱{getAmount().toLocaleString()}</Text>
                    </View>
                  </View>

                  <Text className="text-lg font-semibold text-gray-800 mb-3">Select Payment Method</Text>
                  <Text className="text-gray-500 text-sm mb-4">Choose how you want to complete the payment</Text>
                  
                  {/* GCash Option */}
                  <TouchableOpacity 
                    className={`flex-row items-center justify-between p-4 rounded-xl mb-3 border-2 ${
                      selectedPaymentMethod === 'gcash' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setSelectedPaymentMethod('gcash')}
                    disabled={isProcessing}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-blue-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="phone-portrait-outline" size={20} color="#3b82f6" />
                      </View>
                      <View>
                        <Text className="text-gray-800 font-semibold">GCash</Text>
                        <Text className="text-gray-500 text-xs">Pay via GCash wallet</Text>
                      </View>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedPaymentMethod === 'gcash' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'gcash' && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {/* Cash Option */}
                  <TouchableOpacity 
                    className={`flex-row items-center justify-between p-4 rounded-xl border-2 ${
                      selectedPaymentMethod === 'cash' ? 'border-pink-500 bg-pink-50' : 'border-gray-200 bg-white'
                    }`}
                    onPress={() => setSelectedPaymentMethod('cash')}
                    disabled={isProcessing}
                  >
                    <View className="flex-row items-center">
                      <View className="w-10 h-10 bg-green-100 rounded-full items-center justify-center mr-3">
                        <Ionicons name="cash-outline" size={20} color="#10b981" />
                      </View>
                      <View>
                        <Text className="text-gray-800 font-semibold">Cash</Text>
                        <Text className="text-gray-500 text-xs">Pay in cash at the salon</Text>
                      </View>
                    </View>
                    <View className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                      selectedPaymentMethod === 'cash' ? 'bg-pink-500 border-pink-500' : 'border-gray-300'
                    }`}>
                      {selectedPaymentMethod === 'cash' && (
                        <Ionicons name="checkmark" size={14} color="white" />
                      )}
                    </View>
                  </TouchableOpacity>

                  {selectedPaymentMethod && (
                    <View className="mt-4 p-3 bg-gray-50 rounded-xl">
                      <Text className="text-gray-600 text-sm">Total Payment: ₱{getAmount().toLocaleString()}</Text>
                    </View>
                  )}
                  
                  <TouchableOpacity 
                    className="bg-pink-500 py-4 rounded-xl mt-6"
                    onPress={handleConfirmBooking}
                    disabled={isProcessing}
                  >
                    <Text className="text-white text-center font-semibold text-lg">
                      {isProcessing ? 'Processing...' : 'Confirm Booking'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </ScrollView>
        );
      
      case 'history':
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
            }
          >
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-2">History</Text>
              <Text className="text-gray-500 mb-6">Your appointment records</Text>
              
              {isLoading ? (
                <View className="py-10">
                  <Text className="text-center text-gray-500">Loading history...</Text>
                </View>
              ) : appointments.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
                  <Ionicons name="document-text-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-500 text-center mt-3">No appointment history</Text>
                  <TouchableOpacity className="mt-4 bg-pink-500 px-6 py-2 rounded-full" onPress={() => setActiveTab('book')}>
                    <Text className="text-white font-semibold">Book Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                appointments.map((item) => (
                  <View key={item.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                    <View className="flex-row justify-between items-start">
                      <View>
                        <Text className="font-semibold text-gray-800 text-lg">{item.service_name}</Text>
                        <Text className="text-gray-500 text-sm">{item.duration_minutes} mins</Text>
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                          <Text className="text-gray-400 text-xs ml-1">{formatDate(item.appointment_date)}</Text>
                        </View>
                      </View>
                      <Text className="text-pink-500 font-semibold">₱{parseFloat(item.price).toLocaleString()}</Text>
                    </View>
                    <View className={`mt-2 px-2 py-0.5 rounded-full self-start ${getStatusColor(item.status)}`}>
                      <Text className="text-xs font-semibold capitalize">{item.status}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </ScrollView>
        );
      
      case 'settings':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>
              
              <View className="bg-white rounded-2xl p-5 mb-4 items-center" style={{ elevation: 2 }}>
                <View className="bg-pink-100 p-4 rounded-full mb-3">
                  <Ionicons name="person" size={50} color="#ec4899" />
                </View>
                <Text className="text-xl font-bold text-gray-800">{user?.first_name} {user?.last_name}</Text>
                <Text className="text-gray-500">{user?.email}</Text>
                <Text className="text-gray-500 text-sm">Customer since {user?.created_at ? new Date(user.created_at).getFullYear() : '2024'}</Text>
                <TouchableOpacity className="bg-pink-500 px-6 py-2 rounded-full mt-3">
                  <Text className="text-white font-semibold">Edit Profile</Text>
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-semibold text-gray-800 mb-3">Account Settings</Text>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="person-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Personal Information</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="notifications-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3">
                  <Ionicons name="lock-closed-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Change Password</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-semibold text-gray-800 mb-3">Preferences</Text>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="language-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Language</Text>
                  <Text className="text-gray-500 mr-2">English</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3">
                  <Ionicons name="moon-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Dark Mode</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-semibold text-gray-800 mb-3">Support</Text>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="help-circle-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Help Center</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3">
                  <Ionicons name="chatbubble-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Contact Us</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              <TouchableOpacity className="bg-red-500 py-4 rounded-xl mb-6" onPress={handleLogout}>
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
      
      <View className="flex-row justify-around items-center border-t border-gray-200 bg-white py-3 px-5">
        <TouchableOpacity 
          className="items-center py-1"
          onPress={() => setActiveTab('home')}
        >
          <Ionicons 
            name={activeTab === 'home' ? "home" : "home-outline"} 
            size={24} 
            color={activeTab === 'home' ? "#ec4899" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'home' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1"
          onPress={() => setActiveTab('book')}
        >
          <Ionicons 
            name={activeTab === 'book' ? "calendar" : "calendar-outline"} 
            size={24} 
            color={activeTab === 'book' ? "#ec4899" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'book' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
            Book
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1"
          onPress={() => setActiveTab('history')}
        >
          <Ionicons 
            name={activeTab === 'history' ? "heart" : "heart-outline"} 
            size={24} 
            color={activeTab === 'history' ? "#ec4899" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'history' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
            History
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1"
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name={activeTab === 'settings' ? "settings" : "settings-outline"} 
            size={24} 
            color={activeTab === 'settings' ? "#ec4899" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'settings' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
            Settings
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}