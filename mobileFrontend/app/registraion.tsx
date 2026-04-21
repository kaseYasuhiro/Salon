import { Ionicons } from '@expo/vector-icons';
import { router } from "expo-router";
import { useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/contexts/auth-context";

export default function Register() {
  const { register } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form fields
  const [first_name, setFirstName] = useState("");
  const [last_name, setLastName] = useState("");
  const [phone_number, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password_confirmation, setConfirmPassword] = useState("");

  const handleRegister = () => {
    // Validation checks
    if (!first_name || !last_name || !phone_number || !email || !password || !password_confirmation) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      Alert.alert("Error", "Please enter a valid email address");
      return;
    }

    // Phone number validation (basic)
    const phoneRegex = /^[0-9]{10,11}$/;
    if (!phoneRegex.test(phone_number.replace(/[^0-9]/g, ''))) {
      Alert.alert("Error", "Please enter a valid phone number (10-11 digits)");
      return;
    }

    // Password validation
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters long");
      return;
    }

    // Password confirmation
    if (password !== password_confirmation) {
      Alert.alert("Error", "Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      register({ first_name, last_name, email, password, password_confirmation, phone_number, role: "customer" })

      Alert.alert(
        "Registration Successful", 
        "Your account has been created. Please login to continue.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/")
          }
        ]
      );
    } catch (error: any) {
      console.log("Registration error:", error);
      let errorMessage = "Registration failed. Please try again.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors) {
        // Handle Laravel validation errors
        const errors = Object.values(error.response.data.errors).flat();
        errorMessage = errors.join("\n");
      } else if (error.message) {
        errorMessage = error.message;
      }
      Alert.alert("Registration Failed", errorMessage);
    } finally {
      setIsLoading(false);
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
          {/* Header Section */}
          <View className="bg-pink-500 pt-12 pb-12 rounded-b-3xl">
            <View className="px-6">
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center">
                  <Ionicons name="person-add-outline" size={32} color="white" />
                </View>
              </View>
              <Text className="text-white text-center text-lg font-medium mb-1">
                Reshel Oco Hair Salon
              </Text>
              <Text className="text-white text-4xl font-bold text-center mt-3">
                Create Account
              </Text>
              <Text className="text-white text-base text-center mt-2 opacity-90">
                Join us and book your appointment
              </Text>
            </View>
          </View>

          {/* Form Section */}
          <View className="flex-1 px-6 -mt-6">
            <View className="bg-white rounded-3xl shadow-xl p-6">
              {/* First Name & Last Name Row */}
              <View className="flex-row space-x-4 mb-5">
                <View className="flex-1">
                  <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                    First Name
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                    <View className="pl-4">
                      <Ionicons name="person-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      placeholder="First name"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 h-12 pl-2 text-gray-800"
                      value={first_name}
                      onChangeText={setFirstName}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View className="flex-1">
                  <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                    Last Name
                  </Text>
                  <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                    <View className="pl-4">
                      <Ionicons name="person-outline" size={18} color="#9ca3af" />
                    </View>
                    <TextInput
                      placeholder="Last name"
                      placeholderTextColor="#9ca3af"
                      className="flex-1 h-12 pl-2 text-gray-800"
                      value={last_name}
                      onChangeText={setLastName}
                      editable={!isLoading}
                    />
                  </View>
                </View>
              </View>

              {/* Phone Number Field */}
              <View className="mb-5">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Phone Number
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Ionicons name="call-outline" size={18} color="#9ca3af" />
                  </View>
                  <TextInput
                    placeholder="09123456789"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 h-12 pl-2 text-gray-800"
                    value={phone_number}
                    onChangeText={setPhoneNumber}
                    keyboardType="phone-pad"
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Email Field */}
              <View className="mb-5">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Email Address
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Ionicons name="mail-outline" size={18} color="#9ca3af" />
                  </View>
                  <TextInput
                    placeholder="you@example.com"
                    placeholderTextColor="#9ca3af"
                    className="flex-1 h-12 pl-2 text-gray-800"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isLoading}
                  />
                </View>
              </View>

              {/* Password Field */}
              <View className="mb-5">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                  </View>
                  <TextInput
                    placeholder="Create a password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPassword}
                    className="flex-1 h-12 pl-2 text-gray-800"
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="pr-4">
                    <Ionicons
                      name={showPassword ? "eye-outline" : "eye-off-outline"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
                <Text className="text-gray-400 text-xs mt-1 ml-1">
                  Minimum 6 characters
                </Text>
              </View>

              {/* Confirm Password Field */}
              <View className="mb-6">
                <Text className="text-gray-700 text-sm font-semibold mb-2 ml-1">
                  Confirm Password
                </Text>
                <View className="flex-row items-center bg-gray-50 rounded-xl border border-gray-200">
                  <View className="pl-4">
                    <Ionicons name="lock-closed-outline" size={18} color="#9ca3af" />
                  </View>
                  <TextInput
                    placeholder="Confirm your password"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showConfirmPassword}
                    className="flex-1 h-12 pl-2 text-gray-800"
                    value={password_confirmation}
                    onChangeText={setConfirmPassword}
                    editable={!isLoading}
                  />
                  <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)} className="pr-4">
                    <Ionicons
                      name={showConfirmPassword ? "eye-outline" : "eye-off-outline"}
                      size={18}
                      color="#9ca3af"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Register Button */}
              <TouchableOpacity 
                onPress={handleRegister} 
                disabled={isLoading}
                className={`bg-pink-500 py-4 rounded-xl items-center shadow-lg ${isLoading ? 'opacity-70' : ''}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text className="text-white text-lg font-bold">Create Account</Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Login Link */}
            <View className="flex-row justify-center items-center mt-6 mb-10">
              <Text className="text-gray-600 text-base">Already have an account? </Text>
              <TouchableOpacity onPress={() => router.replace("/")}>
                <Text className="text-pink-500 text-base font-bold">Sign In</Text>
              </TouchableOpacity>
            </View>

            {/* Footer */}
            <View className="items-center pb-6">
              <Text className="text-gray-400 text-xs text-center">
                By creating an account, you agree to our Terms of Service
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