import { useEffect, useState } from "react";
import {
  Plus, Loader2, X, Trash2, Eye, EyeOff,
  Phone, Shield, AlertCircle, Pencil, Copy, Check, KeyRound
} from "lucide-react";
import toast from "react-hot-toast";

const ROLES = [
  { value: "headmaster", label: "Principal / Head Teacher" },
  { value: "teacher",    label: "Teacher"                  },
  { value: "bursar",     label: "Bursar"                   },
  { value: "secretary",  label: "Secretary"                },
];

const roleColors = {
  headmaster: "badge-amber",
  teacher:    "badge-blue",
  bursar:     "badge-green",
  secretary:  "badge-blue",
  admin:      "badge-red",
};

const EMPTY_FORM = {
  full_name: "", email: "", password: "",
  role: "teacher", phone: "", gender: "female",
};

function CredentialsModal({ credentials, onClose }) {
  const [copiedField, setCopiedField] = useState(null);

  function copy(text, field) {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <KeyRound size={20}/>
            </div>
            <div>
              <h2 className="font-display font-bold text-lg">Account Created!</h2>
              <p className="text-green-200 text-xs mt-0.5">Share these credentials securely</p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            <strong>{credentials.name}</strong>'s account is ready.
            Please write down or print these credentials and hand them directly to the user.
          </p>

          {/* Credentials box */}
          <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
            {[
              { label: "Full Name", value: credentials.name,     field: "name"     },
              { label: "Email",     value: credentials.email,    field: "email"    },
              { label: "Password",  value: credentials.password, field: "password" },
              ...(credentials.role ? [{ label: "Role", value: credentials.role, field: "role" }] : []),
            ].map(({ label, value, field }) => (
              <div key={field} className="flex items-center justify-between px-4 py-3 border-b border-gray-100 last:border-0">
                <div>
                  <div className="text-xs text-gray-400">{label}</div>
                  <div className="font-mono font-semibold text-gray-800 text-sm mt-0.5">{value}</div>
                </div>
                {field !== "role" && field !== "name" && (
                  <button onClick={() => copy(value, field)}
                    className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-400 hover:text-primary">
                    {copiedField === field ? <Check size={15} className="text-green-500"/> : <Copy size={15}/>}
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="p-3 rounded-xl bg-amber-50 border border-amber-100 text-xs text-amber-700">
            ⚠ This is the only time the password is shown. Make sure to note it down before closing.
          </div>

          <div className="flex gap-3">
            <button onClick={() => {
              const text = `MARELI Academy Login\nName: ${credentials.name}\nEmail: ${credentials.email}\nPassword: ${credentials.password}${credentials.role ? `\nRole: ${credentials.role}` : ""}`;
              navigator.clipboard.writeText(text);
              toast.success("Credentials copied!");
            }} className="btn-ghost flex-1 flex items-center justify-center gap-2 text-sm">
              <Copy size={14}/> Copy All
            </button>
            <button onClick={onClose} className="btn-primary flex-1">
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Staff() {
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState(null);
  const [showModal,   setShowModal]   = useState(false);
  const [saving,      setSaving]      = useState(false);
  const [showPwd,     setShowPwd]     = useState(false);
  const [form,        setForm]        = useState(EMPTY_FORM);
  const [editingId,   setEditingId]   = useState(null);
  const [deleting,    setDeleting]    = useState(null);
  const [filterRole,  setFilterRole]  = useState("all");
  const [credentials, setCredentials] = useState(null);

  const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => { fetchStaff(); }, []);

  async function fetchStaff() {
    setLoading(true); setError(null);
    try {
      const res  = await fetch(`${API}/users`);
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setStaff(Array.isArray(data) ? data : []);
    } catch (err) { setError(err.message); }
    setLoading(false);
  }

  function openAddModal()    { setEditingId(null); setForm(EMPTY_FORM); setShowModal(true); }
  function openEditModal(s)  {
    setEditingId(s.id);
    setForm({ full_name:s.full_name||"", email:"", password:"", role:s.role||"teacher", phone:s.phone||"", gender:s.gender||"female" });
    setShowModal(true);
  }

  async function handleSave(e) {
    e.preventDefault();
    if (!editingId && form.password.length < 8) { toast.error("Password must be at least 8 characters"); return; }
    setSaving(true);
    try {
      let res, data;
      if (editingId) {
        res  = await fetch(`${API}/users/${editingId}`, {
          method: "PUT", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ full_name:form.full_name, role:form.role, phone:form.phone, gender:form.gender }),
        });
        data = await res.json();
        if (data.error) throw new Error(data.error);
        toast.success("Staff member updated!");
      } else {
        res  = await fetch(`${API}/users`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        data = await res.json();
        if (data.error) throw new Error(data.error);
        // Show credentials popup
        setCredentials({
          name:     form.full_name,
          email:    form.email,
          password: form.password,
          role:     ROLES.find(r => r.value === form.role)?.label || form.role,
        });
      }
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      fetchStaff();
    } catch (err) { toast.error(err.message); }
    setSaving(false);
  }

  async function handleDelete(id, name) {
    if (!window.confirm(`Delete ${name}? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      const res  = await fetch(`${API}/users/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      toast.success(`${name} deleted`);
      fetchStaff();
    } catch (err) { toast.error(err.message); }
    setDeleting(null);
  }

  const filtered = filterRole === "all" ? staff : staff.filter(s => s.role === filterRole);
  const counts = {
    all:        staff.length,
    headmaster: staff.filter(s=>s.role==="headmaster").length,
    teacher:    staff.filter(s=>s.role==="teacher").length,
    bursar:     staff.filter(s=>s.role==="bursar").length,
    secretary:  staff.filter(s=>s.role==="secretary").length,
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-gray-900">Staff</h1>
          <p className="text-sm text-gray-500 mt-0.5">{staff.length} staff members · MARELI Academy</p>
        </div>
        <button onClick={openAddModal} className="btn-primary flex items-center gap-2">
          <Plus size={16}/> Add Staff Member
        </button>
      </div>

      {error && (
        <div className="card border-red-200 bg-red-50 flex items-start gap-3 p-4">
          <AlertCircle size={18} className="text-red-500 mt-0.5 flex-shrink-0"/>
          <div className="flex-1">
            <div className="font-medium text-red-800 text-sm">Could not load staff list</div>
            <div className="text-xs text-red-600 mt-0.5 font-mono">{error}</div>
            <div className="text-xs text-red-600 mt-1">
              Make sure the backend is running: <code className="bg-red-100 px-1 rounded">cd ~/school-manager/backend && npm run dev</code>
            </div>
          </div>
          <button onClick={fetchStaff} className="text-xs text-red-600 hover:underline font-medium flex-shrink-0">Retry</button>
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {[
          { key:"all",        label:`All (${counts.all})`              },
          { key:"headmaster", label:`Principal (${counts.headmaster})` },
          { key:"teacher",    label:`Teachers (${counts.teacher})`     },
          { key:"bursar",     label:`Bursar (${counts.bursar})`        },
          { key:"secretary",  label:`Secretary (${counts.secretary})`  },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setFilterRole(key)}
            className={`px-4 py-1.5 rounded-xl text-sm font-medium border transition-all
              ${filterRole===key ? "bg-primary text-white border-primary" : "bg-white text-gray-600 border-gray-200 hover:border-primary hover:text-primary"}`}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={18}/> Loading staff...
        </div>
      ) : !error && filtered.length === 0 ? (
        <div className="card text-center py-16 text-gray-400 text-sm">
          No staff found. Click <strong>Add Staff Member</strong> to create one.
        </div>
      ) : !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(s => (
            <div key={s.id} className="card flex flex-col gap-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
                    style={{ background: s.gender==="male"?"#1a6b3c":"#e63946" }}>
                    {(s.full_name||"?").charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-800 text-sm">{s.full_name}</div>
                    <span className={`text-xs mt-0.5 inline-block ${roleColors[s.role]||"badge-blue"}`}>
                      {ROLES.find(r=>r.value===s.role)?.label||s.role}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openEditModal(s)}
                    className="p-1.5 text-gray-300 hover:text-primary transition-colors rounded-lg hover:bg-green-50">
                    <Pencil size={14}/>
                  </button>
                  <button onClick={() => handleDelete(s.id, s.full_name)} disabled={deleting===s.id}
                    className="p-1.5 text-gray-300 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50">
                    {deleting===s.id ? <Loader2 size={14} className="animate-spin"/> : <Trash2 size={14}/>}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5 text-xs text-gray-500">
                {s.phone && (
                  <div className="flex items-center gap-2"><Phone size={12} className="text-gray-300"/>{s.phone}</div>
                )}
                <div className="flex items-center gap-2">
                  <Shield size={12} className="text-gray-300"/>
                  <span className="capitalize">{s.gender||"—"}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="font-display font-bold text-lg text-gray-900">
                {editingId ? "Edit Staff Member" : "Add Staff Member"}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full name *</label>
                <input className="input" required placeholder="e.g. Mrs. Ngum Beatrice"
                  value={form.full_name} onChange={e => setForm(p=>({...p,full_name:e.target.value}))}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role *</label>
                  <select className="input" value={form.role} onChange={e => setForm(p=>({...p,role:e.target.value}))}>
                    {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <select className="input" value={form.gender} onChange={e => setForm(p=>({...p,gender:e.target.value}))}>
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone number</label>
                <input className="input" placeholder="e.g. 677 123 456"
                  value={form.phone} onChange={e => setForm(p=>({...p,phone:e.target.value}))}/>
              </div>
              {!editingId && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email address *</label>
                    <input className="input" type="email" required placeholder="teacher@mareli.cm"
                      value={form.email} onChange={e => setForm(p=>({...p,email:e.target.value}))}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                    <div className="relative">
                      <input className="input pr-10" type={showPwd?"text":"password"} required
                        placeholder="Min. 8 characters"
                        value={form.password} onChange={e => setForm(p=>({...p,password:e.target.value}))}/>
                      <button type="button" onClick={() => setShowPwd(s=>!s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                        {showPwd ? <EyeOff size={15}/> : <Eye size={15}/>}
                      </button>
                    </div>
                  </div>
                </>
              )}
              {editingId && (
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-xs text-blue-700">
                  ℹ Email and password can't be changed here. Delete and recreate to reset.
                </div>
              )}
              <div className="flex justify-end gap-3 pt-1">
                <button type="button" onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary flex items-center gap-2">
                  {saving && <Loader2 size={14} className="animate-spin"/>}
                  {editingId ? "Save Changes" : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Credentials popup */}
      {credentials && (
        <CredentialsModal credentials={credentials} onClose={() => setCredentials(null)}/>
      )}
    </div>
  );
}
