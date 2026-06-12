import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import { Camera, Loader2, Sun, Moon, User, Lock, Save, Check } from "lucide-react";
import toast from "react-hot-toast";

const roleLabel = {
  admin:      "System Administrator",
  headmaster: "Principal / Head Teacher",
  teacher:    "Teacher",
  bursar:     "Bursar",
  secretary:  "Secretary",
};

export default function Settings() {
  const { profile, theme, setTheme, updateProfile, user } = useAuth();
  const [activeTab, setActiveTab] = useState("profile");

  // Profile form
  const [fullName, setFullName]   = useState(profile?.full_name || "");
  const [phone,    setPhone]      = useState(profile?.phone || "");
  const [gender,   setGender]     = useState(profile?.gender || "");
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);

  // Avatar
  const [avatarUrl,     setAvatarUrl]     = useState(profile?.avatar_url || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarInputRef = useRef();

  // Password
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd,     setNewPwd]     = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [savingPwd,  setSavingPwd]  = useState(false);

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }

    setUploadingAvatar(true);
    const ext  = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars").upload(path, file, { upsert: true });

    if (upErr) { toast.error(upErr.message); setUploadingAvatar(false); return; }

    const { data: { publicUrl } } = supabase.storage.from("avatars").getPublicUrl(path);
    const url = `${publicUrl}?t=${Date.now()}`;
    setAvatarUrl(url);
    await updateProfile({ avatar_url: url });
    toast.success("Profile photo updated!");
    setUploadingAvatar(false);
  }

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSaving(true);
    const { error } = await updateProfile({ full_name: fullName, phone, gender });
    if (error) toast.error(error.message);
    else { toast.success("Profile saved!"); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (newPwd !== confirmPwd) { toast.error("Passwords do not match"); return; }
    if (newPwd.length < 8)     { toast.error("Password must be at least 8 characters"); return; }
    setSavingPwd(true);
    const { error } = await supabase.auth.updateUser({ password: newPwd });
    if (error) toast.error(error.message);
    else { toast.success("Password changed successfully!"); setCurrentPwd(""); setNewPwd(""); setConfirmPwd(""); }
    setSavingPwd(false);
  }

  const TABS = [
    { key:"profile",  label:"My Profile",  icon:User  },
    { key:"security", label:"Security",     icon:Lock  },
    { key:"theme",    label:"Appearance",   icon: theme === "dark" ? Moon : Sun },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      <div>
        <h1 className="text-2xl font-display font-bold text-gray-900 dark:text-white">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage your profile, security and appearance</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-100 dark:border-gray-700">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-all
              ${activeTab === key
                ? "border-primary text-primary"
                : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 hover:border-gray-200"}`}>
            <Icon size={15}/>
            {label}
          </button>
        ))}
      </div>

      {/* ── PROFILE TAB ── */}
      {activeTab === "profile" && (
        <div className="card dark:bg-gray-800 space-y-6">

          {/* Avatar */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarUrl ? (
                <img src={avatarUrl} alt={profile?.full_name}
                  className="w-24 h-24 rounded-2xl object-cover border-4 border-white dark:border-gray-700 shadow-md"/>
              ) : (
                <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-md"
                  style={{ background: profile?.gender === "female" ? "#e63946" : "#1a6b3c" }}>
                  {(profile?.full_name || "U").charAt(0).toUpperCase()}
                </div>
              )}
              <button onClick={() => avatarInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center shadow-md hover:bg-primary-light transition-colors">
                {uploadingAvatar ? <Loader2 size={14} className="animate-spin"/> : <Camera size={14}/>}
              </button>
              <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload}/>
            </div>
            <div>
              <div className="font-display font-bold text-gray-900 dark:text-white text-lg">{profile?.full_name}</div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{roleLabel[profile?.role] || profile?.role}</div>
              <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">{user?.email}</div>
              <button onClick={() => avatarInputRef.current?.click()}
                className="mt-2 text-xs text-primary hover:underline font-medium">
                Change photo
              </button>
            </div>
          </div>

          <hr className="border-gray-100 dark:border-gray-700"/>

          {/* Profile form */}
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full name</label>
              <input className="input" value={fullName} onChange={e => setFullName(e.target.value)}
                placeholder="Your full name"/>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone number</label>
                <input className="input" value={phone} onChange={e => setPhone(e.target.value)}
                  placeholder="e.g. 677 123 456"/>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Gender</label>
                <select className="input" value={gender} onChange={e => setGender(e.target.value)}>
                  <option value="">— Select —</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email address</label>
              <input className="input opacity-60 cursor-not-allowed" value={user?.email} disabled/>
              <p className="text-xs text-gray-400 mt-1">Email cannot be changed here.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
              <input className="input opacity-60 cursor-not-allowed"
                value={roleLabel[profile?.role] || profile?.role} disabled/>
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="btn-primary flex items-center gap-2">
                {saving  ? <><Loader2 size={14} className="animate-spin"/> Saving...</> :
                 saved   ? <><Check size={14}/> Saved!</> :
                           <><Save size={14}/> Save Profile</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── SECURITY TAB ── */}
      {activeTab === "security" && (
        <div className="card dark:bg-gray-800 space-y-4">
          <div>
            <h2 className="font-display font-semibold text-gray-900 dark:text-white">Change Password</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose a strong password of at least 8 characters.</p>
          </div>
          <hr className="border-gray-100 dark:border-gray-700"/>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New password</label>
              <input className="input" type="password" required minLength={8}
                placeholder="Min. 8 characters"
                value={newPwd} onChange={e => setNewPwd(e.target.value)}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm new password</label>
              <input className="input" type="password" required
                placeholder="Repeat new password"
                value={confirmPwd} onChange={e => setConfirmPwd(e.target.value)}/>
            </div>
            {newPwd && confirmPwd && newPwd !== confirmPwd && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
            <div className="flex justify-end">
              <button type="submit" disabled={savingPwd || (newPwd !== confirmPwd)}
                className="btn-primary flex items-center gap-2">
                {savingPwd ? <><Loader2 size={14} className="animate-spin"/> Changing...</> : <><Lock size={14}/> Change Password</>}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── THEME TAB ── */}
      {activeTab === "theme" && (
        <div className="card dark:bg-gray-800 space-y-6">
          <div>
            <h2 className="font-display font-semibold text-gray-900 dark:text-white">Appearance</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Choose how MARELI looks for you.</p>
          </div>
          <hr className="border-gray-100 dark:border-gray-700"/>
          <div className="grid grid-cols-2 gap-4">
            {/* Light */}
            <button onClick={() => setTheme("light")}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left
                ${theme === "light" ? "border-primary bg-green-50" : "border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}>
              {theme === "light" && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check size={11} className="text-white"/>
                </div>
              )}
              <div className="w-full h-24 rounded-xl bg-white border border-gray-200 mb-3 overflow-hidden shadow-sm">
                <div className="h-5 bg-green-700"/>
                <div className="p-2 space-y-1.5">
                  <div className="h-2 w-3/4 bg-gray-200 rounded"/>
                  <div className="h-2 w-1/2 bg-gray-100 rounded"/>
                  <div className="h-2 w-2/3 bg-gray-100 rounded"/>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Sun size={16} className="text-amber-500"/>
                <span className="font-semibold text-sm text-gray-800 dark:text-white">Light</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Clean and bright interface</p>
            </button>

            {/* Dark */}
            <button onClick={() => setTheme("dark")}
              className={`relative p-4 rounded-2xl border-2 transition-all text-left
                ${theme === "dark" ? "border-primary bg-green-900/20" : "border-gray-200 dark:border-gray-600 hover:border-gray-300"}`}>
              {theme === "dark" && (
                <div className="absolute top-3 right-3 w-5 h-5 bg-primary rounded-full flex items-center justify-center">
                  <Check size={11} className="text-white"/>
                </div>
              )}
              <div className="w-full h-24 rounded-xl bg-gray-900 border border-gray-700 mb-3 overflow-hidden shadow-sm">
                <div className="h-5 bg-green-900"/>
                <div className="p-2 space-y-1.5">
                  <div className="h-2 w-3/4 bg-gray-700 rounded"/>
                  <div className="h-2 w-1/2 bg-gray-800 rounded"/>
                  <div className="h-2 w-2/3 bg-gray-800 rounded"/>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Moon size={16} className="text-blue-400"/>
                <span className="font-semibold text-sm text-gray-800 dark:text-white">Dark</span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">Easy on the eyes at night</p>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
