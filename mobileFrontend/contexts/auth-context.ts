import axios from "@/api/axios";
import { setToken } from "@/services/auth-storage";
import { create } from "zustand";

interface User {
  id?: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  created_at?: string;
}

interface LoginData {
  email: string;
  password: string;
}

interface RegisterData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  password_confirmation: string;
  phone_number: string;
  role: string;
}

interface Appointment {
  id: number;
  customer_id: number;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service_status: string;
  service_name: string;
  duration_minutes: number;
  price: string;
  assigned_employee_id?: number;
  stylist_name?: string;
}

interface Transaction {
  id: number;
  appointment_id: number;
  customer_id: number;
  service_id: number;
  assigned_employee_id?: number;
  total_amount: number;
  payment_type: string;
  payment_method: string;
  status: string;
  created_at: string;
  updated_at: string;
  appointment?: {
    id: number;
    appointment_date: string;
    appointment_time: string;
    status: string;
    service_status: string;
    service_name: string;
    duration_minutes: number;
    price: string;
    assigned_employee_id?: number;
  };
  service?: {
    id: number;
    service_name: string;
    description: string;
    price: number;
    duration_minutes: number;
  };
  assigned_employee?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
  };
}

interface StaffAppointment {
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
}

interface Services {
  id: number;
  service_name: string;
  description: string;
  price: number;
  duration_minutes: number;
  service_status?: string;
  is_multitaskable: number;
  service_specialties?: any[];
  created_at?: string;
  updated_at?: string;
}

interface StaffMember {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  role: string;
  profile_image?: string;
  staff_specialties: Array<{
    id: number;
    staff_id: number;
    specialty_id: number;
    is_active: number;
    specialties?: {
      id: number;
      specialty_name: string;
    };
  }>;
}

interface Feedback {
  id: number;
  customer_id: number;
  appointment_id: number;
  rating: number;
  comments: string;
  created_at?: string;
  updated_at?: string;
  customer_name?: string;
  service_name?: string;
}

interface StaffFeedback {
  id: number;
  staff_id: number;
  rating: number;
}

interface SubmitStaffFeedbackData {
  staff_id: number;
  customer_id: number;
  rating: number;
  comments: string;
}

interface BookingData {
  customer_id: number;
  appointment_date: string;
  status: string;
  service_id: number;
  service_status: string;
}

interface PaymentData {
  appointment_id: number;
  total_amount: number;
  payment_type: string;
  payment_method: string;
}

interface Earnings {
  total: number;
  thisMonth: number;
  today: number;
}

interface UpdateAppointmentData {
  appointment_time?: string;
  staff_id?: number;
  status?: string;
  service_status?: string;
  notes?: string;
}

interface SubmitFeedbackData {
  appointment_id: number;
  customer_id: number;
  rating: number;
  comments: string;
}

interface UpdatePasswordData {
  current_password: string;
  new_password: string;
  new_password_confirmation: string;
}

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
    email: string;
    phone_number: string;
    profile_image?: string;
    staff_specialties?: Array<{
      id: number;
      staff_id: number;
      specialty_id: number;
      is_active: number;
      specialties?: {
        id: number;
        specialty_name: string;
      };
    }>;
  };
  business_schedules?: BusinessSchedule;
}

interface AuthState {
  user: User | null;
  appointments: Appointment[];
  transactions: Transaction[];
  staffAppointments: StaffAppointment[];
  services: Services[];
  staff: StaffMember[];
  serviceSpecialties: any[];
  feedbacks: Feedback[];
  staffFeedbacks: StaffFeedback[];
  businessSchedules: BusinessSchedule[];
  staffAssignments: StaffAssignment[];
  isLoading: boolean;
  
  // User methods
  getUser: () => Promise<void>;
  login: (data: LoginData) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  updatePassword: (id: number, data: UpdatePasswordData) => Promise<void>;
  
