import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail, Lock, Eye, EyeOff, LogIn, Shield,
  CheckCircle, XCircle, AlertCircle, X
} from 'lucide-react';
import { useAuth } from "../contexts/auth-context";
import ROHSLogo from "/src/assets/ROHS Logo.png";

function Toast({ message, type = 'info', onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, [onClose]);

  const bgColor =
    type === 'success' ? 'bg-green-500' :
    type === 'warning' ? 'bg-yellow-500' :
    type === 'error'   ? 'bg-red-500' :
                         'bg-pink-500';

  const Icon =
    type === 'success' ? CheckCircle :
    type === 'warning' ? AlertCircle :
    type === 'error'   ? XCircle :
                         AlertCircle;

  return (
    <div className="fixed top-4 right-4 z-[100] animate-slide-in">
      <div
        className={`rounded-lg shadow-lg p-4 flex items-center gap-3 ${bgColor} text-white min-w-[300px] max-w-md`}
      >
        <Icon size={20} className="flex-shrink-0" />
        <span className="text-sm font-medium flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto hover:bg-white/20 rounded-lg p-1 flex-shrink-0"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const showToast = useCallback((message, type = 'info') => {
    setToast({ message, type });
  }, []);

  const hideToast = useCallback(() => setToast(null), []);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      showToast("Please enter email and password", "warning");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast("Please enter a valid email address", "warning");
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
        if (currentUser.role === 'admin' || currentUser.role === 'owner') {
          // Full page reload so Echo initializes with the fresh token
          setTimeout(() => {
            window.location.href = '/dashboard';
          }, 600);
        } else {
          showToast("Access Denied. Owner access only.", "error");
          await useAuth.getState().logout();
        }
      } else {
        showToast("Login failed: unable to fetch user information.", "error");
      }
    } catch (error) {
      let errorMessage = "Invalid email or password.";
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      showToast(errorMessage, "error");
    } finally {
      setIsLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}

      {/* ── Left Panel (desktop) — Logo hero ── */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pink-600 to-pink-800 relative overflow-hidden">
        {/* Soft decorative glow behind the logo */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] bg-white/10 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12 w-full">
          <div className="max-w-md text-center">
            {/* ✅ Logo hero */}
            <div className="mb-8 flex justify-center">
              <div className="bg-white rounded-3xl p-6 shadow-2xl">
                <img
                  src={ROHSLogo}
                  alt="Reshel Oco Hair Salon"
                  className="w-56 h-56 object-contain"
                />
              </div>
            </div>

            <h1 className="text-4xl font-bold mb-3 tracking-tight">
              Owner Portal
            </h1>
            <p className="text-pink-100 text-lg mb-6">
              Reshel Oco Hair Salon
            </p>

            <div className="border-t border-white/20 pt-6 mt-6">
              <p className="text-pink-100 text-sm">
                Secure access for salon administrators only
              </p>
              <div className="flex items-center justify-center mt-4 space-x-2">
                <Shield size={16} className="text-pink-200" />
                <span className="text-pink-200 text-xs">Super Admin Access</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Right Panel — Login form ── */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* ✅ Mobile-only logo header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block bg-white p-4 rounded-2xl mb-4 shadow-lg">
              <img
                src={ROHSLogo}
                alt="Reshel Oco Hair Salon"
                className="w-32 h-32 object-contain"
              />
            </div>
            <h2 className="text-2xl font-bold text-white">Owner Portal</h2>
            <p className="text-gray-400 text-sm mt-1">Reshel Oco Hair Salon</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-800">Welcome Back</h3>
              <p className="text-gray-500 text-sm mt-2">
                Please enter your credentials to access the owner dashboard
              </p>
            </div>

            <form onSubmit={handleLogin}>
              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail
                      className="text-gray-400 group-focus-within:text-pink-500 transition-colors"
                      size={20}
                    />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 transition-all duration-200"
                    placeholder="owner@reshelsalon.com"
                  />
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock
                      className="text-gray-400 group-focus-within:text-pink-500 transition-colors"
                      size={20}
                    />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent bg-gray-50 transition-all duration-200"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLocalLoading}
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white text-base font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg disabled:opacity-60"
              >
                {isLocalLoading ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <LogIn size={18} />
                    Sign In to Owner Portal
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 p-4 bg-pink-50 rounded-lg border border-pink-100">
              <div className="flex items-start gap-3">
                <Shield size={18} className="text-pink-500" />
                <div className="text-xs text-pink-700">
                  <p className="font-semibold mb-1">Super Administrator Access</p>
                  <p>This portal is restricted to salon owners only.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center mt-6">
            <p className="text-gray-400 text-xs">
              © 2024 Reshel Oco Hair Salon. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;