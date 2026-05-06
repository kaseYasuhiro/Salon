import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import api from '@/api/axios';

interface ProductUsage {
  id: number;
  product_id: number;
  product_name: string;
  estimated_usage: number;
  inventory_id: number | null;
  current_quantity: number;
  current_usages: number;
  quantity_change: number;
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
}

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState<'home' | 'schedule' | 'settings'>('home');
  const [refreshing, setRefreshing] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [productUsages, setProductUsages] = useState<ProductUsage[]>([]);
  const [updateFormData, setUpdateFormData] = useState({
    status: '',
    service_status: '',
    notes: ''
  });
  const [isUpdating, setIsUpdating] = useState(false);
  
  const { 
    user, 
    staffAppointments, 
    fetchStaffAppointments, 
    updateServiceWithInventory,
    logout 
  } = useAuth();

  // Debug: Log appointments when they change
  useEffect(() => {
    console.log("Staff appointments from store:", staffAppointments);
    if (staffAppointments.length > 0) {
      console.log("First appointment:", staffAppointments[0]);
      console.log("Service ID of first appointment:", staffAppointments[0].service_id);
    }
  }, [staffAppointments]);

  // Fetch appointments on mount
  useEffect(() => {
    if (user?.id) {
      fetchStaffAppointments();
    }
  }, [user?.id]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchStaffAppointments();
    setRefreshing(false);
  }, [fetchStaffAppointments]);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("Logout Error.", error);
      router.replace("/");
    }
  };

  const fetchProductUsagesForService = async (serviceId: number) => {
    try {
      console.log("Fetching product usages for service ID:", serviceId);
      const response = await api.get(`/service/${serviceId}/product-usages`);
      console.log("Product usages response:", response.data);
      
      if (Array.isArray(response.data)) {
        const usages = response.data.map((usage: any) => ({
          id: usage.id,
          product_id: usage.product_id,
          product_name: usage.product_name,
          estimated_usage: usage.estimated_usage,
          inventory_id: usage.inventory_id,
          current_quantity: usage.current_quantity,
          current_usages: usage.current_usages,
          quantity_change: 0
        }));
        setProductUsages(usages);
      } else {
        setProductUsages([]);
      }
    } catch (error) {
      console.error("Error fetching product usages:", error);
      Alert.alert("Error", "Failed to load product information");
      setProductUsages([]);
    }
  };

  const handleOpenUpdateModal = (appointment: Appointment) => {
    console.log("Full appointment data:", appointment);
    console.log("Service ID:", appointment.service_id);
    
    setSelectedAppointment(appointment);
    setUpdateFormData({
      status: appointment.status,
      service_status: appointment.service_status,
      notes: appointment.notes || ''
    });
    
    if (appointment.service_id) {
      console.log("Fetching product usages for service ID:", appointment.service_id);
      fetchProductUsagesForService(appointment.service_id);
    } else {
      console.log("No service_id found in appointment");
      setProductUsages([]);
    }
    
    setShowUpdateModal(true);
  };

  const handleProductQuantityChange = (index: number, value: string) => {
    const updatedUsages = [...productUsages];
    const numericValue = parseInt(value) || 0;
    updatedUsages[index].quantity_change = numericValue;
    setProductUsages(updatedUsages);
  };

  const handleUpdateSubmit = async () => {
    if (!selectedAppointment) return;
    
    // Validate that quantity changes don't exceed available stock
    for (const product of productUsages) {
      if (product.quantity_change > 0 && product.inventory_id) {
        const availableUsages = (product.current_quantity * product.estimated_usage) - product.current_usages;
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
        service_status: updateFormData.service_status,
        notes: updateFormData.notes,  // Include notes in the update
        product_usages: productUsages
          .filter(p => p.quantity_change > 0 && p.inventory_id)
          .map(p => ({
            inventory_id: p.inventory_id,
            quantity_change: p.quantity_change
          }))
      };
      
      console.log("Updating with data:", updateData);
      
      await updateServiceWithInventory(selectedAppointment.transaction_id, updateData);
      
      Alert.alert("Success", "Service updated successfully!");
      setShowUpdateModal(false);
      setSelectedAppointment(null);
      await fetchStaffAppointments();
    } catch (error: any) {
      console.error("Update error:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update service");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filter appointments for today
  const todayAppointments = staffAppointments.filter(app => {
    const today = new Date().toISOString().split('T')[0];
    return app.appointment_date === today;
  });

  // Filter upcoming appointments (future dates)
  const upcomingAppointments = staffAppointments.filter(app => {
    const today = new Date().toISOString().split('T')[0];
    return app.appointment_date > today;
  });

  // Calculate earnings
  const completedEarnings = staffAppointments
    .filter(app => app.service_status === 'completed')
    .reduce((sum, app) => sum + parseFloat(app.price || '0'), 0);
  
  const todayEarnings = todayAppointments
    .filter(app => app.service_status === 'completed')
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

  const renderAppointmentCard = (app: Appointment) => (
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
          
          {app.notes && (
            <View className="flex-row items-center mt-1">
              <Ionicons name="document-text-outline" size={12} color="#9ca3af" />
              <Text className="text-gray-400 text-xs ml-1 italic" numberOfLines={1}>{app.notes}</Text>
            </View>
          )}
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
        
        <TouchableOpacity 
          className="bg-blue-600 px-5 py-2 rounded-xl"
          onPress={() => handleOpenUpdateModal(app)}
        >
          <Text className="text-white font-semibold text-sm">Update</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

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
                <Text className="text-green-600 text-3xl font-bold mt-3">₱{todayEarnings.toLocaleString()}</Text>
                <Text className="text-gray-400 text-xs mt-1">Completed</Text>
              </View>
            </View>

            {/* Today's Schedule */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Today's Schedule</Text>
                <TouchableOpacity onPress={() => setActiveTab('schedule')}>
                  <Text className="text-purple-600 font-semibold">View All</Text>
                </TouchableOpacity>
              </View>

              {todayAppointments.length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center">
                  <Ionicons name="calendar-outline" size={50} color="#d1d5db" />
                  <Text className="text-gray-400 mt-3 text-center">No appointments today</Text>
                </View>
              ) : (
                todayAppointments.map(renderAppointmentCard)
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
      
      case 'schedule':
        return (
          <ScrollView 
            showsVerticalScrollIndicator={false} 
            className="flex-1"
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333ea']} />
            }
          >
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-2">My Schedule</Text>
              <Text className="text-gray-500 mb-6">All your appointments</Text>
              
              {/* Today's Appointments */}
              {todayAppointments.length > 0 && (
                <>
                  <Text className="text-lg font-bold text-gray-800 mb-3">Today</Text>
                  {todayAppointments.map(renderAppointmentCard)}
                </>
              )}
              
              {/* Upcoming Appointments */}
              {upcomingAppointments.length > 0 && (
                <>
                  <Text className="text-lg font-bold text-gray-800 mt-4 mb-3">Upcoming</Text>
                  {upcomingAppointments.map(renderAppointmentCard)}
                </>
              )}
              
              {/* No Appointments */}
              {staffAppointments.length === 0 && (
                <View className="bg-white rounded-2xl p-12 items-center">
                  <Ionicons name="calendar-outline" size={60} color="#d1d5db" />
                  <Text className="text-gray-400 mt-4 text-center">No appointments assigned yet</Text>
                </View>
              )}
            </View>
          </ScrollView>
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
      
      {/* Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={showUpdateModal}
        onRequestClose={() => setShowUpdateModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90%] overflow-hidden">
            <View className="bg-purple-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Update Service</Text>
              <TouchableOpacity onPress={() => setShowUpdateModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>
            
            <ScrollView className="p-6">
              {/* Customer Info */}
              <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                <Text className="text-gray-500 text-sm">Customer</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.customer_name}</Text>
                <Text className="text-gray-500 text-sm mt-2">Service</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.service_name}</Text>
                <Text className="text-gray-500 text-sm mt-2">Service ID</Text>
                <Text className="text-gray-800 font-semibold">{selectedAppointment?.service_id || 'Not available'}</Text>
              </View>
              
              {/* Appointment Status */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Appointment Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['pending', 'confirmed', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setUpdateFormData(prev => ({ ...prev, status }))}
                      className={`px-4 py-2 rounded-full ${
                        updateFormData.status === status 
                          ? 'bg-purple-600' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`capitalize ${updateFormData.status === status ? 'text-white' : 'text-gray-700'}`}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Service Status */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Service Status</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['pending', 'in_progress', 'completed', 'cancelled'].map((status) => (
                    <TouchableOpacity
                      key={status}
                      onPress={() => setUpdateFormData(prev => ({ ...prev, service_status: status }))}
                      className={`px-4 py-2 rounded-full ${
                        updateFormData.service_status === status 
                          ? 'bg-purple-600' 
                          : 'bg-gray-200'
                      }`}
                    >
                      <Text className={`capitalize ${updateFormData.service_status === status ? 'text-white' : 'text-gray-700'}`}>
                        {status === 'in_progress' ? 'In Progress' : status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              {/* Notes Field - NEW */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Notes</Text>
                <TextInput
                  value={updateFormData.notes}
                  onChangeText={(text) => setUpdateFormData(prev => ({ ...prev, notes: text }))}
                  placeholder="Add notes about this appointment..."
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="border border-gray-300 rounded-lg p-3 text-gray-700 min-h-[80px]"
                />
              </View>
              
              {/* Product Usage Section */}
              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Product Usage</Text>
                <Text className="text-gray-500 text-sm mb-3">Update quantity used for each product</Text>
                
                {productUsages.length === 0 ? (
                  <View className="bg-yellow-50 rounded-xl p-4">
                    <Text className="text-yellow-600 text-sm text-center">
                      No products configured for this service
                    </Text>
                  </View>
                ) : (
                  productUsages.map((product, index) => (
                    <View key={product.id} className="bg-gray-50 rounded-xl p-3 mb-3">
                      <Text className="text-gray-800 font-semibold">{product.product_name}</Text>
                      <Text className="text-gray-500 text-xs mb-2">
                        Estimated Usage: {product.estimated_usage} per service
                      </Text>
                      <View className="flex-row items-center gap-3">
                        <Text className="text-gray-600">Quantity Used:</Text>
                        <TextInput
                          value={product.quantity_change.toString()}
                          onChangeText={(value) => handleProductQuantityChange(index, value)}
                          keyboardType="numeric"
                          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-center"
                          placeholder="0"
                        />
                        <Text className="text-gray-600">units</Text>
                      </View>
                      <Text className="text-gray-400 text-xs mt-2">
                        Available Stock: {product.current_quantity} units
                      </Text>
                    </View>
                  ))
                )}
              </View>
              
              {/* Update Button */}
              <TouchableOpacity
                onPress={handleUpdateSubmit}
                disabled={isUpdating}
                className="bg-purple-600 py-3 rounded-xl mt-4"
              >
                <Text className="text-white text-center font-semibold">
                  {isUpdating ? 'Updating...' : 'Update Service'}
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
      
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