  // Customer appointment methods
  fetchUserAppointments: () => Promise<Appointment[]>;
  fetchUserTransactions: () => Promise<Transaction[]>;
  getUpcomingAppointments: () => Appointment[];
  getCompletedAppointments: () => Appointment[];
  getTotalSpent: () => number;
  getAppointmentsCount: () => number;
  
  // Staff appointment methods
  fetchStaffAppointments: () => Promise<StaffAppointment[]>;
  getTodayStaffAppointments: () => StaffAppointment[];
  getUpcomingStaffAppointments: () => StaffAppointment[];
  getStaffEarnings: () => Earnings;
  updateServiceStatus: (transactionId: number, status: string) => Promise<void>;
  
  // Service methods
  fetchServices: () => Promise<Services[]>;
  getActiveServices: () => Services[];
  getServiceById: (id: number) => Services | undefined;
  getTotalServices: () => number;
  
  // Staff methods
  fetchStaff: () => Promise<StaffMember[]>;
  getStaffBySpecialty: (specialtyName: string) => StaffMember[];
  
  // Service Specialty methods
  fetchServiceSpecialties: () => Promise<any[]>;
  getServiceSpecialties: (serviceId: number) => any[];
  
  // Feedback methods
  fetchFeedbacks: () => Promise<Feedback[]>;
  submitFeedback: (data: SubmitFeedbackData) => Promise<any>;
  getFeedbacksForAppointment: (appointmentId: number) => Feedback[];
  
  // Staff Feedback methods
  fetchStaffFeedbacks: () => Promise<StaffFeedback[]>;
  getStaffFeedbacks: (staffId: number) => StaffFeedback[];
  getAverageStaffRating: (staffId: number) => number;
  submitStaffFeedback: (data: SubmitStaffFeedbackData) => Promise<any>;
  
  // Booking methods
  bookAppointment: (data: BookingData) => Promise<{ appointment_id: number }>;
  addPayment: (data: PaymentData) => Promise<void>;
  completeBooking: (data: any) => Promise<any>;
  
  // Update appointment
  updateAppointment: (id: number, data: UpdateAppointmentData) => Promise<void>;

  //complete appointment/transaction
  completeService: (transactionId: number) => Promise<void>;
  updateServiceWithInventory: (transactionId: number, data: any) => Promise<void>;

  // Business Schedule methods
  fetchBusinessSchedules: () => Promise<BusinessSchedule[]>;
  getBusinessScheduleByDate: (date: string) => BusinessSchedule | undefined;
  
