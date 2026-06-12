import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  LayoutDashboard, Users, UserCheck, BookOpen,
  Calendar, Receipt, Bell, Settings, LogOut, FileText,
  ChevronRight, Menu, X, Layers, Sun, Moon
} from "lucide-react";
import { useState } from "react";

const navItems = [
  { to: "/dashboard",    icon: LayoutDashboard, label: "Dashboard",      roles: ["admin","headmaster","teacher","bursar","secretary"] },
  { to: "/setup",        icon: Layers,          label: "Academic Setup", roles: ["admin","headmaster"] },
  { to: "/students",     icon: Users,           label: "Students",       roles: ["admin","headmaster","secretary","teacher"] },
  { to: "/staff",        icon: UserCheck,       label: "Staff",          roles: ["admin","headmaster"] },
  { to: "/grades",       icon: BookOpen,        label: "Grades",         roles: ["admin","headmaster","teacher"] },
  { to: "/report-cards", icon: FileText,        label: "Report Cards",   roles: ["admin","headmaster","teacher"] },
  { to: "/attendance",   icon: Calendar,        label: "Attendance",     roles: ["admin","headmaster","teacher"] },
  { to: "/fees",         icon: Receipt,         label: "Fees",           roles: ["admin","headmaster","bursar"] },
  { to: "/settings",     icon: Settings,        label: "Settings",       roles: ["admin","headmaster","teacher","bursar","secretary"] },
];

const roleColors = {
  admin:      "#e63946",
  headmaster: "#f5a623",
  teacher:    "#3b82f6",
  bursar:     "#8b5cf6",
  secretary:  "#06b6d4",
};

export default function Sidebar() {
  const { profile, theme, setTheme, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const role    = profile?.role || "teacher";
  const allowed = navItems.filter(n => n.roles.includes(role));

  const inner = (
    <div className="flex flex-col h-full">

      {/* Logo */}
      <div className="flex flex-col items-center px-4 py-5 border-b border-white/10">
        <img src="/logo_ma.png" alt="MARELI Academy"
          className="w-16 h-16 object-contain mb-2 drop-shadow-md" />
        <div className="text-center">
          <div className="text-white font-display font-bold text-xs leading-tight">Ss. Mary & Elizabeth</div>
          <div className="text-green-300 text-xs">N&P Academy · Buea</div>
        </div>
      </div>

      {/* User card */}
      <NavLink to="/settings" onClick={() => setOpen(false)}
        className="mx-3 my-3 p-3 rounded-2xl bg-white/10 border border-white/10 hover:bg-white/20 transition-colors">
        <div className="flex items-center gap-2">
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name}
              className="w-9 h-9 rounded-full object-cover border-2 border-white/30 flex-shrink-0"/>
          ) : (
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
              style={{ backgroundColor: roleColors[role] || "#1a6b3c" }}>
              {(profile?.full_name || "U").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="text-white text-xs font-semibold truncate">{profile?.full_name || "User"}</div>
            <div className="text-green-300 text-xs capitalize">{role}</div>
          </div>
          <Settings size={13} className="text-white/40 flex-shrink-0"/>
        </div>
      </NavLink>

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto pb-2">
        {allowed.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group
               ${isActive ? "bg-white/20 text-white shadow-sm" : "text-green-200 hover:bg-white/10 hover:text-white"}`}>
            <Icon size={17} className="flex-shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={13} className="opacity-0 group-hover:opacity-50 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-white/10 space-y-1">
        {/* Theme toggle */}
        <button onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-green-200 hover:bg-white/10 hover:text-white transition-all w-full">
          {theme === "dark"
            ? <><Sun size={17}/> Light mode</>
            : <><Moon size={17}/> Dark mode</>}
        </button>
        <button onClick={() => { signOut(); navigate("/login"); }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
                     text-green-200 hover:bg-red-500/20 hover:text-red-300 transition-all w-full">
          <LogOut size={17}/> Sign out
        </button>
        <p className="text-center text-xs text-green-400/50 mt-1">© {new Date().getFullYear()} MARELI Academy</p>
      </div>
    </div>
  );

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-primary text-white p-2 rounded-xl shadow-lg">
        <Menu size={20}/>
      </button>
      {open && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 flex flex-col"
            style={{ background:"linear-gradient(180deg,#0f4526 0%,#1a6b3c 100%)" }}
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setOpen(false)} className="absolute top-4 right-4 text-white/60 hover:text-white">
              <X size={20}/>
            </button>
            {inner}
          </div>
        </div>
      )}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen flex-shrink-0"
        style={{ background:"linear-gradient(180deg,#0f4526 0%,#1a6b3c 100%)" }}>
        {inner}
      </aside>
    </>
  );
}
