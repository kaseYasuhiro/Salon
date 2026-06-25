import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
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

interface StaffAppointmentsProps {
  refreshing: boolean;
  onRefresh: () => void;
  onOpenReportModal: (appointment: Appointment) => void;
}

export default function StaffAppointments({ 
  refreshing, 
  onRefresh,
  onOpenReportModal 
}: StaffAppointmentsProps) {
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
    updateServiceWithInventory
  } = useAuth();

  // Get UTC date string from Date object
  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
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
        notes: updateFormData.notes,
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

  // Filter appointments for today - using UTC date comparison
  const todayAppointments = staffAppointments.filter(app => {
    const today = getUTCDateString(new Date());
    return app.appointment_date === today;
  });

  // Filter upcoming appointments (future dates)
  const upcomingAppointments = staffAppointments.filter(app => {
    const today = getUTCDateString(new Date());
    return app.appointment_date > today;
  });

  const renderAppointmentCard = (app: Appointment) => {
    const isCompleted = app.service_status === 'completed' || app.status === 'completed';
    
    return (
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
                <Text className="text-gray-400 text-xs italic" numberOfLines={1}>{app.notes}</Text>
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
          
          {isCompleted ? (
            <TouchableOpacity 
              className="bg-red-600 px-5 py-2 rounded-xl"
              onPress={() => onOpenReportModal(app)}
            >
              <Text className="text-white font-semibold text-sm">Report</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity 
              className="bg-blue-600 px-5 py-2 rounded-xl"
              onPress={() => handleOpenUpdateModal(app)}
            >
              <Text className="text-white font-semibold text-sm">Update</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  return (
    <>
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#9333ea']} />
        }
      >
        <View className="px-5 pt-6">
          <Text className="text-3xl font-bold text-gray-800 mb-2">My Appointments</Text>
          <Text className="text-gray-500 mb-6">All your assigned appointments</Text>
          
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
              
              {/* Notes Field */}
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
    </>
  );
}