  // Staff Assignment methods
  fetchStaffAssignments: () => Promise<StaffAssignment[]>;
  getStaffAssignmentsByDate: (date: string) => StaffAssignment[];
  getStaffByDateAndSpecialty: (date: string, specialtyName: string) => StaffMember[];
}

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  appointments: [],
  transactions: [],
  staffAppointments: [],
  services: [],
  staff: [],
  serviceSpecialties: [],
  feedbacks: [],
  staffFeedbacks: [],
  businessSchedules: [],
  staffAssignments: [],
  isLoading: false,

  getUser: async () => {
    try {
      const { data } = await axios.get("/user");
      console.log("User data fetched:", data);
      set({ user: data });
    } catch (error) {
      console.log("Get user error:", error);
    }
  },

  login: async (data) => {
    try {
      const response = await axios.post("/login", data);
      await setToken(response.data.token);
      await get().getUser();
      
      // Fetch appropriate data based on user role
      const user = get().user;
      if (user?.role === 'staff') {
        await get().fetchStaffAppointments();
      } else {
        await get().fetchUserAppointments();
        await get().fetchUserTransactions();
      }
      await get().fetchServices();
      await get().fetchStaff();
      await get().fetchServiceSpecialties();
      await get().fetchFeedbacks();
      await get().fetchStaffFeedbacks();
      await get().fetchBusinessSchedules();
      await get().fetchStaffAssignments();
    } catch (error) {
      console.log("Login error:", error);
      throw error;
    }
  },

  register: async (data) => {
    try {
      const response = await axios.post("/register", data);
      await setToken(response.data.token);
      await get().getUser();
    } catch (error) {
      console.log("Register error:", error);
      throw error;
    }
  },

  logout: async () => {
    try {
      await axios.post("/logout");
      await setToken(null);
      set({ 
        user: null, 
        appointments: [], 
        transactions: [],
        staffAppointments: [], 
        services: [], 
        staff: [], 
        serviceSpecialties: [], 
        feedbacks: [],
        staffFeedbacks: [],
        businessSchedules: [],
        staffAssignments: []
      });
    } catch (error) {
      console.log("Logout error:", error);
    }
  },

  updatePassword: async (id: number, data: UpdatePasswordData) => {
    try {
      const response = await axios.post(`/user/${id}/password`, {
        current_password: data.current_password,
        new_password: data.new_password,
        new_password_confirmation: data.new_password_confirmation
      });
      console.log("Password updated successfully:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error updating password:", error);
      throw error;
    }
  },

  // Customer appointment methods
  fetchUserAppointments: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get("/appointments");
      console.log("Raw appointments response:", response.data);
      
      let appointmentsData: Appointment[] = [];
      if (Array.isArray(response.data)) {
        appointmentsData = response.data.map((item: any) => ({
          id: item.id,
          customer_id: item.customer_id,
          appointment_date: item.appointment_date,
          appointment_time: item.appointment_time,
          status: item.status,
          service_status: item.service_status,
          service_name: item.service_name,
          duration_minutes: item.duration_minutes,
          price: item.price,
          assigned_employee_id: item.assigned_employee_id,
          stylist_name: item.stylist_name
        }));
      }
      
      console.log("Processed appointments data:", appointmentsData);
      set({ appointments: appointmentsData });
      return appointmentsData;
    } catch (error) {
      console.log("Error fetching appointments:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  fetchUserTransactions: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get("/transactions");
      console.log("Raw transactions response:", response.data);
      
      let transactionsData: Transaction[] = [];
      if (Array.isArray(response.data)) {
        transactionsData = response.data.map((item: any) => ({
          id: item.id,
          appointment_id: item.appointment_id,
          customer_id: item.customer_id,
          service_id: item.service_id,
          assigned_employee_id: item.assigned_employee_id,
          total_amount: parseFloat(item.total_amount) || 0,
          payment_type: item.payment_type,
          payment_method: item.payment_method,
          status: item.status,
          created_at: item.created_at,
          updated_at: item.updated_at,
          appointment: item.appointment,
          service: item.service,
          assigned_employee: item.assigned_employee
        }));
      }
      
      console.log("Processed transactions data:", transactionsData);
      set({ transactions: transactionsData });
      return transactionsData;
    } catch (error) {
      console.log("Error fetching transactions:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getUpcomingAppointments: () => {
    const { appointments } = get();
    const upcoming = appointments.filter((item) => {
      const status = item.status;
      return status === "pending" || status === "confirmed";
    });
    return upcoming;
  },

  getCompletedAppointments: () => {
    const { appointments } = get();
    return appointments.filter((item) => item.service_status === "completed");
  },

  getTotalSpent: () => {
    const { appointments } = get();
    return appointments
      .filter((item) => item.service_status === "completed")
      .reduce((sum, item) => sum + parseFloat(item.price || "0"), 0);
  },

  getAppointmentsCount: () => {
    const { appointments } = get();
    return appointments.length;
  },

  // Staff appointment methods
  fetchStaffAppointments: async () => {
    set({ isLoading: true });
    try {
      const user = get().user;
      if (!user?.id) {
        console.log("No user ID found");
        return [];
      }
      
      const response = await axios.get(`/staff/${user.id}/appointments`);
      console.log("Staff appointments response:", response.data);
      
      let appointmentsData: StaffAppointment[] = [];
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
      
      console.log("Processed staff appointments:", appointmentsData);
      set({ staffAppointments: appointmentsData });
      return appointmentsData;
    } catch (error) {
      console.log("Error fetching staff appointments:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getTodayStaffAppointments: () => {
    const { staffAppointments } = get();
    const today = new Date().toISOString().split('T')[0];
    return staffAppointments.filter(app => app.appointment_date === today);
  },

  getUpcomingStaffAppointments: () => {
    const { staffAppointments } = get();
    const today = new Date().toISOString().split('T')[0];
    return staffAppointments.filter(app => app.appointment_date > today);
  },

  getStaffEarnings: () => {
    const { staffAppointments } = get();
    const completedAppointments = staffAppointments.filter(
      app => app.service_status === 'completed'
    );
    
    const total = completedAppointments.reduce(
      (sum, app) => sum + parseFloat(app.price || "0"), 
      0
    );
    
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    
    const thisMonth = completedAppointments
      .filter(app => {
        const appDate = new Date(app.appointment_date);
        return appDate.getMonth() === currentMonth && 
               appDate.getFullYear() === currentYear;
      })
      .reduce((sum, app) => sum + parseFloat(app.price || "0"), 0);
    
    const today = new Date().toISOString().split('T')[0];
    const todayEarnings = completedAppointments
      .filter(app => app.appointment_date === today)
      .reduce((sum, app) => sum + parseFloat(app.price || "0"), 0);
    
    return { total, thisMonth, today: todayEarnings };
  },

  updateServiceStatus: async (transactionId: number, status: string) => {
    try {
      const response = await axios.put(`/staff/transaction/${transactionId}/status`, { 
        service_status: status 
      });
      console.log("Service status updated:", response.data);
      
      set(state => ({
        staffAppointments: state.staffAppointments.map(app =>
          app.transaction_id === transactionId
            ? { ...app, service_status: status }
            : app
        )
      }));
    } catch (error) {
      console.log("Error updating service status:", error);
      throw error;
    }
  },

  // Service methods
  fetchServices: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get("/services");
      console.log("Fetched services:", response.data);
      
      let servicesData: Services[] = [];
      if (Array.isArray(response.data)) {
        servicesData = response.data.map((service: any) => ({
          id: service.id,
          service_name: service.service_name,
          description: service.description,
          price: parseFloat(service.price),
          is_multitaskable: service.is_multitaskable,
          duration_minutes: service.duration_minutes,
          service_status: service.service_status,
          created_at: service.created_at,
          updated_at: service.updated_at,
        }));
      }
      
      set({ services: servicesData });
      return servicesData;
    } catch (error) {
      console.log("Error fetching services:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getActiveServices: () => {
    const { services } = get();
    return services.filter(service => service.service_status === 'active');
  },

  getServiceById: (id: number) => {
    const { services } = get();
    return services.find(service => service.id === id);
  },

  getTotalServices: () => {
    const { services } = get();
    return services.length;
  },

  // Staff methods
  fetchStaff: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get("/employee/specialties");
      console.log("Fetched staff with specialties:", response.data);
      
      let staffData: StaffMember[] = [];
      if (Array.isArray(response.data)) {
        staffData = response.data;
      }
      
      set({ staff: staffData });
      return staffData;
    } catch (error) {
      console.log("Error fetching staff:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getStaffBySpecialty: (specialtyName: string) => {
    const { staff } = get();
    return staff.filter(staffMember => {
      if (!staffMember.staff_specialties || staffMember.staff_specialties.length === 0) {
        return false;
      }
      return staffMember.staff_specialties.some(
        (specialty) => specialty.specialties?.specialty_name?.toLowerCase() === specialtyName.toLowerCase() && specialty.is_active === 1
      );
    });
  },

  // Service Specialty methods
  fetchServiceSpecialties: async () => {
    try {
      const response = await axios.get("/services/specialties");
      console.log("Fetched service specialties:", response.data);
      
      let specialtiesData: any[] = [];
      if (Array.isArray(response.data)) {
        specialtiesData = response.data;
      }
      
      set({ serviceSpecialties: specialtiesData });
      return specialtiesData;
    } catch (error) {
      console.log("Error fetching service specialties:", error);
      return [];
    }
  },

  getServiceSpecialties: (serviceId: number) => {
    const { serviceSpecialties } = get();
    return serviceSpecialties.filter(item => item.service_id === serviceId);
  },

  // Feedback methods
  fetchFeedbacks: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get("/feedbacks");
      console.log("Fetched feedbacks:", response.data);
      
      let feedbacksData: Feedback[] = [];
      if (Array.isArray(response.data)) {
        feedbacksData = response.data;
      }
      
      set({ feedbacks: feedbacksData });
      return feedbacksData;
    } catch (error) {
      console.log("Error fetching feedbacks:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  submitFeedback: async (data: SubmitFeedbackData) => {
    try {
      const response = await axios.post("/feedbacks/submit", {
        appointment_id: data.appointment_id,
        customer_id: data.customer_id,
        rating: data.rating,
        comments: data.comments
      });
      console.log("Feedback submitted:", response.data);
      
      await get().fetchFeedbacks();
      
      return response.data;
    } catch (error) {
      console.log("Error submitting feedback:", error);
      throw error;
    }
  },

  getFeedbacksForAppointment: (appointmentId: number) => {
    const { feedbacks } = get();
    return feedbacks.filter(feedback => feedback.appointment_id === appointmentId);
  },

  // Staff Feedback methods
  fetchStaffFeedbacks: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get("/feedbacks/staff");
      console.log("Raw staff feedbacks response:", response.data);
      
      let staffFeedbacksData: StaffFeedback[] = [];
      if (Array.isArray(response.data)) {
        staffFeedbacksData = response.data.map((item: any) => ({
          id: item.id || 0,
          staff_id: item.staff_id || 0,
          rating: parseFloat(item.rating) || 0
        }));
      }
      
      console.log("Processed staff feedbacks:", staffFeedbacksData);
      set({ staffFeedbacks: staffFeedbacksData });
      return staffFeedbacksData;
    } catch (error) {
      console.log("Error fetching staff feedbacks:", error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getStaffFeedbacks: (staffId: number) => {
    const { staffFeedbacks } = get();
    return staffFeedbacks.filter(feedback => feedback.staff_id === staffId);
  },

  getAverageStaffRating: (staffId: number) => {
    const { staffFeedbacks } = get();
    console.log(`Calculating average for staff ${staffId}`);
    console.log(`Total feedbacks: ${staffFeedbacks.length}`);
    
    const staffReviews = staffFeedbacks.filter(feedback => feedback.staff_id === staffId);
    console.log(`Found ${staffReviews.length} reviews for staff ${staffId}`);
    
    if (staffReviews.length === 0) return 0;
    
    const total = staffReviews.reduce((sum, feedback) => {
      const rating = typeof feedback.rating === 'number' ? feedback.rating : parseFloat(feedback.rating as any) || 0;
      return sum + rating;
    }, 0);
    
    const average = total / staffReviews.length;
    const roundedAverage = parseFloat(average.toFixed(1));
    console.log(`Average for staff ${staffId}: ${roundedAverage}`);
    return roundedAverage;
  },

  submitStaffFeedback: async (data: SubmitStaffFeedbackData) => {
    try {
      const response = await axios.post("/feedbacks/staff/submit", {
        staff_id: data.staff_id,
        customer_id: data.customer_id,
        rating: data.rating,
        comments: data.comments
      });
      console.log("Staff feedback submitted:", response.data);
      
      await get().fetchStaffFeedbacks();
      
      return response.data;
    } catch (error) {
      console.log("Error submitting staff feedback:", error);
      throw error;
    }
  },

  // Booking methods
  bookAppointment: async (data: BookingData) => {
    try {
      const response = await axios.post("/appointments/add", data);
      console.log("Appointment booked:", response.data);
      return { appointment_id: response.data.appointment_id };
    } catch (error) {
      console.log("Error booking appointment:", error);
      throw error;
    }
  },

  addPayment: async (data: PaymentData) => {
    try {
      const response = await axios.post("/payment/add", data);
      console.log("Payment added:", response.data);
    } catch (error) {
      console.log("Error adding payment:", error);
      throw error;
    }
  },

  completeBooking: async (data) => {
    try {
      const response = await axios.post("/booking/complete", data);
      console.log("Booking completed:", response.data);
      return response.data;
    } catch (error) {
      console.log("Error completing booking:", error);
      throw error;
    }
  },

  // Update appointment
  updateAppointment: async (id: number, data: UpdateAppointmentData) => {
    try {
      const response = await axios.put(`/appointments/update/${id}`, data);
      console.log("Appointment updated:", response.data);
      
      const user = get().user;
      if (user?.role === 'staff') {
        await get().fetchStaffAppointments();
      } else {
        await get().fetchUserAppointments();
      }
    } catch (error) {
      console.log("Error updating appointment:", error);
      throw error;
    }
  },

  completeService: async (transactionId: number) => {
    try {
      const response = await axios.put(`/staff/transaction/${transactionId}/complete`, {
        service_status: 'completed'
      });
      console.log("Service completed:", response.data);
      await get().fetchStaffAppointments();
    } catch (error) {
      console.log("Error completing service:", error);
      throw error;
    }
  },

  updateServiceWithInventory: async (transactionId: number, data: any) => {
    try {
      const response = await axios.put(`/staff/transaction/${transactionId}/update`, data);
      console.log("Service updated:", response.data);
      await get().fetchStaffAppointments();
      return response.data;
    } catch (error) {
      console.log("Error updating service:", error);
      throw error;
    }
  },

  // Business Schedule methods
  fetchBusinessSchedules: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get('/daysched');
      console.log('Fetched business schedules:', response.data);
      let schedulesData: BusinessSchedule[] = [];
      if (Array.isArray(response.data)) {
        schedulesData = response.data;
      }
      set({ businessSchedules: schedulesData });
      return schedulesData;
    } catch (error) {
      console.error('Error fetching business schedules:', error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getBusinessScheduleByDate: (date: string) => {
    const { businessSchedules } = get();
    return businessSchedules.find(schedule => schedule.business_date === date);
  },

  // Staff Assignment methods
  fetchStaffAssignments: async () => {
    set({ isLoading: true });
    try {
      const response = await axios.get('/assign');
      console.log('Fetched staff assignments:', response.data);
      let assignmentsData: StaffAssignment[] = [];
      if (Array.isArray(response.data)) {
        assignmentsData = response.data;
      }
      set({ staffAssignments: assignmentsData });
      return assignmentsData;
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
      return [];
    } finally {
      set({ isLoading: false });
    }
  },

  getStaffAssignmentsByDate: (date: string) => {
    const { staffAssignments, businessSchedules } = get();
    const schedule = businessSchedules.find(s => s.business_date === date);
    if (!schedule) return [];
    return staffAssignments.filter(assignment => assignment.business_date_id === schedule.id);
  },

  getStaffByDateAndSpecialty: (date: string, specialtyName: string) => {
    const { staff, staffAssignments, businessSchedules } = get();
    
    const schedule = businessSchedules.find(s => s.business_date === date);
    if (!schedule) return [];
    
    const assignments = staffAssignments.filter(
      assignment => assignment.business_date_id === schedule.id
    );
    
    const staffIds = assignments.map(a => a.staff_id);
    
    return staff.filter(staffMember => {
      if (!staffIds.includes(staffMember.id)) return false;
      
      if (!specialtyName) return true;
      
      return staffMember.staff_specialties?.some(
        (specialty) => 
          specialty.specialties?.specialty_name?.toLowerCase() === specialtyName.toLowerCase() &&
          specialty.is_active === 1
      ) || false;
    });
  }
}));