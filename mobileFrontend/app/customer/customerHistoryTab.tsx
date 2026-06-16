import React, { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, TextInput } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";

interface CustomerHistoryProps {
  onOpenFeedbackPage?: (appointment: any) => void;
  refreshTrigger?: number;
}

// Separate Feedback Page Component to isolate state
const FeedbackPage = ({ 
  appointment, 
  onBack, 
  onSubmit 
}: { 
  appointment: any; 
  onBack: () => void; 
  onSubmit: (rating: number, comment: string) => Promise<void>;
}) => {
  const [feedbackRating, setFeedbackRating] = useState<number>(0);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleSubmit = async () => {
    if (feedbackRating === 0) {
      Alert.alert("Rating Required", "Please select a rating before submitting.");
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(feedbackRating, feedbackComment);
      onBack();
    } catch (error) {
      // Error is already handled in the parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-gradient-to-r from-pink-500 to-pink-600 px-5 pt-12 pb-4">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="p-1">
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-lg font-semibold">Leave Feedback</Text>
          <View style={{ width: 32 }} />
        </View>
      </View>

      <ScrollView className="flex-1 p-5">
        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <Text className="text-gray-800 text-lg font-bold text-center mb-2">
            {appointment.service_name}
          </Text>
          <Text className="text-gray-500 text-sm text-center">
            {formatDate(appointment.appointment_date)} at {appointment.appointment_time}
          </Text>
        </View>

        <View className="bg-white rounded-2xl p-6 shadow-sm mb-5">
          <Text className="text-gray-800 text-lg font-semibold text-center mb-4">
            How was your experience?
          </Text>
          
          <View className="flex-row justify-center gap-3 mb-5">
            {[1, 2, 3, 4, 5].map((star) => (
              <TouchableOpacity
                key={star}
                onPress={() => setFeedbackRating(star)}
                className="p-1"
              >
                <Ionicons 
                  name={star <= feedbackRating ? "star" : "star-outline"} 
                  size={44} 
                  color={star <= feedbackRating ? "#fbbf24" : "#d1d5db"} 
                />
              </TouchableOpacity>
            ))}
          </View>

          <View className="border-t border-gray-100 pt-4">
            <Text className="text-gray-700 text-sm font-semibold mb-3">
              Share your thoughts (Optional)
            </Text>
            <TextInput
              multiline
              numberOfLines={5}
              value={feedbackComment}
              onChangeText={setFeedbackComment}
              placeholder="Tell us about your experience with the service and staff..."
              className="border border-gray-200 rounded-xl p-4 text-gray-700 min-h-[120px] text-base"
              textAlignVertical="top"
            />
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
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-pink-500 to-pink-600"
          >
            <Text className="text-white text-center font-semibold">
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

export default function CustomerHistoryTab({ onOpenFeedbackPage, refreshTrigger }: CustomerHistoryProps) {
  const [showFeedbackPage, setShowFeedbackPage] = useState(false);
  const [selectedAppointmentForFeedback, setSelectedAppointmentForFeedback] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const { 
    user,
    appointments,
    isLoading,
    fetchUserAppointments,
    fetchFeedbacks,
    submitFeedback,
    getFeedbacksForAppointment
  } = useAuth();

  // Format date helper
  const formatDate = (date: string) => {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get status color for appointment status
  const getStatusColor = (status: string) => {
    switch(status) {
      case 'confirmed': return 'bg-green-100 text-green-700';
      case 'pending': return 'bg-yellow-100 text-yellow-700';
      case 'completed': return 'bg-blue-100 text-blue-700';
      case 'cancelled': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // Check if an appointment has feedback
  const hasFeedback = (appointmentId: number) => {
    const feedbacks = getFeedbacksForAppointment(appointmentId);
    return feedbacks.length > 0;
  };

  // Get feedback rating for an appointment
  const getFeedbackRating = (appointmentId: number) => {
    const feedbacks = getFeedbacksForAppointment(appointmentId);
    if (feedbacks.length > 0) {
      return feedbacks[0].rating;
    }
    return null;
  };

  // Handle opening feedback page
  const handleOpenFeedbackPage = (appointment: any) => {
    if (onOpenFeedbackPage) {
      onOpenFeedbackPage(appointment);
    } else {
      setSelectedAppointmentForFeedback(appointment);
      setShowFeedbackPage(true);
    }
  };

  // Handle closing feedback page
  const handleCloseFeedbackPage = () => {
    setShowFeedbackPage(false);
    setSelectedAppointmentForFeedback(null);
  };

  // Handle submitting feedback
  const handleSubmitFeedback = async (rating: number, comment: string) => {
    const customerId = user?.id;
    
    if (!customerId || customerId === 0) {
      Alert.alert("Error", "Please log in again to submit feedback.");
      throw new Error("No customer ID");
    }

    await submitFeedback({
      appointment_id: selectedAppointmentForFeedback.id,
      customer_id: customerId,
      rating: rating,
      comments: comment
    });
    
    Alert.alert("Thank You!", "Your feedback has been submitted successfully.");
    await fetchUserAppointments();
    await fetchFeedbacks();
  };

  // Handle refresh
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserAppointments(),
      fetchFeedbacks()
    ]);
    setRefreshing(false);
  }, [fetchUserAppointments, fetchFeedbacks]);

  // Fetch data on mount
  useEffect(() => {
    fetchUserAppointments();
    fetchFeedbacks();
  }, []);

  // Refresh when trigger changes
  useEffect(() => {
    if (refreshTrigger) {
      fetchUserAppointments();
      fetchFeedbacks();
    }
  }, [refreshTrigger]);

  // Main History Tab Content
  if (showFeedbackPage && selectedAppointmentForFeedback) {
    return (
      <FeedbackPage 
        appointment={selectedAppointmentForFeedback}
        onBack={handleCloseFeedbackPage}
        onSubmit={handleSubmitFeedback}
      />
    );
  }

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
      }
    >
      <View className="px-5 pt-6">
        <Text className="text-3xl font-bold text-gray-800 mb-2">History</Text>
        <Text className="text-gray-500 mb-6">Your appointment records</Text>
        
        {isLoading ? (
          <View className="py-10">
            <Text className="text-center text-gray-500">Loading history...</Text>
          </View>
        ) : appointments.length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center" style={{ elevation: 2 }}>
            <Ionicons name="document-text-outline" size={50} color="#d1d5db" />
            <Text className="text-gray-500 text-center mt-3">No appointment history</Text>
          </View>
        ) : (
          appointments.map((item) => {
            const hasGivenFeedback = hasFeedback(item.id);
            const existingRating = getFeedbackRating(item.id);
            const isCompleted = item.status === 'completed';
            
            return (
              <View key={item.id} className="bg-white rounded-2xl p-4 mb-3 shadow-sm">
                <View className="flex-row justify-between items-start">
                  <View className="flex-1">
                    <Text className="font-semibold text-gray-800 text-lg">{item.service_name}</Text>
                    <Text className="text-gray-500 text-sm">{item.duration_minutes} mins</Text>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="calendar-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">{formatDate(item.appointment_date)}</Text>
                    </View>
                    <View className="flex-row items-center mt-1">
                      <Ionicons name="time-outline" size={12} color="#9ca3af" />
                      <Text className="text-gray-400 text-xs ml-1">{item.appointment_time}</Text>
                    </View>
                  </View>
                  <Text className="text-pink-500 font-semibold">₱{parseFloat(item.price).toLocaleString()}</Text>
                </View>
                
                <View className="flex-row items-center justify-between mt-3 pt-2 border-t border-gray-100">
                  <View className={`px-2 py-0.5 rounded-full self-start ${getStatusColor(item.status)}`}>
                    <Text className="text-xs font-semibold capitalize">{item.status}</Text>
                  </View>
                  
                  {/* Rate Button - Only show for completed appointments without feedback */}
                  {isCompleted && !hasGivenFeedback && (
                    <TouchableOpacity 
                      onPress={() => handleOpenFeedbackPage(item)}
                      className="flex-row items-center gap-1 px-3 py-1.5 bg-yellow-50 rounded-full"
                    >
                      <Ionicons name="star-outline" size={14} color="#eab308" />
                      <Text className="text-xs font-semibold text-yellow-600">Rate</Text>
                    </TouchableOpacity>
                  )}
                  
                  {/* Already Rated Badge */}
                  {isCompleted && hasGivenFeedback && (
                    <View className="flex-row items-center gap-1 px-3 py-1.5 bg-green-50 rounded-full">
                      <Ionicons name="star" size={14} color="#10b981" />
                      <Text className="text-xs font-semibold text-green-600">Rated {existingRating}/5</Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>
    </ScrollView>
  );
}