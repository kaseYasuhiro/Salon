import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, TextInput, Image, ActivityIndicator } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import * as DocumentPicker from 'expo-document-picker';
import api from '@/api/axios';

interface CustomerSettingsProps {
  onLogout?: () => void;
}

// ─────────────────────────────────────────────────────────────
// Image URL helper
// ─────────────────────────────────────────────────────────────
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/api\/?$/, '');

const getImageUrl = (imagePath: string | null | undefined): string | null => {
  if (!imagePath) return null;
  // Already a full URL
  if (imagePath.startsWith('http')) return imagePath;
  // Path already includes /storage/
  if (imagePath.startsWith('/storage/')) return `${BASE_URL}${imagePath}`;
  // Path is just "users/xxx.jpg" — prepend /storage/
  return `${BASE_URL}/storage/${imagePath}`;
};

// ─────────────────────────────────────────────────────────────
// Change Password Section
// ─────────────────────────────────────────────────────────────
const ChangePasswordSection = ({ onBack }: { onBack: () => void }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const { user } = useAuth();

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
      const response = await api.post(`/user/${user?.id}/password`, {
        password: password,
        password_confirmation: confirmPassword
      });

      Alert.alert("Success", "Password updated successfully!");
      onBack();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update password. Please try again.");
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-5 pt-12 pb-4" style={{ backgroundColor: '#ec4899' }}>
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
            className="flex-1 py-3 rounded-xl"
            style={{
              backgroundColor: (isUpdatingPassword || !password || !confirmPassword || password !== confirmPassword || password.length < 6)
                ? '#f9a8d4'
                : '#ec4899'
            }}
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

// ─────────────────────────────────────────────────────────────
// Update Phone Section
// ─────────────────────────────────────────────────────────────
const UpdatePhoneSection = ({ onBack, currentPhone }: { onBack: () => void, currentPhone: string }) => {
  const [phoneNumber, setPhoneNumber] = useState(currentPhone || '');
  const [isUpdatingPhone, setIsUpdatingPhone] = useState(false);
  const { user } = useAuth();

  const handleUpdatePhone = async () => {
    if (!phoneNumber.trim()) {
      Alert.alert("Error", "Please enter a phone number.");
      return;
    }

    if (!/^[0-9]{10,11}$/.test(phoneNumber.trim())) {
      Alert.alert("Error", "Please enter a valid phone number (10-11 digits).");
      return;
    }

    setIsUpdatingPhone(true);
    try {
      const response = await api.post(`/user/${user?.id}/phone`, {
        phone_number: phoneNumber.trim()
      });

      Alert.alert("Success", "Phone number updated successfully!");
      onBack();
    } catch (error: any) {
      Alert.alert("Error", error.response?.data?.message || "Failed to update phone number.");
    } finally {
      setIsUpdatingPhone(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-5 pt-12 pb-4" style={{ backgroundColor: '#ec4899' }}>
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="p-1">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Update Phone Number</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView className="flex-1 p-5">
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <View className="items-center mb-6">
            <View className="w-20 h-20 bg-pink-100 rounded-full items-center justify-center mb-3">
              <Ionicons name="call-outline" size={40} color="#ec4899" />
            </View>
            <Text className="text-gray-800 text-lg font-semibold text-center">
              Update Phone Number
            </Text>
            <Text className="text-gray-500 text-sm text-center mt-1">
              Enter your new phone number below
            </Text>
          </View>

          <View>
            <Text className="text-gray-700 text-sm font-semibold mb-2">Phone Number *</Text>
            <View className="flex-row items-center border border-gray-200 rounded-lg px-3 bg-gray-50">
              <Ionicons name="call-outline" size={18} color="#9ca3af" />
              <TextInput
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                placeholder="Enter phone number"
                placeholderTextColor="#9ca3af"
                keyboardType="phone-pad"
                className="flex-1 py-3 ml-2 text-gray-800"
              />
            </View>
            <Text className="text-xs text-gray-500 mt-1">Enter 10-11 digit phone number</Text>
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
            onPress={handleUpdatePhone}
            disabled={isUpdatingPhone || !phoneNumber.trim()}
            className="flex-1 py-3 rounded-xl"
            style={{
              backgroundColor: (isUpdatingPhone || !phoneNumber.trim()) ? '#f9a8d4' : '#ec4899'
            }}
          >
            <Text className="text-white text-center font-semibold">
              {isUpdatingPhone ? 'Updating...' : 'Update Phone Number'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Profile Page
// ─────────────────────────────────────────────────────────────
const ProfilePage = ({
  onBack,
  profileImage,
  onProfileImageUpdated,
}: {
  onBack: () => void;
  profileImage: string | null;
  onProfileImageUpdated: (newPath: string) => void;
}) => {
  const { user } = useAuth();
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showUpdatePhone, setShowUpdatePhone] = useState(false);

  // ✅ Resolve the current user id once, with a fallback to /user if the auth
  //    context hasn't hydrated yet.
  const [resolvedUserId, setResolvedUserId] = useState<number | null>(user?.id ?? null);

  useEffect(() => {
    if (user?.id) {
      setResolvedUserId(user.id);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/user');
        if (!cancelled && res.data?.id) {
          setResolvedUserId(res.data.id);
        }
      } catch (e) {
        // silently ignore
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/jpeg', 'image/png', 'image/jpg', 'image/gif'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return;
      }

      const asset = result.assets[0];
      if (asset) {
        uploadProfileImage(asset.uri, asset.name || 'profile.jpg', asset.mimeType || 'image/jpeg');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadProfileImage = async (uri: string, fileName: string, mimeType: string) => {
    const userId = resolvedUserId ?? user?.id;

    if (!userId) {
      Alert.alert(
        'Not Logged In',
        'We could not determine your account. Please log out and log in again.'
      );
      return;
    }

    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('profile_image', {
        uri: uri,
        name: fileName,
        type: mimeType,
      } as any);

      const response = await api.post(`/profile/add/${userId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      // ✅ Trust the response first — the controller returns the new path
      let newPath: string | null = response.data?.profile_image ?? null;

      // ✅ Then re-fetch /user to be sure (in case the response shape changes)
      try {
        const userResponse = await api.get('/user');
        if (userResponse.data?.profile_image) {
          newPath = userResponse.data.profile_image;
        }
      } catch (e) {
        // silently ignore
      }

      if (newPath) {
        // ✅ Propagate the new path to the parent so it can re-render
        onProfileImageUpdated(newPath);
      }

      Alert.alert('Success', 'Profile picture updated successfully!');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload profile picture.');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Build the display URL from the parent-managed path (which we just updated)
  const displayImage = getImageUrl(profileImage);

  if (showChangePassword) {
    return <ChangePasswordSection onBack={() => setShowChangePassword(false)} />;
  }

  if (showUpdatePhone) {
    return <UpdatePhoneSection onBack={() => setShowUpdatePhone(false)} currentPhone={user?.phone_number || ''} />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      <View className="px-5 pt-12 pb-4" style={{ backgroundColor: '#ec4899' }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onBack} className="p-1 mr-3">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Profile</Text>
        </View>
      </View>

      <ScrollView className="flex-1 p-5">
        {/* Profile Card */}
        <View className="bg-white rounded-2xl p-6 items-center shadow-sm mb-5">
          <TouchableOpacity onPress={pickDocument} className="mb-4">
            {displayImage ? (
              <Image
                source={{ uri: displayImage }}
                className="w-24 h-24 rounded-full border-4 border-pink-200"
                resizeMode="cover"
              />
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
            {user?.first_name} {user?.last_name}
          </Text>
          <Text className="text-gray-500 text-sm">Customer</Text>
          <Text className="text-gray-400 text-sm mt-2">{user?.email}</Text>
          <Text className="text-gray-400 text-sm">{user?.phone_number}</Text>
        </View>

        {/* Settings Options */}
        <View className="bg-white rounded-2xl overflow-hidden shadow-sm">
          <TouchableOpacity
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
            onPress={pickDocument}
          >
            <Ionicons name="image-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Change Profile Picture</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center px-5 py-4 border-b border-gray-100"
            onPress={() => setShowUpdatePhone(true)}
          >
            <Ionicons name="call-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Update Phone Number</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-row items-center px-5 py-4"
            onPress={() => setShowChangePassword(true)}
          >
            <Ionicons name="lock-closed-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Change Password</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

// ─────────────────────────────────────────────────────────────
// Main Settings Tab
// ─────────────────────────────────────────────────────────────
export default function CustomerSettingsTab({ onLogout }: CustomerSettingsProps) {
  const [showProfilePage, setShowProfilePage] = useState(false);
  const { user, logout } = useAuth();

  // ✅ Shared profile image state — both the Settings card and the Profile page read from here
  const [profileImage, setProfileImage] = useState<string | null>(user?.profile_image ?? null);

  // Keep the shared state in sync when the auth context hydrates
  useEffect(() => {
    if (user?.profile_image && user.profile_image !== profileImage) {
      setProfileImage(user.profile_image);
    }
  }, [user?.profile_image]);

  // On mount, fetch the freshest user data so we don't show a stale image
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get('/user');
        if (!cancelled && res.data?.profile_image) {
          setProfileImage(res.data.profile_image);
        }
      } catch (e) {
        // silently ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      if (onLogout) {
        onLogout();
      }
    } catch (error) {
      // silently ignore
    }
  };

  const handleOpenProfilePage = () => {
    setShowProfilePage(true);
  };

  const handleCloseProfilePage = () => {
    setShowProfilePage(false);
  };

  const handleProfileImageUpdated = (newPath: string) => {
    // ✅ Update the shared state — both the Profile page and the main card will re-render
    setProfileImage(newPath);
  };

  if (showProfilePage) {
    return (
      <ProfilePage
        onBack={handleCloseProfilePage}
        profileImage={profileImage}
        onProfileImageUpdated={handleProfileImageUpdated}
      />
    );
  }

  // Build the profile-image URL for the main card
  const mainDisplayImage = getImageUrl(profileImage);

  return (
    <ScrollView showsVerticalScrollIndicator={false} className="flex-1">
      <View className="px-5 pt-6">
        <Text className="text-3xl font-bold text-gray-800 mb-6">Settings</Text>

        {/* Profile Section */}
        <View className="bg-white rounded-2xl p-5 mb-4 items-center" style={{ elevation: 2 }}>
          {mainDisplayImage ? (
            <Image
              source={{ uri: mainDisplayImage }}
              className="w-20 h-20 rounded-full mb-3"
              resizeMode="cover"
            />
          ) : (
            <View className="bg-pink-100 p-4 rounded-full mb-3">
              <Ionicons name="person" size={50} color="#ec4899" />
            </View>
          )}
          <Text className="text-xl font-bold text-gray-800">
            {user?.first_name} {user?.last_name}
          </Text>
          <Text className="text-gray-500">{user?.email}</Text>
          <Text className="text-gray-500 text-sm">{user?.phone_number}</Text>
          <TouchableOpacity
            className="bg-pink-500 px-6 py-2 rounded-full mt-3"
            onPress={handleOpenProfilePage}
          >
            <Text className="text-white font-semibold">View Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Account Settings */}
        <View className="bg-white rounded-2xl p-5 mb-4" style={{ elevation: 2 }}>
          <Text className="text-lg font-semibold text-gray-800 mb-3">Account Settings</Text>

          <TouchableOpacity
            className="flex-row items-center py-3 border-b border-gray-100"
            onPress={handleOpenProfilePage}
          >
            <Ionicons name="person-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Profile</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>

          <TouchableOpacity className="flex-row items-center py-3">
            <Ionicons name="notifications-outline" size={22} color="#ec4899" />
            <Text className="ml-3 flex-1 text-gray-700">Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>

        {/* Logout */}
        <TouchableOpacity className="bg-red-500 py-4 rounded-xl mb-6" onPress={handleLogout}>
          <Text className="text-white text-center font-semibold text-lg">Log Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}