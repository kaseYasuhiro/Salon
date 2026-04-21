import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";

export default function CustomerDashboard() {
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
            <View className="bg-pink-500 px-5 pt-12 pb-8" style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Welcome Back, Jerwin! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have 1 Upcoming Appointment(s)
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
                <Text className="text-pink-500 text-3xl font-bold mt-3">1</Text>
                <Text className="text-gray-400 text-xs mt-1">Appointments</Text>
              </View>

              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg" style={{ elevation: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Total Spent</Text>
                  <View className="bg-green-100 p-2 rounded-full">
                    <Ionicons name="cash-outline" size={18} color="#10b981" />
                  </View>
                </View>
                <Text className="text-green-600 text-3xl font-bold mt-3">₱2,500</Text>
                <Text className="text-gray-400 text-xs mt-1">This Month</Text>
              </View>
            </View>

            {/* Upcoming Appointments */}
            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">
                  Upcoming Appointments
                </Text>
                <TouchableOpacity className="flex-row items-center">
                  <Text className="text-pink-500 font-semibold mr-1">View All</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>

              {/* Appointment Card */}
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4 }}>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <View className="flex-row items-center mb-2">
                      <View className="bg-pink-100 p-2 rounded-full mr-3">
                        <Ionicons name="person-circle-outline" size={24} color="#ec4899" />
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
                  
                  <View className="bg-pink-100 px-4 py-2 rounded-full">
                    <Text className="text-pink-500 font-bold text-base">3:30 PM</Text>
                  </View>
                </View>

                {/* Status Badge */}
                <View className="flex-row mt-3">
                  <View className="bg-green-100 px-3 py-1.5 rounded-full">
                    <Text className="text-green-700 text-xs font-semibold">✓ Confirmed</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View className="flex-row mt-4 pt-3 border-t border-gray-100">
                  <TouchableOpacity className="flex-1 bg-pink-500 py-2.5 rounded-xl mr-2">
                    <Text className="text-white text-center font-semibold">Reschedule</Text>
                  </TouchableOpacity>
                  <TouchableOpacity className="flex-1 bg-gray-100 py-2.5 rounded-xl ml-2">
                    <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Recommended Services */}
              <View className="bg-pink-50 rounded-2xl p-4 mt-2">
                <View className="flex-row justify-between items-center">
                  <View>
                    <Text className="text-gray-600 text-sm">Recommended for you</Text>
                    <Text className="text-gray-800 font-semibold mt-1">Hair Spa Treatment</Text>
                    <Text className="text-gray-500 text-sm">20% off today</Text>
                  </View>
                  <TouchableOpacity className="bg-pink-500 px-4 py-2 rounded-full">
                    <Text className="text-white font-semibold text-sm">Book Now</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Recent Services */}
            <View className="px-5 mt-6 mb-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Recent Services</Text>
                <TouchableOpacity className="flex-row items-center">
                  <Text className="text-pink-500 font-semibold mr-1">View All</Text>
                  <Ionicons name="arrow-forward" size={16} color="#ec4899" />
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-4" style={{ elevation: 2 }}>
                <View className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                      <Ionicons name="cut-outline" size={18} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold">Haircut</Text>
                      <Text className="text-gray-500 text-xs">Mar 25, 2024</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-bold">₱100</Text>
                </View>
                
                <View className="flex-row justify-between items-center py-3">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                      <Ionicons name="color-palette-outline" size={18} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="text-gray-800 font-semibold">Hair Rebond</Text>
                      <Text className="text-gray-500 text-xs">Mar 20, 2024</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-bold">₱1,500</Text>
                </View>
              </View>
            </View>

            {/* Loyalty Card */}
            <View className="px-5 mb-6">
              <View className="bg-gradient-to-r from-pink-400 to-pink-600 rounded-2xl p-5" style={{ backgroundColor: '#ec4899' }}>
                <View className="flex-row justify-between items-start">
                  <View>
                    <Text className="text-white opacity-90 text-sm">Loyalty Points</Text>
                    <Text className="text-white text-3xl font-bold mt-1">1,250</Text>
                    <Text className="text-white opacity-90 text-xs mt-2">Earn 100 more points for ₱100 off</Text>
                  </View>
                  <View className="bg-white bg-opacity-20 p-3 rounded-full">
                    <Ionicons name="gift-outline" size={28} color="white" />
                  </View>
                </View>
                
                {/* Progress Bar */}
                <View className="mt-4">
                  <View className="bg-white bg-opacity-30 rounded-full h-2">
                    <View className="bg-white rounded-full h-2" style={{ width: '75%' }} />
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        );
      
      case 'book':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-2">Book Appointment</Text>
              <Text className="text-gray-500 mb-6">Schedule your next salon visit</Text>
              
              {/* Service Categories */}
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-bold text-gray-800 mb-3">Popular Services</Text>
                
                <TouchableOpacity className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                      <Ionicons name="cut-outline" size={20} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-800">Haircut</Text>
                      <Text className="text-gray-500 text-sm">30 mins</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-bold">₱100</Text>
                </TouchableOpacity>
                
                <TouchableOpacity className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                      <Ionicons name="color-palette-outline" size={20} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-800">Hair Rebond</Text>
                      <Text className="text-gray-500 text-sm">2 hours</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-bold">₱1,500</Text>
                </TouchableOpacity>
                
                <TouchableOpacity className="flex-row justify-between items-center py-3 border-b border-gray-100">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                      <Ionicons name="water-outline" size={20} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-800">Hair Treatment</Text>
                      <Text className="text-gray-500 text-sm">1 hour</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-bold">₱800</Text>
                </TouchableOpacity>
                
                <TouchableOpacity className="flex-row justify-between items-center py-3">
                  <View className="flex-row items-center">
                    <View className="bg-pink-100 p-2 rounded-full mr-3">
                      <Ionicons name="brush-outline" size={20} color="#ec4899" />
                    </View>
                    <View>
                      <Text className="font-semibold text-gray-800">Hair Color</Text>
                      <Text className="text-gray-500 text-sm">1hr 30mins</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-bold">₱1,200</Text>
                </TouchableOpacity>
              </View>
              
              {/* Stylists */}
              <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
                <Text className="text-lg font-bold text-gray-800 mb-3">Choose Stylist</Text>
                
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <TouchableOpacity className="items-center mr-4">
                    <View className="bg-pink-100 p-3 rounded-full">
                      <Ionicons name="person" size={30} color="#ec4899" />
                    </View>
                    <Text className="text-gray-700 text-sm mt-2">Jerwin</Text>
                    <Text className="text-green-500 text-xs">Available</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity className="items-center mr-4">
                    <View className="bg-gray-100 p-3 rounded-full">
                      <Ionicons name="person" size={30} color="#9ca3af" />
                    </View>
                    <Text className="text-gray-700 text-sm mt-2">Maria</Text>
                    <Text className="text-gray-400 text-xs">Busy</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity className="items-center mr-4">
                    <View className="bg-gray-100 p-3 rounded-full">
                      <Ionicons name="person" size={30} color="#9ca3af" />
                    </View>
                    <Text className="text-gray-700 text-sm mt-2">John</Text>
                    <Text className="text-gray-400 text-xs">Off</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
              
              <TouchableOpacity className="bg-pink-500 py-4 rounded-xl mb-6">
                <Text className="text-white text-center font-semibold text-lg">Continue to Booking</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        );
      
      case 'history':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-2">History</Text>
              <Text className="text-gray-500 mb-6">Your appointment records</Text>
              
              <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 2 }}>
                <View className="flex-row justify-between items-start">
                  <View>
                    <View className="flex-row items-center mb-2">
                      <View className="bg-pink-100 p-2 rounded-full mr-2">
                        <Ionicons name="person" size={16} color="#ec4899" />
                      </View>
                      <Text className="font-semibold text-gray-800 text-lg">Jerwin Buray</Text>
                    </View>
                    <Text className="text-gray-500">Alot Mahay</Text>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">Mar 25, 2024</Text>
                      <Ionicons name="time-outline" size={14} color="#9ca3af" style={{ marginLeft: 10 }} />
                      <Text className="text-gray-400 text-xs ml-1">2:00 PM</Text>
                    </View>
                  </View>
                  <View className="bg-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-600 text-xs font-semibold">Completed</Text>
                  </View>
                </View>
                <Text className="text-pink-500 font-semibold mt-2">₱100</Text>
                
                <TouchableOpacity className="mt-3 pt-2 border-t border-gray-100">
                  <Text className="text-pink-500 text-sm text-center">Book Again</Text>
                </TouchableOpacity>
              </View>
              
              <View className="bg-white rounded-2xl p-4 mb-3" style={{ elevation: 2 }}>
                <View className="flex-row justify-between items-start">
                  <View>
                    <View className="flex-row items-center mb-2">
                      <View className="bg-pink-100 p-2 rounded-full mr-2">
                        <Ionicons name="person" size={16} color="#ec4899" />
                      </View>
                      <Text className="font-semibold text-gray-800 text-lg">Maria Santos</Text>
                    </View>
                    <Text className="text-gray-500">Hair Rebond</Text>
                    <View className="flex-row items-center mt-2">
                      <Ionicons name="calendar-outline" size={14} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">Mar 20, 2024</Text>
                      <Ionicons name="time-outline" size={14} color="#9ca3af" style={{ marginLeft: 10 }} />
                      <Text className="text-gray-400 text-xs ml-1">1:00 PM</Text>
                    </View>
                  </View>
                  <View className="bg-green-100 px-3 py-1 rounded-full">
                    <Text className="text-green-600 text-xs font-semibold">Completed</Text>
                  </View>
                </View>
                <Text className="text-pink-500 font-semibold mt-2">₱1,500</Text>
                
                <TouchableOpacity className="mt-3 pt-2 border-t border-gray-100">
                  <Text className="text-pink-500 text-sm text-center">Book Again</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        );
      
      case 'settings':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>
              
              {/* Customer Profile */}
              <View className="bg-white rounded-2xl p-5 mb-4 items-center" style={{ elevation: 2 }}>
                <View className="bg-pink-100 p-4 rounded-full mb-3">
                  <Ionicons name="person" size={50} color="#ec4899" />
                </View>
                <Text className="text-xl font-bold text-gray-800">Jerwin Buray</Text>
                <Text className="text-gray-500">Customer since 2024</Text>
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
      
      {/* Bottom Navigation Bar */}
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