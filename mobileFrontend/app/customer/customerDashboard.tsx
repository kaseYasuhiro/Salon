import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import CustomerBooking from "./customerBookTab";
import CustomerHistoryTab from "./customerHistoryTab";
import CustomerSettingsTab from "./customerSettingsTab";

export default function CustomerDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const { 
    user, 
    appointments,
    isLoading, 
    fetchUserAppointments,
    fetchServices,
    getUpcomingAppointments,
    getTotalSpent,
    logout 
  } = useAuth();

  // Get computed data
  const upcomingAppointments = getUpcomingAppointments();
  const totalSpent = getTotalSpent();
  const upcomingCount = upcomingAppointments.length;

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

  const handleBookingSuccess = () => {
    // Trigger refresh in history tab
    setRefreshTrigger(prev => prev + 1);
    fetchUserAppointments();
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
        return <CustomerBooking onBookingSuccess={handleBookingSuccess} />;
      
      case 'history':
        return <CustomerHistoryTab refreshTrigger={refreshTrigger} />;
      
      case 'settings':
        return <CustomerSettingsTab onLogout={handleLogout} />;
      
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