import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal, TextInput, ActivityIndicator, Image } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { StatusBar } from 'expo-status-bar';
import { useAuth } from "@/contexts/auth-context";
import { router } from "expo-router";
import * as DocumentPicker from 'expo-document-picker';
import api from '@/api/axios';
import StaffAppointments from "../staff/staffAppointments";
import StaffWalkIn from "../staff/staffWalkin";

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
    unit: string;
    unit_size: number;
    estimated_usages_per_unit: number;
    product_image: string | null;
    is_active: number;
    created_at: string;
    updated_at: string;
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

interface Remittance {
  id?: number;
  business_date_id: number;
  remittance_amount: number;
  created_at?: string;
  updated_at?: string;
  business_schedule?: BusinessSchedule;
}

interface EmployeeCommission {
  id?: number;
  employee_id: number;
  commission_amount: number;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: number;
    first_name: string;
    last_name: string;
  };
}

interface LossDamage {
  id?: number;
  date: string;
  incident_type: string;
  category: string;
  amount: number;
  description: string;
  staff_id: number;
  inventory_id?: number | null;
  transaction_id?: number | null;
  status: string;
  created_at?: string;
  updated_at?: string;
}

// ─────────────────────────────────────────────────────────────
// Incident Report Page
// ─────────────────────────────────────────────────────────────
const IncidentReportPage = ({ onBack, userId, onSuccess }: { onBack: () => void, userId: number, onSuccess?: () => void }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [isLoadingStaff, setIsLoadingStaff] = useState(true);
  const [isLoadingInventory, setIsLoadingInventory] = useState(true);
  const [formData, setFormData] = useState({
    date: '',
    incident_type: '',
    category: '',
    amount: '',
    description: '',
    staff_id: userId,
    inventory_id: '',
    status: 'reported'
  });

  const incidentTypes = [
    { label: 'Damage', value: 'damage' },
    { label: 'Theft', value: 'theft' },
    { label: 'Others', value: 'others' }
  ];

  const categories = [
    { label: 'Product', value: 'product' },
    { label: 'Service', value: 'service' },
    { label: 'Other', value: 'other' }
  ];

  const fetchStaffList = async () => {
    setIsLoadingStaff(true);
    try {
      const response = await api.get('/employees');
      if (Array.isArray(response.data)) setStaffList(response.data);
    } catch (error) {
      console.error('Error fetching staff list:', error);
      Alert.alert('Error', 'Failed to load staff list');
    } finally {
      setIsLoadingStaff(false);
    }
  };

  const fetchInventoryItems = async () => {
    setIsLoadingInventory(true);
    try {
      const response = await api.get('/inventory');
      if (Array.isArray(response.data)) setInventoryItems(response.data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
      Alert.alert('Error', 'Failed to load inventory items');
    } finally {
      setIsLoadingInventory(false);
    }
  };

  useEffect(() => {
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    setFormData(prev => ({ ...prev, date: dateStr, staff_id: userId }));
    fetchStaffList();
    fetchInventoryItems();
  }, [userId]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!formData.date) { Alert.alert('Validation Error', 'Please select a date'); return; }
    if (!formData.incident_type) { Alert.alert('Validation Error', 'Please select an incident type'); return; }
    if (!formData.category) { Alert.alert('Validation Error', 'Please select a category'); return; }
    if (!formData.amount || parseFloat(formData.amount) <= 0) { Alert.alert('Validation Error', 'Please enter a valid amount'); return; }
    if (!formData.staff_id) { Alert.alert('Validation Error', 'Please select a staff member'); return; }
    if (!formData.description.trim()) { Alert.alert('Validation Error', 'Please enter a description'); return; }

    setIsSubmitting(true);
    try {
      const submitData = {
        date: formData.date,
        incident_type: formData.incident_type,
        category: formData.category,
        amount: parseFloat(formData.amount),
        description: formData.description.trim(),
        staff_id: parseInt(formData.staff_id.toString()),
        inventory_id: formData.inventory_id ? parseInt(formData.inventory_id) : null,
        status: 'reported'
      };
      await api.post('/report/add', submitData);
      Alert.alert('Success', 'Report submitted successfully!');
      if (onSuccess) onSuccess();
      onBack();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const Dropdown = ({ label, options, value, onSelect, placeholder }: any) => {
    const [showDropdown, setShowDropdown] = useState(false);
    return (
      <View className="mb-4">
        <Text className="text-gray-700 font-semibold text-sm mb-2">{label} *</Text>
        <TouchableOpacity
          onPress={() => setShowDropdown(!showDropdown)}
          className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
        >
          <Text className={value ? 'text-gray-800' : 'text-gray-400'}>
            {value ? options.find((opt: any) => opt.value === value)?.label : placeholder || 'Select...'}
          </Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
        </TouchableOpacity>
        {showDropdown && (
          <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {options.map((option: any) => (
              <TouchableOpacity
                key={option.value}
                onPress={() => { onSelect(option.value); setShowDropdown(false); }}
                className={`px-4 py-3 ${value === option.value ? 'bg-pink-50' : ''} ${option !== options[options.length - 1] ? 'border-b border-gray-100' : ''}`}
              >
                <Text className={value === option.value ? 'text-pink-600 font-semibold' : 'text-gray-700'}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    );
  };

  const StaffDropdown = ({ label, value, onSelect, placeholder }: any) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const getStaffName = (staffId: number) => {
      const staff = staffList.find(s => s.id === staffId);
      if (!staff) return '';
      return `${staff.first_name} ${staff.last_name}`;
    };
    return (
      <View className="mb-4">
        <Text className="text-gray-700 font-semibold text-sm mb-2">{label} *</Text>
        <TouchableOpacity
          onPress={() => setShowDropdown(!showDropdown)}
          className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
        >
          <Text className={value ? 'text-gray-800' : 'text-gray-400'}>
            {value ? getStaffName(value) : placeholder || 'Select staff member...'}
          </Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
        </TouchableOpacity>
        {showDropdown && (
          <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
            {isLoadingStaff ? (
              <View className="px-4 py-3">
                <ActivityIndicator size="small" color="#ec4899" />
                <Text className="text-gray-500 text-xs text-center mt-1">Loading staff...</Text>
              </View>
            ) : staffList.length === 0 ? (
              <View className="px-4 py-3">
                <Text className="text-gray-500 text-xs text-center">No staff members found</Text>
              </View>
            ) : (
              staffList.map((staff) => (
                <TouchableOpacity
                  key={staff.id}
                  onPress={() => { onSelect(staff.id); setShowDropdown(false); }}
                  className={`px-4 py-3 ${value === staff.id ? 'bg-pink-50' : ''} ${staff !== staffList[staffList.length - 1] ? 'border-b border-gray-100' : ''}`}
                >
                  <Text className={value === staff.id ? 'text-pink-600 font-semibold' : 'text-gray-700'}>
                    {staff.first_name} {staff.last_name}
                  </Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}
      </View>
    );
  };

  const InventoryDropdown = ({ label, value, onSelect, placeholder }: any) => {
    const [showDropdown, setShowDropdown] = useState(false);
    const [searchText, setSearchText] = useState('');
    const getInventoryName = (inventoryId: number) => {
      const item = inventoryItems.find(i => i.id === inventoryId);
      if (!item) return '';
      return `${item.products?.product_name || 'Unknown'} (Qty: ${item.product_quantity})`;
    };
    const filteredItems = searchText
      ? inventoryItems.filter(item =>
          item.products?.product_name?.toLowerCase().includes(searchText.toLowerCase()) ||
          item.id.toString().includes(searchText))
      : inventoryItems;
    return (
      <View className="mb-4">
        <Text className="text-gray-700 font-semibold text-sm mb-2">{label} (Optional)</Text>
        <TouchableOpacity
          onPress={() => setShowDropdown(!showDropdown)}
          className="flex-row items-center justify-between bg-gray-50 rounded-xl px-4 py-3 border border-gray-200"
        >
          <Text className={value ? 'text-gray-800' : 'text-gray-400'}>
            {value ? getInventoryName(value) : placeholder || 'Select inventory item...'}
          </Text>
          <Ionicons name={showDropdown ? "chevron-up" : "chevron-down"} size={20} color="#9ca3af" />
        </TouchableOpacity>
        {showDropdown && (
          <View className="mt-2 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden max-h-64">
            <View className="px-4 py-2 border-b border-gray-100">
              <View className="flex-row items-center bg-gray-50 rounded-lg px-3 py-2">
                <Ionicons name="search" size={18} color="#9ca3af" />
                <TextInput
                  value={searchText}
                  onChangeText={setSearchText}
                  placeholder="Search inventory..."
                  className="flex-1 ml-2 text-gray-700 text-sm"
                />
                {searchText ? (
                  <TouchableOpacity onPress={() => setSearchText('')}>
                    <Ionicons name="close-circle" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
            {isLoadingInventory ? (
              <View className="px-4 py-4">
                <ActivityIndicator size="small" color="#ec4899" />
                <Text className="text-gray-500 text-xs text-center mt-1">Loading inventory...</Text>
              </View>
            ) : filteredItems.length === 0 ? (
              <View className="px-4 py-4">
                <Text className="text-gray-500 text-xs text-center">No inventory items found</Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} className="max-h-48">
                {filteredItems.map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => { onSelect(item.id.toString()); setShowDropdown(false); setSearchText(''); }}
                    className={`px-4 py-3 ${value === item.id.toString() ? 'bg-pink-50' : ''} ${item !== filteredItems[filteredItems.length - 1] ? 'border-b border-gray-100' : ''}`}
                  >
                    <View>
                      <Text className={value === item.id.toString() ? 'text-pink-600 font-semibold' : 'text-gray-700'}>
                        {item.products?.product_name || 'Unknown Product'}
                      </Text>
                      <View className="flex-row items-center mt-1">
                        <Text className="text-xs text-gray-500">
                          #{item.id} • Qty: {item.product_quantity} • Unit: {item.products?.unit || 'N/A'}
                        </Text>
                      </View>
                      <View className="flex-row items-center mt-0.5">
                        <Text className="text-xs text-gray-400">
                          Uses: {item.current_usages} / {item.products?.estimated_usages_per_unit || 0}
                        </Text>
                        <Text className="text-xs text-gray-400 ml-2">
                          Exp: {item.expiration_date}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-5 pt-12 pb-4" style={{ backgroundColor: '#dc2626' }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="p-1">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Report Incident</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="bg-white rounded-2xl p-5 shadow-sm mb-5">
          <View className="items-center mb-5">
            <View className="w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="alert-circle" size={32} color="#ef4444" />
            </View>
            <Text className="text-gray-800 text-lg font-semibold text-center">Report an Incident</Text>
            <Text className="text-gray-500 text-sm text-center mt-1">Report damage, theft, or other incidents</Text>
          </View>

          <View className="mb-4">
            <Text className="text-gray-700 font-semibold text-sm mb-2">Date *</Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <Ionicons name="calendar-outline" size={20} color="#9ca3af" />
              <TextInput
                value={formData.date}
                onChangeText={(text) => handleInputChange('date', text)}
                placeholder="YYYY-MM-DD"
                className="flex-1 ml-2 text-gray-800"
              />
            </View>
          </View>

          <Dropdown label="Incident Type" options={incidentTypes} value={formData.incident_type} onSelect={(value: string) => handleInputChange('incident_type', value)} placeholder="Select incident type..." />
          <Dropdown label="Category" options={categories} value={formData.category} onSelect={(value: string) => handleInputChange('category', value)} placeholder="Select category..." />

          <View className="mb-4">
            <Text className="text-gray-700 font-semibold text-sm mb-2">Amount (₱) *</Text>
            <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
              <Text className="text-gray-800 font-bold text-lg mr-2">₱</Text>
              <TextInput
                value={formData.amount}
                onChangeText={(text) => handleInputChange('amount', text)}
                placeholder="0.00"
                keyboardType="numeric"
                className="flex-1 text-lg text-gray-800"
              />
            </View>
            <Text className="text-gray-400 text-xs mt-1">Enter the estimated amount of loss or damage</Text>
          </View>

          <InventoryDropdown label="Inventory Item" value={formData.inventory_id} onSelect={(value: string) => handleInputChange('inventory_id', value)} placeholder="Select inventory item (optional)..." />
          <StaffDropdown label="Staff Member" value={formData.staff_id} onSelect={(value: number) => handleInputChange('staff_id', value.toString())} placeholder="Select staff member..." />

          <View className="mb-4">
            <Text className="text-gray-700 font-semibold text-sm mb-2">Description *</Text>
            <TextInput
              value={formData.description}
              onChangeText={(text) => handleInputChange('description', text)}
              placeholder="Describe the incident in detail..."
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              className="border border-gray-200 rounded-xl p-3 text-gray-700 min-h-[120px]"
            />
          </View>

          <View className="bg-gray-50 rounded-xl p-3 mb-4 border border-gray-200">
            <View className="flex-row items-center gap-2">
              <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
              <Text className="text-gray-600 text-sm">Status: <Text className="font-semibold">Reported</Text> (default)</Text>
            </View>
          </View>

          <View className="bg-yellow-50 rounded-xl p-3 mb-4 border border-yellow-200">
            <View className="flex-row items-start gap-2">
              <Ionicons name="information-circle-outline" size={18} color="#eab308" />
              <Text className="text-yellow-700 text-xs flex-1">
                Please provide accurate information about the incident. This report will be reviewed by the management.
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <TouchableOpacity onPress={onBack} className="flex-1 py-3 rounded-xl border border-gray-300 bg-white">
              <Text className="text-gray-700 text-center font-semibold">Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 py-3 rounded-xl"
              style={{ backgroundColor: isSubmitting ? '#f87171' : '#dc2626' }}
            >
              <Text className="text-white text-center font-semibold">
                {isSubmitting ? 'Submitting...' : 'Submit Report'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Profile Page
// ─────────────────────────────────────────────────────────────
const ProfilePage = ({ onBack, userId, userData, onUpdate }: { onBack: () => void, userId: number, userData: any, onUpdate?: () => void }) => {
  const [profileImage, setProfileImage] = useState<string | null>(userData?.profile_image || null);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState(userData?.phone_number || '');
  const [passwordForm, setPasswordForm] = useState({ password: '', password_confirmation: '' });
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(userId || userData?.id || null);

  useEffect(() => {
    if (userId) setResolvedUserId(userId);
    else if (userData?.id) setResolvedUserId(userData.id);
  }, [userId, userData?.id]);

  const getImageUrl = (imagePath: string | null) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage/')) return `http://192.168.100.73:8000${imagePath}`;
    return `http://192.168.100.73:8000/storage/${imagePath}`;
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
        copyToCacheDirectory: true,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (asset) uploadProfileImage(asset.uri, asset.name || 'profile.jpg', asset.mimeType || 'image/jpeg');
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfileImage = async (uri: string, fileName: string, mimeType: string) => {
    const targetUserId = resolvedUserId || userId || userData?.id;
    if (!targetUserId) {
      Alert.alert('Error', 'Unable to determine your account. Please log out and log in again.');
      return;
    }
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profile_image', { uri, name: fileName, type: mimeType } as any);
      const response = await api.post(`/profile/add/${targetUserId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      let newPath: string | null = response.data?.profile_image ?? null;
      try {
        const userResponse = await api.get('/user');
        if (userResponse.data?.profile_image) newPath = userResponse.data.profile_image;
      } catch (e) {
        console.log('Failed to re-fetch user after upload:', e);
      }
      if (newPath) setProfileImage(newPath);
      if (onUpdate) onUpdate();
      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      console.error('Error uploading profile image:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleChangePassword = async () => {
    if (!passwordForm.password || passwordForm.password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (passwordForm.password !== passwordForm.password_confirmation) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.post(`/user/${userId}/password`, {
        password: passwordForm.password,
        password_confirmation: passwordForm.password_confirmation
      });
      Alert.alert('Success', 'Password updated successfully!');
      setShowPasswordModal(false);
      setPasswordForm({ password: '', password_confirmation: '' });
    } catch (error: any) {
      console.error('Error updating password:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update password.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpdatePhoneNumber = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert('Validation Error', 'Please enter a phone number.');
      return;
    }
    if (!/^[0-9]{10,11}$/.test(phoneNumber.trim())) {
      Alert.alert('Validation Error', 'Please enter a valid phone number (10-11 digits).');
      return;
    }
    setIsUpdatingPhone(true);
    try {
      await api.post(`/user/${userId}/phone`, { phone_number: phoneNumber.trim() });
      Alert.alert('Success', 'Phone number updated successfully!');
      setShowPhoneModal(false);
      if (onUpdate) onUpdate();
    } catch (error: any) {
      console.error('Error updating phone number:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to update phone number.');
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  const displayImage = getImageUrl(profileImage);

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-pink-500 px-5 pt-12 pb-4" style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onBack} className="p-1 mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-xl font-semibold">Profile</Text>
        </View>
      </View>

      <View className="px-5 pt-6">
        <View className="bg-white rounded-2xl p-6 items-center shadow-sm mb-6">
          <TouchableOpacity onPress={pickDocument} className="mb-4">
            {displayImage ? (
              <Image source={{ uri: displayImage }} className="w-24 h-24 rounded-full border-4 border-pink-200" resizeMode="cover" />
            ) : (
              <View className="w-24 h-24 bg-pink-100 rounded-full items-center justify-center border-4 border-pink-200">
                <Ionicons name="person" size={50} color="#ec4899" />
              </View>
            )}
            {isUploadingImage && (
              <View className="absolute inset-0 bg-black/50 rounded-full items-center justify-center">
                <ActivityIndicator size="large" color="white" />
              </View>
            )}
            <View className="absolute bottom-0 right-0 bg-pink-500 rounded-full p-2 border-2 border-white">
              <Ionicons name="camera" size={16} color="white" />
            </View>
          </TouchableOpacity>

          <Text className="text-xl font-bold text-gray-800">
            {userData?.first_name} {userData?.last_name}
          </Text>
          <Text className="text-gray-500 text-sm">Salon Staff</Text>
          <Text className="text-gray-400 text-sm mt-2">{userData?.email}</Text>
          <Text className="text-gray-400 text-sm">{userData?.phone_number}</Text>
        </View>

        <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
          <TouchableOpacity className="flex-row items-center px-5 py-4 border-b border-gray-100" onPress={pickDocument}>
            <Ionicons name="image-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Change Profile Picture</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
            onPress={() => { setPhoneNumber(userData?.phone_number || ''); setShowPhoneModal(true); }}
          >
            <Ionicons name="call-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Update Phone Number</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center px-5 py-4" onPress={() => setShowPasswordModal(true)}>
            <Ionicons name="lock-closed-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        <Modal animationType="slide" transparent={true} visible={showPhoneModal}
          onRequestClose={() => { setShowPhoneModal(false); setPhoneNumber(userData?.phone_number || ''); }}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
              <View className="bg-pink-500 px-6 py-4 flex-row justify-between items-center">
                <Text className="text-xl font-bold text-white">Update Phone Number</Text>
                <TouchableOpacity onPress={() => { setShowPhoneModal(false); setPhoneNumber(userData?.phone_number || ''); }}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View className="p-6">
                <Text className="text-gray-500 text-sm mb-4">Enter your new phone number below.</Text>
                <View className="mb-6">
                  <Text className="text-gray-700 font-semibold text-sm mb-2">Phone Number *</Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <Ionicons name="call-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={phoneNumber}
                      onChangeText={setPhoneNumber}
                      placeholder="Enter phone number"
                      keyboardType="phone-pad"
                      className="flex-1 ml-2 text-gray-800"
                    />
                  </View>
                  <Text className="text-gray-400 text-xs mt-1">Enter 10-11 digit phone number</Text>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => { setShowPhoneModal(false); setPhoneNumber(userData?.phone_number || ''); }}
                    className="flex-1 py-3 rounded-xl border border-gray-300">
                    <Text className="text-gray-600 text-center font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleUpdatePhoneNumber} disabled={isUpdatingPhone} className="flex-1 py-3 rounded-xl bg-pink-500">
                    <Text className="text-white text-center font-semibold">
                      {isUpdatingPhone ? 'Updating...' : 'Update Phone Number'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        <Modal animationType="slide" transparent={true} visible={showPasswordModal}
          onRequestClose={() => { setShowPasswordModal(false); setPasswordForm({ password: '', password_confirmation: '' }); }}>
          <View className="flex-1 justify-center items-center bg-black/50">
            <View className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
              <View className="bg-pink-500 px-6 py-4 flex-row justify-between items-center">
                <Text className="text-xl font-bold text-white">Change Password</Text>
                <TouchableOpacity onPress={() => { setShowPasswordModal(false); setPasswordForm({ password: '', password_confirmation: '' }); }}>
                  <Ionicons name="close" size={24} color="white" />
                </TouchableOpacity>
              </View>
              <View className="p-6">
                <Text className="text-gray-500 text-sm mb-4">Enter your new password below.</Text>
                <View className="mb-4">
                  <Text className="text-gray-700 font-semibold text-sm mb-2">New Password *</Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={passwordForm.password}
                      onChangeText={(text) => setPasswordForm(prev => ({ ...prev, password: text }))}
                      placeholder="Enter new password"
                      secureTextEntry
                      className="flex-1 ml-2 text-gray-800"
                    />
                  </View>
                </View>
                <View className="mb-6">
                  <Text className="text-gray-700 font-semibold text-sm mb-2">Confirm Password *</Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3 border border-gray-200">
                    <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                    <TextInput
                      value={passwordForm.password_confirmation}
                      onChangeText={(text) => setPasswordForm(prev => ({ ...prev, password_confirmation: text }))}
                      placeholder="Confirm new password"
                      secureTextEntry
                      className="flex-1 ml-2 text-gray-800"
                    />
                  </View>
                </View>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => { setShowPasswordModal(false); setPasswordForm({ password: '', password_confirmation: '' }); }}
                    className="flex-1 py-3 rounded-xl border border-gray-300">
                    <Text className="text-gray-600 text-center font-semibold">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={handleChangePassword} disabled={isChangingPassword} className="flex-1 py-3 rounded-xl bg-pink-500">
                    <Text className="text-white text-center font-semibold">
                      {isChangingPassword ? 'Updating...' : 'Update Password'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </ScrollView>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Dashboard
// ─────────────────────────────────────────────────────────────
export default function StaffDashboard() {
  // ✅ 'schedule' removed — its content is now embedded on Home
  const [activeTab, setActiveTab] = useState<'home' | 'appointments' | 'walkin' | 'settings' | 'profile'>('home');
  const [refreshing, setRefreshing] = useState(false);

  const insets = useSafeAreaInsets();

  // Remittance states
  const [showRemitModal, setShowRemitModal] = useState(false);
  const [isSubmittingRemit, setIsSubmittingRemit] = useState(false);
  const [totalProfit, setTotalProfit] = useState(0);
  const [remitAmount, setRemitAmount] = useState(0);
  const [isLoadingRemit, setIsLoadingRemit] = useState(false);

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

  const [showReportPage, setShowReportPage] = useState(false);

  const [staffAppointments, setStaffAppointments] = useState<Appointment[]>([]);
  const [employeeCommissions, setEmployeeCommissions] = useState<EmployeeCommission[]>([]);
  const [remittances, setRemittances] = useState<Remittance[]>([]);
  const [walkIns, setWalkIns] = useState<WalkIn[]>([]);
  const [lossDamages, setLossDamages] = useState<LossDamage[]>([]);
  const [userData, setUserData] = useState<any>(null);

  // Schedule state (merged from StaffSchedule) — rendered on Home
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [showScheduleOptionsModal, setShowScheduleOptionsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<BusinessSchedule | null>(null);

  const { user, logout } = useAuth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const getImageUrl = (imagePath: string | null | undefined) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;
    if (imagePath.startsWith('/storage/')) return `http://192.168.100.73:8000${imagePath}`;
    return `http://192.168.100.73:8000/storage/${imagePath}`;
  };

  const fetchUserData = async () => {
    try {
      const response = await api.get('/user');
      setUserData(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  const fetchStaffAppointments = async () => {
    try {
      const userData = user;
      if (!userData?.id) return [];
      const response = await api.get(`/staff/${userData.id}/appointments`);
      let appointmentsData: Appointment[] = [];
      if (Array.isArray(response.data)) {
        appointmentsData = response.data.map((item: any) => ({
          id: item.id,
          service_id: item.service_id,
          customer_name: item.customer_name || 'Walk-in Customer',
          customer_phone: item.customer_phone || 'N/A',
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time || '--:--',
          status: item.status,
          service_status: item.service_status,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price,
          notes: item.notes,
          transaction_id: item.transaction_id
        }));
      }
      setStaffAppointments(appointmentsData);
      return appointmentsData;
    } catch (error) {
      console.log("Error fetching staff appointments:", error);
      return [];
    }
  };

  const fetchEmployeeCommissions = async () => {
    try {
      const response = await api.get('/employee/commission');
      let commissionsData: EmployeeCommission[] = [];
      if (Array.isArray(response.data)) {
        commissionsData = response.data.map((item: any) => ({
          id: item.id,
          employee_id: item.employee_id,
          commission_amount: parseFloat(item.commission_amount) || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          employee: item.employee
        }));
      }
      setEmployeeCommissions(commissionsData);
      return commissionsData;
    } catch (error) {
      console.error('Error fetching employee commissions:', error);
      return [];
    }
  };

  const fetchRemittances = async () => {
    try {
      const response = await api.get('/remittance');
      let remittancesData: Remittance[] = [];
      if (Array.isArray(response.data)) {
        remittancesData = response.data.map((item: any) => ({
          id: item.id,
          business_date_id: item.business_date_id,
          remittance_amount: parseFloat(item.remittance_amount) || 0,
          created_at: item.created_at,
          updated_at: item.updated_at,
          business_schedule: item.business_schedule
        }));
      }
      setRemittances(remittancesData);
      return remittancesData;
    } catch (error) {
      console.error('Error fetching remittances:', error);
      return [];
    }
  };

  const fetchWalkIns = async () => {
    try {
      const response = await api.get('/walk-in');
      let walkInsData: WalkIn[] = [];
      if (Array.isArray(response.data)) {
        walkInsData = response.data.map((item: any) => ({
          id: item.id,
          customer_name: item.customer_name,
          service_id: item.service_id,
          stylist_id: item.stylist_id,
          is_finished: item.is_finished,
          created_at: item.created_at,
          updated_at: item.updated_at,
          services: item.services,
          user: item.user
        }));
      }
      setWalkIns(walkInsData);
      return walkInsData;
    } catch (error) {
      console.error('Error fetching walk-ins:', error);
      return [];
    }
  };

  const fetchLossDamages = async () => {
    try {
      const response = await api.get('/report');
      let lossDamagesData: LossDamage[] = [];
      if (Array.isArray(response.data)) {
        lossDamagesData = response.data.map((item: any) => ({
          id: item.id,
          date: item.date,
          incident_type: item.incident_type,
          category: item.category,
          amount: parseFloat(item.amount) || 0,
          description: item.description,
          staff_id: item.staff_id,
          inventory_id: item.inventory_id,
          transaction_id: item.transaction_id,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
        }));
      }
      setLossDamages(lossDamagesData);
      return lossDamagesData;
    } catch (error) {
      console.error('Error fetching loss and damage reports:', error);
      return [];
    }
  };

  const submitRemittance = async (data: { business_date_id: number; remittance_amount: number }) => {
    try {
      const response = await api.post('/remittance/submit', {
        business_date_id: data.business_date_id,
        remittance_amount: data.remittance_amount
      });
      return response.data;
    } catch (error) {
      console.error('Error submitting remittance:', error);
      throw error;
    }
  };

  const submitLossDamage = async (data: any) => {
    try {
      const response = await api.post('/report/submit', data);
      return response.data;
    } catch (error) {
      console.error('Error submitting loss and damage report:', error);
      throw error;
    }
  };

  const fetchInventoryItems = async () => {
    try {
      const response = await api.get('/inventory');
      if (Array.isArray(response.data)) setInventoryItems(response.data);
    } catch (error) {
      console.error('Error fetching inventory items:', error);
    }
  };

  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  const getTodayDateStr = () => getUTCDateString(new Date());

  const getTodayEarnings = () => {
    const todayStr = getTodayDateStr();
    const currentStaffId = user?.id;

    const todayCompletedAppointments = staffAppointments.filter(app => {
      const appointmentDate = app.appointment_date;
      const isCompleted = app.service_status === 'completed' || app.status === 'completed';
      return appointmentDate === todayStr && isCompleted;
    });

    const todayCompletedWalkIns = walkIns.filter((walkIn: WalkIn) => {
      const walkInDate = walkIn.created_at ? walkIn.created_at.split('T')[0] : '';
      const isFinished = walkIn.is_finished === 1;
      return walkInDate === todayStr && walkIn.stylist_id === currentStaffId && isFinished;
    });

    const appointmentEarnings = todayCompletedAppointments.reduce((sum, app) => sum + (parseFloat(app.price) || 0), 0);
    const walkInEarnings = todayCompletedWalkIns.reduce((sum, walkIn) => sum + (parseFloat(walkIn.services?.price || '0')), 0);
    const totalEarnings = appointmentEarnings + walkInEarnings;

    const staffCommission = employeeCommissions.find(c => c.employee_id === user?.id);
    const commissionRate = staffCommission ? staffCommission.commission_amount : 0;

    const commissionEarnings = totalEarnings * commissionRate;
    const profit = totalEarnings - commissionEarnings;

    return {
      totalEarnings, commissionRate, commissionEarnings, profit,
      appointmentEarnings, walkInEarnings,
      appointmentCount: todayCompletedAppointments.length,
      walkInCount: todayCompletedWalkIns.length,
      totalCount: todayCompletedAppointments.length + todayCompletedWalkIns.length
    };
  };

  const loadRemittanceData = async () => {
    setIsLoadingRemit(true);
    try {
      await Promise.all([fetchStaffAppointments(), fetchWalkIns(), fetchEmployeeCommissions()]);
      const earnings = getTodayEarnings();
      setTotalProfit(earnings.profit);
      setRemitAmount(earnings.profit);
      return earnings;
    } catch (error) {
      console.error("Error loading remittance data:", error);
      throw error;
    } finally {
      setIsLoadingRemit(false);
    }
  };

  const handleOpenRemitModal = async () => {
    try {
      await loadRemittanceData();
      setShowRemitModal(true);
    } catch (error) {
      console.error("Error loading remittance data:", error);
      Alert.alert("Error", "Failed to load remittance data. Please try again.");
    }
  };

  const handleSubmitRemittance = async () => {
    if (remitAmount <= 0) {
      Alert.alert('Invalid Amount', 'Remittance amount must be greater than 0');
      return;
    }
    const todayStr = getTodayDateStr();
    const schedule = businessSchedules.find(s => s.business_date === todayStr);
    if (!schedule) {
      Alert.alert('No Schedule', 'No business schedule found for today');
      return;
    }
    setIsSubmittingRemit(true);
    try {
      await submitRemittance({ business_date_id: schedule.id, remittance_amount: remitAmount });
      Alert.alert('Success', 'Remittance submitted successfully!');
      setShowRemitModal(false);
      await Promise.all([fetchStaffAppointments(), fetchEmployeeCommissions(), fetchRemittances(), fetchWalkIns()]);
    } catch (error: any) {
      console.error('Error submitting remittance:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit remittance');
    } finally {
      setIsSubmittingRemit(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportFormData.incident_type) { Alert.alert('Validation Error', 'Please select an incident type'); return; }
    if (!reportFormData.category) { Alert.alert('Validation Error', 'Please select a category'); return; }
    if (!reportFormData.amount || parseFloat(reportFormData.amount) <= 0) { Alert.alert('Validation Error', 'Please enter a valid amount'); return; }
    if (!reportFormData.description) { Alert.alert('Validation Error', 'Please enter a description'); return; }

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
      setReportFormData({ incident_type: '', category: '', amount: '', description: '', inventory_id: '', transaction_id: '' });
      await fetchLossDamages();
    } catch (error: any) {
      console.error('Error submitting report:', error);
      Alert.alert('Error', error.response?.data?.message || 'Failed to submit report');
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const todayAppointments = staffAppointments.filter(app => {
    const today = getUTCDateString(new Date());
    return app.appointment_date === today;
  });

  const staffCommissionRecord = employeeCommissions.find(c => c.employee_id === user?.id);
  const staffCommissionRate = staffCommissionRecord ? parseFloat(String(staffCommissionRecord.commission_amount)) || 0 : 0;

  const completedRevenue = staffAppointments
    .filter(app => app.service_status === 'completed' || app.status === 'completed')
    .reduce((sum, app) => sum + parseFloat(app.price || '0'), 0);

  const completedEarnings = completedRevenue * staffCommissionRate;

  const staffName = user ? `${user.first_name} ${user.last_name}` : 'Staff';

  const formatTime = (time: string) => {
    if (!time) return '--:--';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      if (Array.isArray(response.data)) setBusinessSchedules(response.data);
    } catch (error) {
      console.error('Error fetching business schedules:', error);
    }
  };

  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      if (Array.isArray(response.data)) setStaffAssignments(response.data);
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    }
  };

  // ═════════════════════════════════════════════════════════════
  // Schedule helpers (merged from StaffSchedule)
  // ═════════════════════════════════════════════════════════════
  const getScheduleForDate = (dateStr: string): BusinessSchedule | null =>
    businessSchedules.find(schedule => schedule.business_date === dateStr) || null;

  const isStaffAssignedToSchedule = (businessDateId: number): boolean =>
    staffAssignments.some(a => a.business_date_id === businessDateId && a.staff_id === user?.id);

  const getAssignmentForSchedule = (businessDateId: number): StaffAssignment | null =>
    staffAssignments.find(a => a.business_date_id === businessDateId && a.staff_id === user?.id) || null;

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startingDayOfWeek = firstDay.getUTCDay();
    const days: (Date | null)[] = [];
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null);
    for (let i = 1; i <= daysInMonth; i++) days.push(new Date(Date.UTC(year, month, i)));
    return days;
  };

  const changeMonth = (increment: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1));
  };

  const formatFullDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))).toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  };

  const getScheduleStatus = (date: Date): { status: 'open' | 'closed' | 'no_schedule'; schedule: BusinessSchedule | null; isAssigned: boolean } => {
    const dateStr = getUTCDateString(date);
    const schedule = getScheduleForDate(dateStr);
    if (!schedule) return { status: 'no_schedule', schedule: null, isAssigned: false };
    if (schedule.is_open !== 1) return { status: 'closed', schedule, isAssigned: false };
    const isAssigned = isStaffAssignedToSchedule(schedule.id);
    return { status: 'open', schedule, isAssigned };
  };

  const handleScheduleClick = (date: Date) => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    if (dateUTC < todayUTC) {
      Alert.alert("Past Date", "Cannot interact with past dates.");
      return;
    }
    const scheduleStatus = getScheduleStatus(date);
    if (scheduleStatus.status === 'no_schedule') {
      Alert.alert("No Schedule", "No business schedule set for this date.");
      return;
    }
    if (scheduleStatus.status === 'closed') {
      Alert.alert("Salon Closed", "The salon is closed on this date.");
      return;
    }
    if (scheduleStatus.status === 'open' && scheduleStatus.schedule) {
      setSelectedSchedule(scheduleStatus.schedule);
      setShowScheduleOptionsModal(true);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchUserData();
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
      fetchUserData(),
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
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      router.replace("/");
    } catch (error) {
      console.log("Logout Error.", error);
      router.replace("/");
    }
  };

  const RemittanceModal = React.memo(() => {
    const [localRemitAmount, setLocalRemitAmount] = useState(remitAmount);
    const [localIsSubmitting, setLocalIsSubmitting] = useState(isSubmittingRemit);
    const [localEarnings, setLocalEarnings] = useState(getTodayEarnings());

    useEffect(() => { setLocalRemitAmount(remitAmount); }, [remitAmount]);
    useEffect(() => { setLocalIsSubmitting(isSubmittingRemit); }, [isSubmittingRemit]);

    useEffect(() => {
      if (showRemitModal) {
        const earnings = getTodayEarnings();
        setLocalEarnings(earnings);
        setTotalProfit(earnings.profit);
        setRemitAmount(earnings.profit);
        setLocalRemitAmount(earnings.profit);
      }
    }, [showRemitModal]);

    const handleAmountChange = (text: string) => {
      const num = parseFloat(text) || 0;
      setLocalRemitAmount(num);
      setRemitAmount(num);
    };

    const handleSubmit = async () => {
      if (localRemitAmount <= 0) {
        Alert.alert('Invalid Amount', 'Remittance amount must be greater than 0');
        return;
      }
      await handleSubmitRemittance();
    };

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showRemitModal}
        onRequestClose={() => setShowRemitModal(false)}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 max-h-[90%] overflow-hidden">
            <View className="bg-pink-500 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Remit Profit</Text>
              <TouchableOpacity onPress={() => setShowRemitModal(false)}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-6" showsVerticalScrollIndicator={true} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text className="text-gray-500 text-sm mb-4">Today's Remittance Summary</Text>

              <View className="bg-gray-50 rounded-xl p-4 mb-4">
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Appointments Completed</Text>
                  <Text className="text-blue-600 font-bold">{localEarnings.appointmentCount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Walk-ins Completed</Text>
                  <Text className="text-green-600 font-bold">{localEarnings.walkInCount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2 border-t border-gray-200 pt-2">
                  <Text className="text-gray-600">Total Services Completed</Text>
                  <Text className="text-pink-600 font-bold">{localEarnings.totalCount}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Appointment Earnings</Text>
                  <Text className="text-blue-600 font-bold text-lg">₱{localEarnings.appointmentEarnings.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2">
                  <Text className="text-gray-600">Walk-in Earnings</Text>
                  <Text className="text-green-600 font-bold text-lg">₱{localEarnings.walkInEarnings.toLocaleString()}</Text>
                </View>
                <View className="flex-row justify-between items-center mb-2 border-t border-gray-200 pt-2">
                  <Text className="text-gray-600 font-bold">Total Earnings</Text>
                  <Text className="text-pink-600 font-bold text-lg">₱{localEarnings.totalEarnings.toLocaleString()}</Text>
                </View>

                <View className="mt-2 bg-pink-50 rounded-xl p-3">
                  <Text className="text-gray-700 font-semibold text-sm mb-2">Commission Calculation</Text>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-600 text-xs">Commission Rate</Text>
                    <Text className="text-pink-600 font-bold">{localEarnings.commissionRate * 100}%</Text>
                  </View>
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-gray-600 text-xs">Applied to Total Earnings</Text>
                    <Text className="text-pink-600 font-bold">✓</Text>
                  </View>
                  <View className="flex-row justify-between items-center pt-1 border-t border-pink-200">
                    <Text className="text-gray-700 font-semibold">Commission Amount</Text>
                    <Text className="text-orange-600 font-bold text-lg">₱{localEarnings.commissionEarnings.toLocaleString()}</Text>
                  </View>
                </View>

                <View className="border-t border-gray-200 pt-2 mt-2">
                  <View className="flex-row justify-between items-center">
                    <Text className="text-gray-800 font-bold">Total Profit to Remit</Text>
                    <Text className="text-pink-600 font-bold text-xl">₱{totalProfit.toLocaleString()}</Text>
                  </View>
                  <Text className="text-gray-400 text-xs mt-1">
                    Total Earnings - Commission ({localEarnings.commissionRate * 100}%)
                  </Text>
                </View>
              </View>

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
                              <Text className="text-gray-500 text-xs">{walkIn.customer_name} • Walk-in</Text>
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

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={localIsSubmitting || localEarnings.totalCount === 0}
                className="py-3 rounded-xl mt-2"
                style={{ backgroundColor: localEarnings.totalCount === 0 ? '#9ca3af' : '#ec4899' }}
              >
                <Text className="text-white text-center font-semibold">
                  {localIsSubmitting ? 'Submitting...' : 'Submit Remittance'}
                </Text>
              </TouchableOpacity>

              {localEarnings.totalCount === 0 && (
                <Text className="text-gray-400 text-xs text-center mt-2">No completed services to remit</Text>
              )}

              <View className="h-4" />
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  });

  const ReportModal = React.memo(() => {
    const [localReportFormData, setLocalReportFormData] = useState(reportFormData);
    const [localIsSubmitting, setLocalIsSubmitting] = useState(isSubmittingReport);

    useEffect(() => { setLocalReportFormData(reportFormData); }, [reportFormData]);
    useEffect(() => { setLocalIsSubmitting(isSubmittingReport); }, [isSubmittingReport]);

    const handleInputChange = (field: string, value: string) => {
      setLocalReportFormData(prev => ({ ...prev, [field]: value }));
      setReportFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async () => {
      if (!localReportFormData.incident_type) { Alert.alert('Validation Error', 'Please select an incident type'); return; }
      if (!localReportFormData.category) { Alert.alert('Validation Error', 'Please select a category'); return; }
      if (!localReportFormData.amount || parseFloat(localReportFormData.amount) <= 0) { Alert.alert('Validation Error', 'Please enter a valid amount'); return; }
      if (!localReportFormData.description) { Alert.alert('Validation Error', 'Please enter a description'); return; }
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
          setReportFormData({ incident_type: '', category: '', amount: '', description: '', inventory_id: '', transaction_id: '' });
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
            <View className="bg-red-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Report Incident</Text>
              <TouchableOpacity onPress={() => {
                setShowReportModal(false);
                setReportAppointment(null);
                setReportFormData({ incident_type: '', category: '', amount: '', description: '', inventory_id: '', transaction_id: '' });
              }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <ScrollView className="p-6">
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

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Incident Type *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['damage', 'inventory_loss', 'theft'].map((type) => (
                    <TouchableOpacity
                      key={type}
                      onPress={() => handleInputChange('incident_type', type)}
                      className={`px-4 py-2 rounded-full ${localReportFormData.incident_type === type ? 'bg-red-600' : 'bg-gray-200'}`}
                    >
                      <Text className={`capitalize ${localReportFormData.incident_type === type ? 'text-white' : 'text-gray-700'}`}>
                        {type === 'inventory_loss' ? 'Inventory Loss' : type}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View className="mb-4">
                <Text className="text-gray-700 font-semibold mb-2">Category *</Text>
                <View className="flex-row flex-wrap gap-2">
                  {['product', 'service', 'other'].map((cat) => (
                    <TouchableOpacity
                      key={cat}
                      onPress={() => handleInputChange('category', cat)}
                      className={`px-4 py-2 rounded-full ${localReportFormData.category === cat ? 'bg-red-600' : 'bg-gray-200'}`}
                    >
                      <Text className={`capitalize ${localReportFormData.category === cat ? 'text-white' : 'text-gray-700'}`}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

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

              <TouchableOpacity
                onPress={handleSubmit}
                disabled={localIsSubmitting}
                className="py-3 rounded-xl mt-2"
                style={{ backgroundColor: localIsSubmitting ? '#f87171' : '#dc2626' }}
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

  // Schedule options modal
  const ScheduleOptionsModal = () => {
    if (!selectedSchedule) return null;
    const isAssigned = isStaffAssignedToSchedule(selectedSchedule.id);
    const assignment = getAssignmentForSchedule(selectedSchedule.id);

    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showScheduleOptionsModal}
        onRequestClose={() => { setShowScheduleOptionsModal(false); setSelectedSchedule(null); }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
            <View className="bg-pink-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Schedule Details</Text>
              <TouchableOpacity onPress={() => { setShowScheduleOptionsModal(false); setSelectedSchedule(null); }}>
                <Ionicons name="close" size={24} color="white" />
              </TouchableOpacity>
            </View>

            <View className="p-6">
              <View className="mb-4">
                <Text className="text-gray-500 text-sm">Date</Text>
                <Text className="text-gray-800 font-semibold text-lg">
                  {formatFullDate(selectedSchedule.business_date)}
                </Text>
              </View>

              <View className="mb-4">
                <Text className="text-gray-500 text-sm">Business Hours</Text>
                <Text className="text-gray-800 font-semibold">
                  {selectedSchedule.open_time.substring(0, 5)} - {selectedSchedule.close_time.substring(0, 5)}
                </Text>
              </View>

              {isAssigned && assignment && (
                <View className="mb-4 p-3 bg-green-50 rounded-xl">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                    <Text className="text-green-700 font-semibold">You are assigned to this schedule</Text>
                  </View>
                </View>
              )}

              {!isAssigned && (
                <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <View className="flex-row items-center gap-2">
                    <Ionicons name="information-circle" size={20} color="#6b7280" />
                    <Text className="text-gray-600 text-sm">You are not assigned to this schedule</Text>
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={() => { setShowScheduleOptionsModal(false); setSelectedSchedule(null); }}
                className="bg-pink-600 py-3 rounded-xl mt-2"
              >
                <Text className="text-white text-center font-semibold">Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    );
  };

  const renderContent = () => {
    if (showReportPage) {
      return (
        <IncidentReportPage
          onBack={() => setShowReportPage(false)}
          userId={user?.id || 0}
          onSuccess={() => { fetchLossDamages(); }}
        />
      );
    }

    if (activeTab === 'profile') {
      return (
        <ProfilePage
          onBack={() => setActiveTab('settings')}
          userId={user?.id || 0}
          userData={userData || user}
          onUpdate={() => { fetchUserData(); onRefresh(); }}
        />
      );
    }

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
            <View
              className="bg-pink-500 px-5 pb-8"
              style={{ paddingTop: insets.top + 12, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}
            >
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-white text-2xl font-semibold">
                    Hello, {staffName.split(' ')[0]}! 👋
                  </Text>
                  <Text className="text-white opacity-90 mt-1">
                    You have {todayAppointments.length} appointment(s) today
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setActiveTab('settings')}
                  style={{ backgroundColor: 'rgba(255,255,255,0.2)', padding: 8, borderRadius: 9999 }}
                >
                  {getImageUrl(userData?.profile_image || user?.profile_image) ? (
                    <Image
                      source={{ uri: getImageUrl(userData?.profile_image || user?.profile_image)! }}
                      className="w-8 h-8 rounded-full border-2 border-white"
                      resizeMode="cover"
                    />
                  ) : (
                    <Ionicons name="person-circle-outline" size={24} color="white" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View className="flex-row justify-between px-4 mt-6" style={{ marginTop: -25 }}>
              <View className="bg-white rounded-2xl p-5 w-[48%] shadow-lg">
                <View className="flex-row justify-between items-center">
                  <Text className="text-gray-500 text-sm font-medium">Today</Text>
                  <View className="bg-pink-100 p-2 rounded-full">
                    <Ionicons name="calendar" size={18} color="#ec4899" />
                  </View>
                </View>
                <Text className="text-pink-500 text-3xl font-bold mt-3">{todayAppointments.length}</Text>
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

            <View className="px-5 mt-4">
              <TouchableOpacity
                onPress={handleOpenRemitModal}
                disabled={isLoadingRemit}
                className="w-full py-4 rounded-2xl"
                style={{
                  backgroundColor: '#ec4899',
                  shadowColor: '#ec4899',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <View className="flex-row items-center justify-center gap-3">
                  {isLoadingRemit ? (
                    <>
                      <ActivityIndicator size="small" color="white" />
                      <Text className="text-white font-bold text-lg">Loading...</Text>
                    </>
                  ) : (
                    <>
                      <Ionicons name="cash-outline" size={24} color="white" />
                      <Text className="text-white font-bold text-lg">Remit Profit</Text>
                      <Ionicons name="arrow-forward-circle-outline" size={24} color="white" />
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View className="px-5 mt-6">
              <View className="flex-row justify-between items-center mb-4">
                <Text className="text-xl font-bold text-gray-800">Today's Appointments</Text>
                <TouchableOpacity onPress={() => setActiveTab('appointments')}>
                  <Text className="text-pink-500 font-semibold">View All</Text>
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
                          <View className="bg-pink-100 p-2 rounded-full mr-3">
                            <Ionicons name="person-outline" size={20} color="#ec4899" />
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

                      <View className={`px-3 py-1.5 rounded-full ${app.service_status === 'completed' ? 'bg-green-100' : app.service_status === 'in_progress' ? 'bg-blue-100' : 'bg-pink-100'}`}>
                        <Text className={`text-xs font-semibold ${app.service_status === 'in_progress' ? 'text-blue-700' : app.service_status === 'completed' ? 'text-green-700' : 'text-pink-700'}`}>
                          {app.service_status === 'in_progress' ? 'IN PROGRESS' : app.service_status === 'completed' ? 'COMPLETED' : app.service_status?.toUpperCase() || 'PENDING'}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-row justify-between items-center mt-2 pt-2 border-t border-gray-100">
                      <Text className="text-pink-500 font-bold text-lg">₱{parseFloat(app.price).toLocaleString()}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>

            {/* Total Earnings Card */}
            <View className="px-5 mt-4 mb-6">
              <View className="rounded-2xl p-5" style={{ backgroundColor: '#ec4899' }}>
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="text-white opacity-90 text-sm">My Total Earnings</Text>
                    <Text className="text-white text-4xl font-bold mt-2">₱{completedEarnings.toLocaleString()}</Text>
                    <Text className="text-white opacity-75 text-xs mt-2">
                      {staffCommissionRate > 0
                        ? `${(staffCommissionRate * 100).toFixed(0)}% commission from completed services`
                        : 'No commission rate set'}
                    </Text>
                    {staffCommissionRate > 0 && (
                      <Text className="text-white opacity-75 text-[10px] mt-1">
                        Based on ₱{completedRevenue.toLocaleString()} completed revenue
                      </Text>
                    )}
                  </View>
                  <View className="bg-white/20 p-3 rounded-full">
                    <Ionicons name="trophy-outline" size={28} color="white" />
                  </View>
                </View>
              </View>
            </View>

            {/* ✅ Work Schedule — calendar + assigned days embedded on Home */}
            <View className="px-5 mb-6">
              <Text className="text-xl font-bold text-gray-800 mb-3">Work Schedule</Text>

              <View className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <View className="px-4 py-3 border-b border-gray-100 flex items-center justify-between flex-row">
                  <View className="flex-row items-center gap-3">
                    <TouchableOpacity onPress={() => changeMonth(-1)} className="p-1.5">
                      <Ionicons name="chevron-back" size={20} color="#ec4899" />
                    </TouchableOpacity>
                    <Text className="text-base font-semibold text-gray-800">
                      {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                    </Text>
                    <TouchableOpacity onPress={() => changeMonth(1)} className="p-1.5">
                      <Ionicons name="chevron-forward" size={20} color="#ec4899" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    onPress={() => setCurrentMonth(new Date())}
                    className="px-2 py-1 bg-pink-50 rounded-lg"
                  >
                    <Text className="text-xs text-pink-600">Today</Text>
                  </TouchableOpacity>
                </View>

                <View className="p-4">
                  <View className="flex-row mb-2">
                    {weekDays.map((day, index) => (
                      <View key={index} className="flex-1 items-center py-2">
                        <Text className="text-gray-500 text-xs font-medium">{day}</Text>
                      </View>
                    ))}
                  </View>

                  <View className="flex-row flex-wrap">
                    {getDaysInMonth(currentMonth).map((date, index) => {
                      if (!date) {
                        return <View key={`empty-${index}`} className="w-[14.28%] aspect-square p-1" />;
                      }

                      const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
                      const todayUTC = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
                      const isTodayDate = dateUTC.getTime() === todayUTC.getTime();
                      const isPast = dateUTC < todayUTC;
                      const scheduleStatus = getScheduleStatus(date);

                      let cellBgColor = 'bg-gray-50';
                      let indicatorColor: string | null = null;
                      let indicatorText: string | null = null;
                      const dayNumber = date.getUTCDate();

                      if (!isPast) {
                        if (scheduleStatus.status === 'open') {
                          cellBgColor = 'bg-green-50';
                          indicatorColor = 'bg-green-500';
                          if (scheduleStatus.isAssigned) indicatorText = '✓';
                        } else if (scheduleStatus.status === 'closed') {
                          cellBgColor = 'bg-red-50';
                          indicatorColor = 'bg-red-500';
                        } else {
                          cellBgColor = 'bg-gray-100';
                          indicatorColor = 'bg-gray-400';
                        }
                      } else {
                        cellBgColor = 'bg-gray-100';
                      }

                      return (
                        <TouchableOpacity
                          key={date.toISOString()}
                          className={`w-[14.28%] aspect-square p-1 ${isPast ? 'opacity-40' : ''}`}
                          onPress={() => !isPast && handleScheduleClick(date)}
                          disabled={
                            isPast ||
                            scheduleStatus.status === 'closed' ||
                            scheduleStatus.status === 'no_schedule'
                          }
                        >
                          <View className={`flex-1 items-center justify-center rounded-full ${cellBgColor}`}>
                            <Text
                              className={`text-sm ${
                                isTodayDate
                                  ? 'text-pink-600 font-bold'
                                  : isPast
                                  ? 'text-gray-400'
                                  : scheduleStatus.status === 'open'
                                  ? 'text-green-700'
                                  : scheduleStatus.status === 'closed'
                                  ? 'text-red-700'
                                  : 'text-gray-500'
                              }`}
                            >
                              {dayNumber}
                            </Text>
                            {indicatorColor && (
                              <View className={`w-1.5 h-1.5 rounded-full ${indicatorColor} mt-0.5`} />
                            )}
                            {indicatorText && (
                              <Text className="text-green-600 text-xs mt-0.5 font-bold">{indicatorText}</Text>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>

              <View className="flex-row justify-around mt-3 mb-4 pb-3 border-b border-gray-100 flex-wrap gap-2">
                <View className="flex-row items-center gap-1">
                  <View className="w-3 h-3 rounded-full bg-green-500" />
                  <Text className="text-xs text-gray-600">Open</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-3 h-3 rounded-full bg-green-500" />
                  <Text className="text-xs text-green-600 font-bold">✓</Text>
                  <Text className="text-xs text-gray-600">You're assigned</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-3 h-3 rounded-full bg-red-500" />
                  <Text className="text-xs text-gray-600">Closed</Text>
                </View>
                <View className="flex-row items-center gap-1">
                  <View className="w-3 h-3 rounded-full bg-gray-400" />
                  <Text className="text-xs text-gray-600">No Schedule</Text>
                </View>
              </View>

              <Text className="text-lg font-bold text-gray-800 mb-3">Your Assigned Days</Text>
              {staffAssignments.filter(a => a.staff_id === user?.id).length === 0 ? (
                <View className="bg-white rounded-2xl p-8 items-center">
                  <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
                  <Text className="text-gray-400 mt-2 text-center">No assigned work days yet</Text>
                  <Text className="text-gray-400 text-xs text-center mt-1">Check back later for your schedule</Text>
                </View>
              ) : (
                staffAssignments
                  .filter(a => a.staff_id === user?.id)
                  .map((assignment) => (
                    <View key={assignment.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm border border-gray-100">
                      <View className="flex-row items-center gap-3">
                        <View className="bg-pink-100 p-2 rounded-full">
                          <Ionicons name="checkmark-circle" size={20} color="#ec4899" />
                        </View>
                        <View>
                          <Text className="text-gray-800 font-semibold">
                            {formatFullDate(assignment.business_schedules?.business_date || '')}
                          </Text>
                          <Text className="text-gray-500 text-xs">
                            {assignment.business_schedules?.open_time?.substring(0, 5)} - {assignment.business_schedules?.close_time?.substring(0, 5)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  ))
              )}
            </View>
          </ScrollView>
        );

      case 'appointments':
        return <StaffAppointments refreshing={refreshing} onRefresh={onRefresh} />;

      case 'walkin':
        return <StaffWalkIn onSuccess={() => { onRefresh(); }} />;

      case 'settings':
        return (
          <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
            <View className="px-5 pt-6">
              <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>

              <TouchableOpacity
                className="bg-white rounded-2xl p-6 mb-4 items-center shadow-sm"
                onPress={() => setActiveTab('profile')}
                activeOpacity={0.7}
              >
                {getImageUrl(userData?.profile_image || user?.profile_image) ? (
                  <Image
                    source={{ uri: getImageUrl(userData?.profile_image || user?.profile_image)! }}
                    className="w-24 h-24 rounded-full border-4 border-pink-200 mb-3"
                    resizeMode="cover"
                  />
                ) : (
                  <View className="bg-pink-100 w-24 h-24 rounded-full items-center justify-center border-4 border-pink-200 mb-3">
                    <Ionicons name="person" size={50} color="#ec4899" />
                  </View>
                )}
                <Text className="text-xl font-bold text-gray-800">{staffName}</Text>
                <Text className="text-gray-500">Salon Staff</Text>
                <Text className="text-gray-400 text-sm mt-2">{user?.email}</Text>
                <Text className="text-gray-400 text-sm">{user?.phone_number}</Text>

                <View className="flex-row items-center mt-3">
                  <Ionicons name="chevron-forward-circle-outline" size={16} color="#ec4899" />
                  <Text className="text-pink-500 text-xs font-semibold ml-1">Tap to view profile</Text>
                </View>
              </TouchableOpacity>

              <View className="bg-white rounded-2xl overflow-hidden shadow-sm mb-4">
                <TouchableOpacity className="flex-row items-center px-5 py-4 border-b border-gray-100">
                  <Ionicons name="notifications-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Notifications</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-5 py-4 border-b border-gray-100"
                  onPress={() => setActiveTab('profile')}
                >
                  <Ionicons name="person-outline" size={22} color="#ec4899" />
                  <Text className="ml-3 flex-1 text-gray-700">Profile</Text>
                  <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                </TouchableOpacity>

                <TouchableOpacity
                  className="flex-row items-center px-5 py-4 border-b border-gray-100"
                  onPress={() => setShowReportPage(true)}
                >
                  <Ionicons name="alert-circle-outline" size={22} color="#ef4444" />
                  <Text className="ml-3 flex-1 text-red-600 font-semibold">Report Incident</Text>
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
    <SafeAreaView className="flex-1 bg-gray-50" edges={['bottom']}>
      <StatusBar style="light" />

      <View className="flex-1">
        {renderContent()}
      </View>

      <RemittanceModal />
      <ReportModal />
      <ScheduleOptionsModal />

      <View className="flex-row justify-around items-center border-t border-gray-200 bg-white py-3">
        <TouchableOpacity
          className="items-center py-1 px-5"
          onPress={() => { setShowReportPage(false); setActiveTab('home'); }}
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
          className="items-center py-1 px-5"
          onPress={() => { setShowReportPage(false); setActiveTab('appointments'); }}
        >
          <Ionicons
            name={activeTab === 'appointments' ? "calendar" : "calendar-outline"}
            size={24}
            color={activeTab === 'appointments' ? "#ec4899" : "#9ca3af"}
          />
          <Text className={`text-xs mt-1 ${activeTab === 'appointments' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
            Appointments
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center py-1 px-5"
          onPress={() => { setShowReportPage(false); setActiveTab('walkin'); }}
        >
          <Ionicons
            name={activeTab === 'walkin' ? "person-add" : "person-add-outline"}
            size={24}
            color={activeTab === 'walkin' ? "#ec4899" : "#9ca3af"}
          />
          <Text className={`text-xs mt-1 ${activeTab === 'walkin' ? 'text-pink-500 font-semibold' : 'text-gray-400'}`}>
            Walk-in
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="items-center py-1 px-5"
          onPress={() => { setShowReportPage(false); setActiveTab('settings'); }}
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