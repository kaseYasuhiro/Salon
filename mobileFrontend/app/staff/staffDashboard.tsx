import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";

export default function StaffDashboard() {
  const [activeTab, setActiveTab] = useState('home');
  const { logout } = useAuth();

  const handleLogout = async () => {
      try {
        await logout();
        router.replace("/");
      } catch (error){
        console.log("Logout Error.", error);
        router.replace("/");
      }
    }

  const renderContent = () => {
    switch(activeTab) {
      case 'home':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            {/* Header */}
            <View className="bg-purple-600 px-5 pt-12 pb-8" style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Welcome Back, Tortor! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have 1 Appointment(s) Today
                  </Text>
                </View>
                <TouchableOpacity className="bg-white bg-opacity-20 p-2 rounded-full">
                  <Ionicons name="person-outline" size={24} color="white" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Stats Cards */}
            <View className="flex-row justify-between px-4 mt-6" style={{ marginTop: -25 }}>
              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Today</Text>
                  <View className="bg-purple-100 p-2 rounded-full">
                    <Ionicons name="calendar" size={18} color="#9333ea" />
                  </View>
                </View>
                <Text className="text-purple-600 text-3xl font-bold mt-3">1</Text>
                <Text className="text-gray-400 text-xs mt-1">Appointments</Text>
              </View>

              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">This Month</Text>
                  <View className="bg-green-100 p-2 rounded-full">
                    <Ionicons name="cash-outline" size={18} color="#10b981" />
                  </View>
                </View>
                <Text className="text-green-600 text-3xl font-bold mt-3">₱2,500</Text>
                <Text className="text-gray-400 text-xs mt-1">Total Earnings</Text>
              </View>
            </View>

            {/* Today's Schedule */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Today's Schedule
                </Text>
                <TouchableOpacity className="flex-row items-center">
                  <Text className="text-purple-600 font-semibold mr-1">View All</Text>
                  <Ionicons name="arrow-forward" size={16} color="#9333ea" />
                </TouchableOpacity>
              </View>

              {/* Appointment Card */}
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="bg-purple-100 p-2 rounded-full mr-3">
                        <Ionicons name="person-circle-outline" size={24} color="#9333ea" />
                      </View>
                      <View>
                        <Text className="text-gray-800 text-lg font-bold">Jerwin Buray</Text>
                        <Text className="text-gray-500 text-sm">Alot Mahay</Text>
                      </View>
                    </View>
                    
                    <View className="flex-row items-center mt-3">
                      <View className="flex-row items-center mr-4">
                        <Ionicons name="time-outline" size={16} color="#9ca3af" />
                        <Text className="text-gray-600 text-sm ml-1">1hr 30mins</Text>
                      </View>
                      <View className="flex-row items-center">
                        <Ionicons name="location-outline" size={16} color="#9ca3af" />
                        <Text className="text-gray-600 text-sm ml-1">Salon</Text>
                      </View>
                    </View>
                  </View>
                  
                  <View className="bg-purple-100 px-4 py-2 rounded-full">
                    <Text className="text-purple-600 font-bold text-base">3:30 PM</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row mt-4 pt-3 border-t border-gray-100">
                  <TouchableOpacity className="flex-1 bg-purple-600 py-2.5 rounded-xl mr-2">
                    <Text className="text-white text-center font-semibold">Start Service</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1 bg-gray-100 py-2.5 rounded-xl ml-2">
                    <Text className="text-gray-700 text-center font-semibold">Reschedule</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Next Appointment Preview */}
              <View className="bg-purple-50 rounded-2xl p-4">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-gray-600 text-sm">Next Appointment</Text>
                    <Text className="text-gray-800 font-semibold mt-1">Maria Santos</Text>
                    <Text className="text-gray-500 text-sm">Hair Rebond</Text>
                  </View>
                  <View className="bg-white px-3 py-2 rounded-full">
                    <Text className="text-purple-600 font-semibold">5:00 PM</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* This Month's Earnings Card */}
            <View className="px-5 mt-6 mb-6">
              <View className="bg-gradient-to-r from-purple-500 to-purple-700 rounded-2xl p-5" style={{ backgroundColor: '#7c3aed' }}>
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-white opacity-90 text-sm font-medium">This Month's Earnings</Text>
                    <Text className="text-white text-4xl font-bold mt-2">₱9,561</Text>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="trending-up" size={18} color="#ffffff" />
                      <Text className="text-white text-xs ml-1">+100% from last month</Text>
                    </View>
                  </View>
                  <View className="bg-white bg-opacity-20 p-3 rounded-full">
                    <Ionicons name="stats-chart" size={28} color="white" />
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View className="mt-4">
                  <View className="flex-row justify-between mb-1">
                    <Text className="text-white text-xs">Monthly Goal</Text>
                    <Text className="text-white text-xs">95%</Text>
                  </View>
                  <View className="bg-white bg-opacity-30 rounded-full h-2">
                    <View className="bg-white rounded-full h-2" style={{ width: '95%' }} />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );
      
      case 'schedule':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-2">Schedule</Text>
              <Text className="text-gray-500 mb-6">Manage your appointments</Text>
              
              {/* Date Selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-6">
                {['Today', 'Tomorrow', 'Wed 2', 'Thu 3', 'Fri 4'].map((day, index) => (
                  <TouchableOpacity key={index} className={`mr-3 px-5 py-3 rounded-xl ${index === 0 ? 'bg-purple-600' : 'bg-gray-100'}`}>
                    <Text className={`font-semibold ${index === 0 ? 'text-white' : 'text-gray-700'}`}>{day}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              {/* Schedule List */}
              <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 2 }}>
                <View className="flex-row justify-between items-center mb-3">
                  <View className="bg-purple-100 px-3 py-1 rounded-full">
                    <Text className="text-purple-600 font-semibold text-sm">10:00 AM</Text>
                  </View>
                  <View className="bg-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-600 text-xs">Confirmed</Text>
                  </View>
                </View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="person-circle-outline" size={24} color="#9333ea" />
                  <Text className="text-gray-800 font-semibold ml-2">John Doe</Text>
                </View>
                <Text className="text-gray-500">Haircut + Treatment</Text>
                <Text className="text-gray-400 text-xs mt-2">Duration: 2 hours</Text>
              </View>
              
              <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 2 }}>
                <View className="flex-row justify-between items-center mb-3">
                  <View className="bg-purple-100 px-3 py-1 rounded-full">
                    <Text className="text-purple-600 font-semibold text-sm">2:30 PM</Text>
                  </View>
                  <View className="bg-yellow-100 px-3 py-1 rounded-full">
                    <Text className="text-yellow-600 text-xs">Pending</Text>
                  </View>
                </View>
                <View className="flex-row items-center mb-2">
                  <Ionicons name="person-circle-outline" size={24} color="#9333ea" />
                  <Text className="text-gray-800 font-semibold ml-2">Jane Smith</Text>
                </View>
                <Text className="text-gray-500">Hair Rebond</Text>
                <Text className="text-gray-400 text-xs mt-2">Duration: 1hr 30mins</Text>
              </View>
            </View>
          </ScrollView>
        );
      
      case 'earnings':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-2">Earnings</Text>
              <Text className="text-gray-500 mb-6">Track your income</Text>
              
              {/* Total Earnings Card */}
              <View className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl p-5 mb-6">
                <Text className="text-white opacity-90">Total Earnings</Text>
                <Text className="text-white text-4xl font-bold mt-1">₱12,061</Text>
                <Text className="text-white opacity-90 text-sm mt-2">This month</Text>
              </View>
              
              {/* Earnings Breakdown */}
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-bold text-gray-800 mb-3">Earnings Breakdown</Text>
                
                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-purple-100 p-2 rounded-full mr-3">
                      <Ionicons name="cut-outline" size={18} color="#9333ea" />
                    </View>
                    <Text className="text-gray-700">Haircut Services</Text>
                  </View>
                  <Text className="text-gray-800 font-semibold">₱3,500</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-purple-100 p-2 rounded-full mr-3">
                      <Ionicons name="color-palette-outline" size={18} color="#9333ea" />
                    </View>
                    <Text className="text-gray-700">Hair Rebond</Text>
                  </View>
                  <Text className="text-gray-800 font-semibold">₱6,000</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-3">
                  <View className="flex-row items-center">
                    <View className="bg-purple-100 p-2 rounded-full mr-3">
                      <Ionicons name="water-outline" size={18} color="#9333ea" />
                    </View>
                    <Text className="text-gray-700">Hair Treatment</Text>
                  </View>
                  <Text className="text-gray-800 font-semibold">₱2,561</Text>
                </View>
              </View>
              
              {/* Weekly Performance */}
              <View className="bg-white rounded-2xl p-5 mb-6" style={{ elevation: 2 }}>
                <Text className="text-lg font-bold text-gray-800 mb-3">Weekly Performance</Text>
                <View className="flex-row justify-between items-end">
                  <View className="items-center">
                    <View className="bg-purple-100 rounded-full h-12 w-12 items-center justify-center mb-2">
                      <Text className="text-purple-600 font-bold">₱800</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">Mon</Text>
                  </View>
                  <View className="items-center">
                    <View className="bg-purple-200 rounded-full h-16 w-12 items-center justify-center mb-2">
                      <Text className="text-purple-600 font-bold">₱1,200</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">Tue</Text>
                  </View>
                  <View className="items-center">
                    <View className="bg-purple-300 rounded-full h-20 w-12 items-center justify-center mb-2">
                      <Text className="text-purple-600 font-bold">₱1,800</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">Wed</Text>
                  </View>
                  <View className="items-center">
                    <View className="bg-purple-400 rounded-full h-14 w-12 items-center justify-center mb-2">
                      <Text className="text-white font-bold">₱1,000</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">Thu</Text>
                  </View>
                  <View className="items-center">
                    <View className="bg-purple-500 rounded-full h-18 w-12 items-center justify-center mb-2">
                      <Text className="text-white font-bold">₱1,500</Text>
                    </View>
                    <Text className="text-gray-500 text-xs">Fri</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );
      
      case 'settings':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>
              
              {/* Staff Profile */}
              <View className="bg-white rounded-2xl p-5 mb-4 items-center" style={{ elevation: 2 }}>
                <View className="bg-purple-100 p-4 rounded-full mb-3">
                  <Ionicons name="person" size={50} color="#9333ea" />
                </View>
                <Text className="text-xl font-bold text-gray-800">Tortor Alot</Text>
                <Text className="text-gray-500">Senior Stylist</Text>
                <TouchableOpacity className="bg-purple-600 px-6 py-2 rounded-full mt-3">
                  <Text className="text-white font-semibold">Edit Profile</Text>
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-semibold text-gray-800 mb-3">Account Settings</Text>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="notifications-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="lock-closed-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Privacy & Security</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3">
                  <Ionicons name="language-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Language</Text>
                  <Text className="text-gray-500 mr-2">English</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-semibold text-gray-800 mb-3">Work Settings</Text>
                <TouchableOpacity className="flex-row items-center py-3 border-b border-gray-100">
                  <Ionicons name="time-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Working Hours</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>
                <TouchableOpacity className="flex-row items-center py-3">
                  <Ionicons name="calendar-outline" size={22} color="#9333ea" />
                  <Text className="ml-3 flex-1 text-gray-700">Day Off</Text>
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
      
      {/* Bottom Navigation Bar */}
      <View className="flex-row justify-around items-center border-t border-gray-200 bg-white py-3 px-5">
        <TouchableOpacity 
          className="items-center py-1"
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
          className="items-center py-1"
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
          className="items-center py-1"
          onPress={() => setActiveTab('earnings')}
        >
          <Ionicons 
            name={activeTab === 'earnings' ? "cash" : "cash-outline"} 
            size={24} 
            color={activeTab === 'earnings' ? "#9333ea" : "#9ca3af"} 
          />
          <Text className={`text-xs mt-1 ${activeTab === 'earnings' ? 'text-purple-600 font-semibold' : 'text-gray-400'}`}>
            Earnings
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          className="items-center py-1"
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