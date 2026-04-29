import { useState } from "react";
import { useAuth } from "./AuthContext";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

export default function LoginPage({ onLogin = () => {} }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const { login } = useAuth();
  const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${backendUrl}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "omit", // Using token instead of cookies for this new flow
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      login(data.user, data.access_token, data.refresh_token, data.competition);
      onLogin(data.user?.role || 'admin');
      
      if (data.competition) {
        navigate("/dashboard");
      } else {
        navigate("/setup");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col items-center justify-center p-6 text-neutral-900 dark:text-neutral-100">
      <div className="max-w-sm w-full">
        <h1 className="text-2xl font-bold mb-6 text-center">Login</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input 
              type="email" 
              required
              className="w-full p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input 
              type="password" 
              required
              className="w-full p-3 bg-white dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 rounded-md focus:ring-2 focus:ring-blue-500 outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          
          <div className="flex flex-col space-y-3 pt-2">
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-md transition-colors"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
            <button 
              type="button"
              className="text-sm text-blue-600 dark:text-blue-400 font-medium w-full text-center hover:underline"
              onClick={() => navigate('/forgot-password')}
            >
              Forgot Password?
            </button>
          </div>
        </form>
        
        <div className="mt-8 text-center text-sm text-neutral-500">
          <Link to="/entry" className="text-blue-600 dark:text-blue-400 hover:underline">Back to Entry Options</Link>
        </div>
      </div>
    </div>
  );
}
