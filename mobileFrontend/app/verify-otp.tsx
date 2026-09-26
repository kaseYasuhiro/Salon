import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from "expo-router";
import { useState, useRef, useEffect } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import api from '@/api/axios';

export default function VerifyEmail() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const otpInputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!email) {
      Alert.alert("Error", "No email provided", [
        { text: "OK", onPress: () => router.replace("/") }
      ]);
    }
  }, [email]);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }

    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendTimer]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (value: string, index: number) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    const newOtp = [...otp];
    newOtp[index] = numericValue;
    setOtp(newOtp);

    if (numericValue && index < 5) {
      otpInputs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      otpInputs.current[index - 1]?.focus();
    }
  };

  const getOtpString = () => otp.join('');

  const handleVerifyOtp = async () => {
    const otpCode = getOtpString();
    
    if (otpCode.length !== 6) {
      Alert.alert("Error", "Please enter the complete 6-digit code");
      return;
    }

    setIsVerifying(true);

    try {
      await api.post('/otp/verify', {
        email: email,
        otp: otpCode
      });

      Alert.alert(
        "Email Verified!",
        "Your email has been successfully verified. You can now login.",
        [
          {
            text: "Go to Login",
            onPress: () => router.replace("/")
          }
        ]
      );
    } catch (error: any) {
      console.error("OTP verification error:", error);
      let errorMessage = "Invalid verification code. Please try again.";
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.errors?.otp) {
        errorMessage = error.response.data.errors.otp[0];
      }
      
      Alert.alert("Verification Failed", errorMessage);
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    if (!canResend) return;

    setIsResending(true);

    try {
      await api.post('/otp/resend', {
        email: email,
        purpose: 'verification'
      });

      setResendTimer(60);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      otpInputs.current[0]?.focus();

      Alert.alert("Code Resent", `A new verification code has been sent to ${email}`);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || "Failed to resend the code. Please try again."
      );
    } finally {
      setIsResending(false);
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
          {/* Header */}
          <View className="bg-pink-500 pt-12 pb-12 rounded-b-3xl">
            <View className="px-6">
              <View className="items-center mb-4">
                <View className="w-16 h-16 bg-white/20 rounded-2xl items-center justify-center">
                  <Ionicons name="mail-outline" size={32} color="white" />
                </View>
              </View>
              <Text className="text-white text-center text-lg font-medium mb-1">
                Reshel Oco Hair Salon
              </Text>
              <Text className="text-white text-4xl font-bold text-center mt-3">
                Verify Email
              </Text>
              <Text className="text-white text-base text-center mt-2 opacity-90">
                Enter the code sent to your email
              </Text>
            </View>
          </View>

          {/* OTP Form */}
          <View className="flex-1 px-6 -mt-6">
            <View className="bg-white rounded-3xl shadow-xl p-6">
              {/* Email Display */}
              <View className="bg-pink-50 rounded-xl p-4 mb-6 border border-pink-100">
                <View className="flex-row items-center justify-center">
                  <Ionicons name="mail" size={18} color="#ec4899" />
                  <Text className="text-gray-700 ml-2 text-sm">Code sent to</Text>
                </View>
                <Text className="text-pink-600 font-bold text-center mt-1 text-base">
                  {email}
                </Text>
              </View>

              <Text className="text-gray-600 text-center text-sm mb-6 leading-5">
                We've sent a 6-digit verification code to your email address.
                Please enter the code below to verify your account.
              </Text>

              {/* OTP Inputs */}
              <View className="mb-6">
                <View className="flex-row justify-between px-2">
                  {otp.map((digit, index) => (
                    <View key={index} className="w-12 h-14">
                      <TextInput
                        ref={(ref) => {
                          otpInputs.current[index] = ref;
                        }}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={(e) => handleOtpKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        editable={!isVerifying}
                        className={`w-full h-full text-center text-2xl font-bold rounded-xl border-2 ${
                          digit
                            ? 'border-pink-500 bg-pink-50 text-pink-600'
                            : 'border-gray-200 bg-gray-50 text-gray-800'
                        }`}
                        selectTextOnFocus
                      />
                    </View>
                  ))}
                </View>
              </View>

              {/* Verify Button */}
              <TouchableOpacity
                onPress={handleVerifyOtp}
                disabled={isVerifying || getOtpString().length !== 6}
                className={`py-4 rounded-xl items-center shadow-lg ${
                  isVerifying || getOtpString().length !== 6
                    ? 'bg-gray-300'
                    : 'bg-pink-500'
                }`}
              >
                {isVerifying ? (
                  <View className="flex-row items-center">
                    <ActivityIndicator color="white" size="small" />
                    <Text className="text-white text-lg font-bold ml-2">Verifying...</Text>
                  </View>
                ) : (
                  <Text className={`text-lg font-bold ${
                    getOtpString().length !== 6 ? 'text-gray-500' : 'text-white'
                  }`}>
                    Verify Email
                  </Text>
                )}
              </TouchableOpacity>

              {/* Resend */}
              <View className="mt-6 items-center">
                <Text className="text-gray-500 text-sm mb-2">
                  Didn't receive the code?
                </Text>

                {canResend ? (
                  <TouchableOpacity
                    onPress={handleResendOtp}
                    disabled={isResending}
                    className="flex-row items-center"
                  >
                    {isResending ? (
                      <>
                        <ActivityIndicator size="small" color="#ec4899" />
                        <Text className="text-pink-500 font-bold ml-2">Sending...</Text>
                      </>
                    ) : (
                      <>
                        <Ionicons name="refresh" size={18} color="#ec4899" />
                        <Text className="text-pink-500 font-bold ml-2">Resend Code</Text>
                      </>
                    )}
                  </TouchableOpacity>
                ) : (
                  <View className="flex-row items-center">
                    <Ionicons name="time-outline" size={16} color="#9ca3af" />
                    <Text className="text-gray-400 ml-1">
                      Resend in <Text className="font-bold text-pink-500">{formatTimer(resendTimer)}</Text>
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Back to Login */}
            <TouchableOpacity
              onPress={() => router.replace("/")}
              className="flex-row items-center justify-center mt-6 mb-10"
            >
              <Ionicons name="arrow-back" size={16} color="#ec4899" />
              <Text className="text-pink-500 font-semibold ml-1">Back to Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}