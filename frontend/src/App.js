import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { ThemeProvider } from "@/components/ThemeProvider";

// Pages
import LoginPage from "@/pages/LoginPage";
import DashboardLayout from "@/components/DashboardLayout";
import DashboardPage from "@/pages/DashboardPage";
import WorkersPage from "@/pages/WorkersPage";
import WorkerDetailPage from "@/pages/WorkerDetailPage";
import WorkerFormPage from "@/pages/WorkerFormPage";
import ProjectsPage from "@/pages/ProjectsPage";
import ProjectDetailPage from "@/pages/ProjectDetailPage";
import ProjectFormPage from "@/pages/ProjectFormPage";
import SettingsPage from "@/pages/SettingsPage";
import AdminPage from "@/pages/AdminPage";
import WorkerImportPage from "@/pages/WorkerImportPage";
import CalendarPage from "@/pages/CalendarPage";
import NotificationsPage from "@/pages/NotificationsPage";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const res = await axios.get(`${API}/auth/me`);
      setUser(res.data);
    } catch (e) {
      console.error("Auth error:", e);
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API}/auth/login`, { email, password });
      const { token: newToken, user: userData } = res.data;
      localStorage.setItem("token", newToken);
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      setToken(newToken);
      setUser(userData);
      toast.success("Sikeres bejelentkezés!");
      return true;
    } catch (e) {
      toast.error(e.response?.data?.detail || "Hibás bejelentkezési adatok");
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    delete axios.defaults.headers.common["Authorization"];
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout, fetchUser }}>
      {children}
    </AuthContext.Provider>
  );
};

// Protected Route
const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (adminOnly && user.role !== "admin") {
    return <Navigate to="/workers" replace />;
  }

  return children;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            
            <Route path="/" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="workers" element={<WorkersPage />} />
              <Route path="workers/new" element={<WorkerFormPage />} />
              <Route path="workers/import" element={<WorkerImportPage />} />
              <Route path="workers/:id" element={<WorkerDetailPage />} />
              <Route path="workers/:id/edit" element={<WorkerFormPage />} />
              <Route path="projects" element={<ProjectsPage />} />
              <Route path="projects/new" element={<ProjectFormPage />} />
              <Route path="projects/:id" element={<ProjectDetailPage />} />
              <Route path="projects/:id/edit" element={<ProjectFormPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="admin" element={
                <ProtectedRoute adminOnly>
                  <AdminPage />
                </ProtectedRoute>
              } />
            </Route>
            
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
          <Toaster position="top-right" richColors />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
