import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, LogIn, Crown, Shield } from 'lucide-react';
import { useAuth } from "../contexts/auth-context";

function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLocalLoading, setIsLocalLoading] = useState(false);
  const { login } = useAuth();
  
  const navigate = useNavigate(); 
  const handleLogin = async (e) => {
  e.preventDefault();
  
  if (!email || !password) {
    alert("Please enter email and password");
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    alert("Please enter a valid email address");
    return;
  }
  
  setIsLocalLoading(true);

  try {
    console.log("1. Calling login API...");
    await login({ email, password });
    console.log("2. Login API completed");

    console.log("3. Checking for user data...");
    let currentUser = useAuth.getState().user;
    console.log("Initial user:", currentUser);
    
    let retries = 0;
    while (!currentUser && retries < 10) {
      await new Promise(resolve => setTimeout(resolve, 500));
      currentUser = useAuth.getState().user;
      retries++;
      console.log(`Waiting for user data... attempt ${retries}, user:`, currentUser);
    }

    console.log("4. Final user after polling:", currentUser);

    if (currentUser) {
      console.log("5. User role:", currentUser.role);
      console.log("6. User full data:", currentUser);
      
      if (currentUser.role === 'admin' || currentUser.role === 'owner') {
        console.log("7. Access granted, navigating to dashboard...");
        navigate('/dashboard');
      } else {
        console.log("7. Access denied - role is:", currentUser.role);
        alert("Access Denied. Owner Access Only.");
        await useAuth.getState().logout();
      }
    } else {
      console.log("5. No user found after login");
      alert("Login Failed: Unable to Fetch User Information");
    }

  } catch (error) {
    console.error("Login error:", error);
    let errorMessage = "Invalid Email or Password";
    if (error.response?.data?.message) {
      errorMessage = error.response.data.message;
    } else if (error.message) {
      errorMessage = error.message;
    }
    alert(errorMessage);
  } finally {
    setIsLocalLoading(false);
  }
};

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex">
      {/* Left Side - Branding Section */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-pink-600 to-pink-800 relative overflow-hidden">
        <div className="absolute top-10 left-10 opacity-20">
          <div className="text-6xl">✂️</div>
        </div>
        <div className="absolute bottom-10 right-10 opacity-20">
          <div className="text-6xl">✨</div>
        </div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-10">
          <Crown size={200} className="text-white" />
        </div>
        
        <div className="relative z-10 flex flex-col justify-center items-center text-white p-12">
          <div className="max-w-md text-center">
            <div className="mb-8 flex justify-center">
              <div className="bg-white/20 p-4 rounded-2xl backdrop-blur-sm">
                <Crown size={48} className="text-white" />
              </div>
            </div>
            <h1 className="text-5xl font-bold mb-4">Owner Portal</h1>
            <p className="text-xl text-pink-100 mb-6">Reshel Oco Hair Salon</p>
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

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-8">
            <div className="inline-block bg-pink-500 p-3 rounded-2xl mb-4">
              <Crown size={32} className="text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Owner Portal</h2>
            <p className="text-gray-500 text-sm mt-1">Reshel Oco Hair Salon</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-800">Welcome Back</h3>
              <p className="text-gray-500 text-sm mt-2">Please enter your credentials to access the owner dashboard</p>
            </div>

            <form onSubmit={(e) => handleLogin(e)}>

              <div className="mb-6">
                <label className="block text-gray-700 text-sm font-semibold mb-2">
                  Email Address
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
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
                    <Lock className="text-gray-400 group-focus-within:text-pink-500 transition-colors" size={20} />
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
                className="w-full bg-gradient-to-r from-pink-500 to-pink-600 text-white text-base font-semibold py-3 rounded-lg hover:from-pink-600 hover:to-pink-700 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg"
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
            <p className="text-gray-400 text-xs">© 2024 Reshel Oco Hair Salon. All rights reserved.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;