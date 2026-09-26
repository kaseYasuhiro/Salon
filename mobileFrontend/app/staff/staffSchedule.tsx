import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert, RefreshControl, Modal } from "react-native";
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from "@/contexts/auth-context";
import api from '@/api/axios';

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

interface StaffScheduleProps {
  refreshing: boolean;
  onRefresh: () => void;
}

export default function StaffSchedule({ refreshing, onRefresh }: StaffScheduleProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [businessSchedules, setBusinessSchedules] = useState<BusinessSchedule[]>([]);
  const [staffAssignments, setStaffAssignments] = useState<StaffAssignment[]>([]);
  const [showScheduleOptionsModal, setShowScheduleOptionsModal] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<BusinessSchedule | null>(null);
  
  const { user } = useAuth();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Fetch business schedules
  const fetchBusinessSchedules = async () => {
    try {
      const response = await api.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      if (Array.isArray(response.data)) {
        setBusinessSchedules(response.data);
      }
    } catch (error) {
      console.error('Error fetching business schedules:', error);
    }
  };

  // Fetch staff assignments
  const fetchStaffAssignments = async () => {
    try {
      const response = await api.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      if (Array.isArray(response.data)) {
        setStaffAssignments(response.data);
      }
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    }
  };

  // Get schedule for a specific date - using UTC date string
  const getScheduleForDate = (dateStr: string): BusinessSchedule | null => {
    return businessSchedules.find(schedule => schedule.business_date === dateStr) || null;
  };

  // Get UTC date string from Date object
  const getUTCDateString = (date: Date): string => {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
  };

  // Check if staff is already assigned to a schedule
  const isStaffAssignedToSchedule = (businessDateId: number): boolean => {
    return staffAssignments.some(
      assignment => assignment.business_date_id === businessDateId && assignment.staff_id === user?.id
    );
  };

  // Get assignment for a schedule
  const getAssignmentForSchedule = (businessDateId: number): StaffAssignment | null => {
    return staffAssignments.find(
      assignment => assignment.business_date_id === businessDateId && assignment.staff_id === user?.id
    ) || null;
  };

  // Get days in month for calendar - using UTC
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(Date.UTC(year, month, 1));
    const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
    const startingDayOfWeek = firstDay.getUTCDay();
    
    const days = [];
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(Date.UTC(year, month, i)));
    }
    return days;
  };

  const changeMonth = (increment: number) => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + increment, 1));
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return dateUTC.getTime() === todayUTC.getTime();
  };

  const isPastDate = (date: Date): boolean => {
    const today = new Date();
    const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
    return dateUTC < todayUTC;
  };

  const formatFullDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-');
    return new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day))).toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  // Get schedule status for calendar display - using UTC
  const getScheduleStatus = (date: Date): { status: 'open' | 'closed' | 'no_schedule'; schedule: BusinessSchedule | null; isAssigned: boolean } => {
    const dateStr = getUTCDateString(date);
    const schedule = getScheduleForDate(dateStr);
    
    if (!schedule) return { status: 'no_schedule', schedule: null, isAssigned: false };
    if (schedule.is_open !== 1) return { status: 'closed', schedule, isAssigned: false };
    
    const isAssigned = isStaffAssignedToSchedule(schedule.id);
    return { status: 'open', schedule, isAssigned };
  };

  // Handle schedule click - removed self-assignment functionality
  const handleScheduleClick = (date: Date) => {
    if (isPastDate(date)) {
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
      // Just show the schedule details without the assign button
      setSelectedSchedule(scheduleStatus.schedule);
      setShowScheduleOptionsModal(true);
    }
  };

  // Fetch data on mount
  useEffect(() => {
    if (user?.id) {
      fetchBusinessSchedules();
      fetchStaffAssignments();
    }
  }, [user?.id]);

  // Calendar View Component
  const CalendarView = () => {
    const days = getDaysInMonth(currentMonth);
    
    return (
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
          <TouchableOpacity onPress={() => setCurrentMonth(new Date())} className="px-2 py-1 bg-pink-50 rounded-lg">
            <Text className="text-xs text-pink-600">Today</Text>
          </TouchableOpacity>
        </View>

        <View className="p-4">
          {/* Week Days Header */}
          <View className="flex-row mb-2">
            {weekDays.map((day, index) => (
              <View key={index} className="flex-1 items-center py-2">
                <Text className="text-gray-500 text-xs font-medium">{day}</Text>
              </View>
            ))}
          </View>
          
          {/* Calendar Grid */}
          <View className="flex-row flex-wrap">
            {days.map((date, index) => {
              if (!date) {
                return <View key={`empty-${index}`} className="w-[14.28%] aspect-square p-1" />;
              }
              
              const dateUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
              const todayUTC = new Date(Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()));
              const isTodayDate = dateUTC.getTime() === todayUTC.getTime();
              const isPast = dateUTC < todayUTC;
              const scheduleStatus = getScheduleStatus(date);
              
              let cellBgColor = 'bg-gray-50';
              let indicatorColor = null;
              let indicatorText = null;
              const dayNumber = date.getUTCDate();
              
              if (!isPast) {
                if (scheduleStatus.status === 'open') {
                  cellBgColor = 'bg-green-50';
                  indicatorColor = 'bg-green-500';
                  if (scheduleStatus.isAssigned) {
                    indicatorText = '✓';
                  }
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
                  disabled={isPast || scheduleStatus.status === 'closed' || scheduleStatus.status === 'no_schedule'}
                >
                  <View className={`flex-1 items-center justify-center rounded-full ${cellBgColor}`}>
                    <Text className={`text-sm ${
                      isTodayDate ? 'text-pink-600 font-bold' : 
                      isPast ? 'text-gray-400' : 
                      scheduleStatus.status === 'open' ? 'text-green-700' :
                      scheduleStatus.status === 'closed' ? 'text-red-700' :
                      'text-gray-500'
                    }`}>
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
    );
  };

  // Schedule Options Modal - Removed assign button
  const ScheduleOptionsModal = () => {
    if (!selectedSchedule) return null;
    
    const isAssigned = isStaffAssignedToSchedule(selectedSchedule.id);
    const assignment = getAssignmentForSchedule(selectedSchedule.id);
    
    return (
      <Modal
        animationType="slide"
        transparent={true}
        visible={showScheduleOptionsModal}
        onRequestClose={() => {
          setShowScheduleOptionsModal(false);
          setSelectedSchedule(null);
        }}
      >
        <View className="flex-1 justify-center items-center bg-black/50">
          <View className="bg-white rounded-2xl w-full max-w-md mx-4 overflow-hidden">
            <View className="bg-pink-600 px-6 py-4 flex-row justify-between items-center">
              <Text className="text-xl font-bold text-white">Schedule Details</Text>
              <TouchableOpacity onPress={() => {
                setShowScheduleOptionsModal(false);
                setSelectedSchedule(null);
              }}>
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
                onPress={() => {
                  setShowScheduleOptionsModal(false);
                  setSelectedSchedule(null);
                }}
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

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false} 
      className="flex-1"
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#ec4899']} />
      }
    >
      <View className="px-5 pt-6">
        <Text className="text-3xl font-bold text-gray-800 mb-2">Work Schedule</Text>
        <Text className="text-gray-500 mb-6">View and manage your work days</Text>
        
        {/* Calendar */}
        <CalendarView />
        
        {/* Legend */}
        <View className="flex-row justify-around mt-4 mb-6 pb-3 border-b border-gray-100 flex-wrap gap-2">
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
        
        {/* Your Assigned Schedules */}
        <Text className="text-lg font-bold text-gray-800 mb-3">Your Assigned Days</Text>
        {staffAssignments.filter(a => a.staff_id === user?.id).length === 0 ? (
          <View className="bg-white rounded-2xl p-8 items-center">
            <Ionicons name="calendar-outline" size={40} color="#d1d5db" />
            <Text className="text-gray-400 mt-2 text-center">No assigned work days yet</Text>
            <Text className="text-gray-400 text-xs text-center mt-1">
              Check back later for your schedule
            </Text>
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

      {/* Schedule Options Modal */}
      <ScheduleOptionsModal />
    </ScrollView>
  );
}