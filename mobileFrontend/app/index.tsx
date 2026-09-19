import { Ionicons } from '@expo/vector-icons';
import Checkbox from "expo-checkbox";
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";
import { LinearGradient } from 'expo-linear-gradient';
import api from '@/api/axios';

export default function Login() {
  const { login } = useAuth();
  const [isChecked, setChecked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  
  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter email and password");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }
    
    setIsLocalLoading(true);

    try {
      await login({ email, password });

      let currentUser = useAuth.getState().user;
      let retries = 0;

      while (!currentUser && retries < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        currentUser = useAuth.getState().user;
        retries++;
      }

      if (currentUser) {
        switch(currentUser.role) {
          case "customer" :
            router.replace("/customer/customerDashboard");
            break;
          case "staff" :
            router.replace("/staff/staffDashboard");
            break;
          default:
            router.replace("/customer/customerDashboard");
        }
      } else {
        Alert.alert("Login Failed", "Unable to Fetch User Information");
      }
    } catch (error: any) {
      // Check if email is not verified
      if (error.isEmailNotVerified) {
        const verificationEmail = error.email || email;
        
        Alert.alert(
          "Email Not Verified",
          "Your email hasn't been verified yet. Would you like to verify it now?",
          [
            {
              text: "Cancel",
              style: "cancel"
            },
            {
              text: "Verify Now",
              onPress: async () => {
                try {
                  // Send a new OTP
                  await api.post('/otp/send', {
                    email: verificationEmail,
                    purpose: 'verification'
                  });
                  
                  // Navigate to OTP verification screen
                  router.push({
                    pathname: '/verify-otp',
                    params: { email: verificationEmail }
                  });
                } catch (otpError: any) {
                  Alert.alert(
                    "Error",
                    otpError.response?.data?.message || "Failed to send verification code. Please try again."
                  );
                }
              }
            }
          ]
        );
      } else {
        // Handle other login errors
        let errorMessage = "Invalid Email or Password";
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        Alert.alert("Login Failed", errorMessage);
      }
    } finally {
      setIsLocalLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        <ScrollView 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ flexGrow: 1 }}
        >
          {/* Header Section with Gradient */}
          <LinearGradient
            colors={['#ec4899', '#f472b6', '#fbcfe8']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            className="h-80 justify-center rounded-b-3xl"
          >
            <View className="px-6">
              <View className="items-center mb-6">
                <View className="w-20 h-20 bg-white/20 rounded-2xl items-center justify-center backdrop-blur-lg">
                  <Ionicons name="cut-outline" size={40} color="white" />
                </View>
              </View>
              <Text className="text-white text-center text-lg font-medium mb-2">
                Reshel Oco Hair Salon
              </Text>
              <Text className="text-white text-5xl font-bold text-center mt-4">
                Welcome Back
              </Text>
              <Text className="text-white text-lg text-center mt-2 opacity-90">
                Login to continue
              </Text>
            </View>
          </LinearGradient>

          {/* Form Section */}
          <View className="flex-1 px-6 -mt-8">
            <View className="bg-white rounded-3xl shadow-xl p-6">
              {/* Email Field */}
              <View className="mb-5">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200 focus:border-pink-500">
                  <View className="pl-4">
                    <Ionicons name="mail-outline" size={20} color="#9ca3af" />
                  </View>
                  <TextInput
                    placeholder="Enter your email"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 h-14 pl-3 text-gray-800"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLocalLoading}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-4">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Ionicons name="lock-closed-outline" size={20} color="#9ca3af" />
                  </View>
                  <TextInput
                    placeholder="Enter your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    className="flex-1 h-14 pl-3 text-gray-800"
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLocalLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="pr-4">
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={20}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Remember Me & Forgot Password */}
              <View className="flex-row justify-between items-center mb-8">
                <TouchableOpacity 
                  onPress={() => setChecked(!isChecked)} 
                  className="flex-row items-center"
                  disabled={isLocalLoading}
                >
                  <View className={`w-5 h-5 rounded-md border-2 mr-2 items-center justify-center ${isChecked ? 'bg-pink-500 border-pink-500' : 'border-gray-300'}`}>
                    {isChecked && <Ionicons name="checkmark" size={14} color="white" />}
                  </View>
                  <Text className="text-gray-600 text-sm">Remember Me</Text>
                </TouchableOpacity>
                
                <TouchableOpacity disabled={isLocalLoading}>
                  <Text className="text-pink-500 text-sm font-semibold">Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <TouchableOpacity 
                onPress={handleLogin} 
                disabled={isLocalLoading}
                className={`rounded-xl overflow-hidden shadow-lg ${isLocalLoading ? 'opacity-70' : ''}`}
              >
                <LinearGradient
                  colors={['#ec4899', '#f472b6']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="py-4 items-center"
                >
                  {isLocalLoading ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <Text className="text-white text-lg font-bold">Sign In</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>

            {/* Sign Up Link */}
            <View className="flex-row justify-center items-center mt-8 mb-10">
              <Text className="text-gray-600 text-base">Don't have an account? </Text>
              <TouchableOpacity onPress={() => router.push("../registraion")}>
                <Text className="text-pink-500 text-base font-bold">Sign Up</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="items-center pb-6">
              <Text className="text-gray-400 text-xs text-center">
                By continuing, you agree to our Terms of Service
              </Text>
              <Text className="text-gray-400 text-xs text-center mt-1">
                and Privacy Policy
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}