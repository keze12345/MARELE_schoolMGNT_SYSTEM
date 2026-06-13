import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Sidebar from "./components/layout/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Students from "./pages/Students";
import Attendance from "./pages/Attendance";
import Grades from "./pages/Grades";
import AcademicSetup from "./pages/AcademicSetup";
import Staff from "./pages/Staff";
import ReportCards from "./pages/ReportCards";
import Fees from "./pages/Fees";
import ParentPortal from "./pages/ParentPortal";
import Settings from "./pages/Settings";

function ProtectedLayout() {
  const { user, profile, loading } = useAuth();
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "#fdfaf5" }}>
      <div className="flex flex-col items-center gap-4">
        <img src="/logo_ma.png" alt="MARELI" className="w-16 h-16 object-contain animate-pulse"/>
        <p style={{ color:"#9ca3af", fontSize:14 }}>Loading...</p>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" replace />;
  // Redirect parents straight to their portal
  if (profile?.role === "parent" && window.location.pathname === "/dashboard") {
    return <Navigate to="/parent" replace />;
  }
  return (
    <div className="flex min-h-screen bg-surface dark:bg-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-auto"><Outlet /></main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ style: { borderRadius: "12px", fontSize: "14px" } }}/>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedLayout />}>
            <Route path="/dashboard"    element={<Dashboard />}     />
            <Route path="/students"     element={<Students />}      />
            <Route path="/staff"        element={<Staff />}         />
            <Route path="/attendance"   element={<Attendance />}    />
            <Route path="/grades"       element={<Grades />}        />
            <Route path="/setup"        element={<AcademicSetup />} />
            <Route path="/report-cards" element={<ReportCards />}   />
            <Route path="/settings"     element={<Settings />}      />
            <Route path="/fees"         element={<Fees />}          />
            <Route path="/parent"       element={<ParentPortal />}  />
            <Route path="*"             element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
export default App;
