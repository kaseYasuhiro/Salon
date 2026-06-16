import React, { useState } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";

interface CustomerSettingsProps {
  onLogout?: () => void;
}

// Separate Change Password Component to isolate state
const ChangePasswordPage = ({ onBack }: { onBack: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { user, updatePassword } = useAuth();

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long.");
      return;
    }

    setIsUpdatingPassword(true);
    try {
      await updatePassword(user?.id || 0, {
        current_password: '',
        new_password: password,
        new_password_confirmation: confirmPassword
      });
      
      Alert.alert("Success", "Password updated successfully!");
      onBack();
    } catch (error: any) {
      console.error("Error updating password:", error);
      Alert.alert("Error", error.response?.data?.message || "Failed to update password. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 pt-12 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="p-1">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Change Password</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView className="flex-1 p-5">
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <View className="items-center mb-6">
            <View className="w-20 h-20 bg-pink-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="lock-closed-outline" size={40} color="#ec4899" />
            </View>
            <Text className="text-gray-800 text-lg font-semibold text-center">
              Update Your Password
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Choose a strong password to keep your account secure
            </Text>
          </View>

          <View className="space-y-4">
            <View>
              <Text className="text-gray-700 text-sm font-semibold mb-2">New Password *</Text>
              <View className="flex-row items-center border border-gray-200 rounded-lg px-3 bg-gray-50">
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                <TextInput
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter new password"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 py-3 ml-2 text-gray-800"
                />
              </View>
              <Text className="text-xs text-gray-500 mt-1">Minimum 6 characters</Text>
            </View>

            <View>
              <Text className="text-gray-700 text-sm font-semibold mb-2">Confirm Password *</Text>
              <View className="flex-row items-center border border-gray-200 rounded-lg px-3 bg-gray-50">
                <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                <TextInput
                  secureTextEntry
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  placeholder="Confirm your new password"
                  placeholderTextColor="#9ca3af"
                  className="flex-1 py-3 ml-2 text-gray-800"
                />
              </View>
            </View>

            {password !== confirmPassword && confirmPassword !== '' && (
              <View className="bg-red-50 border border-red-200 rounded-lg p-3 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={16} color="#ef4444" />
                <Text className="text-red-600 text-sm">Passwords do not match</Text>
              </View>
            )}

            {password.length > 0 && password.length < 6 && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex-row items-center gap-2">
                <Ionicons name="alert-circle" size={16} color="#eab308" />
                <Text className="text-yellow-600 text-sm">Password must be at least 6 characters</Text>
              </View>
            )}
          </View>
        </View>

        <View className="flex-row gap-3 mb-5">
          <TouchableOpacity
            onPress={onBack}
            className="flex-1 py-3 rounded-xl border border-gray-300 bg-white"
          >
            <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleUpdatePassword}
            disabled={isUpdatingPassword || !password || !confirmPassword || password !== confirmPassword || password.length < 6}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600"
          >
            <Text className="text-white text-center font-semibold">
              {isUpdatingPassword ? 'Updating...' : 'Update Password'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default function CustomerSettingsTab({ onLogout }: CustomerSettingsProps) {
  const [showChangePasswordPage, setShowChangePasswordPage] = useState(false);
  const { user, logout } = useAuth();

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      console.log("Logout Error.", error);
    }
  };

  // Handle open change password page
  const handleOpenChangePasswordPage = () => {
    setShowChangePasswordPage(true);
  };

  // Handle close change password page
  const handleCloseChangePasswordPage = () => {
    setShowChangePasswordPage(false);
  };

  // Main Settings Tab Content
  if (showChangePasswordPage) {
    return <ChangePasswordPage onBack={handleCloseChangePasswordPage} />;
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      <View className="px-5 pt-6">
        <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>
        
        {/* Profile Section */}
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
        
        {/* Account Settings */}
        <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
          <Text className="text-lg font-semibold text-gray-800 mb-3">Account Settings</Text>
          
          <TouchableOpacity 
            className="flex-row items-center py-3 border-b border-gray-100"
            onPress={handleOpenChangePasswordPage}
          >
            <Ionicons name="lock-closed-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
          
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
        </View>
        
        {/* Preferences */}
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
        
        {/* Support */}
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
        
        {/* Logout Button */}
        <TouchableOpacity className="bg-red-500 py-4 rounded-xl mb-6" onPress={handleLogout}>
          <Text className="text-white text-center font-semibold text-lg">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}