import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import toast from "react-hot-toast";

export default function Login() {
  const { signIn }  = useAuth();
  const navigate    = useNavigate();
  const [form,    setForm]    = useState({ email: "", password: "" });
  const [show,    setShow]    = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(form.email, form.password);
    if (error) { toast.error(error.message); setLoading(false); }
    else        { toast.success("Welcome!"); navigate("/dashboard"); }
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">

      {/* ── Left panel ── */}
      <div className="hidden lg:flex flex-1 flex-col items-center justify-center relative overflow-hidden"
        style={{ background: "linear-gradient(160deg,#0f4526 0%,#1a6b3c 50%,#2d9e5f 100%)" }}>

        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#f5a623,transparent)" }} />
        <div className="absolute -bottom-32 -right-16 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle,#e63946,transparent)" }} />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center px-12 max-w-lg">
          <img src="/logo_ma.png" alt="MARELI Academy Logo"
            className="w-40 h-40 object-contain mb-6 drop-shadow-xl" />

          <h1 className="text-white font-display font-extrabold text-3xl leading-tight mb-2">
            Ss. Mary & Elizabeth<br />Nursery and Primary Academy
          </h1>
          <p className="text-green-200 text-sm mb-1 font-medium">MARELI Academy · Buea, Cameroon</p>
          <p className="text-green-300 text-xs italic mb-10">
            "Learning Opportunity for a Lifelong Difference"
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 w-full">
            {[["600+","Students"],["20","Classrooms"],["Est.","2015"]].map(([n,l]) => (
              <div key={l} className="bg-white/10 backdrop-blur-sm rounded-2xl py-4 px-2 border border-white/10">
                <div className="text-white font-display font-bold text-2xl">{n}</div>
                <div className="text-green-200 text-xs mt-0.5">{l}</div>
              </div>
            ))}
          </div>

          {/* Colour stripe */}
          <div className="flex gap-2 mt-10">
            {["#e63946","#1a6b3c","#f5a623"].map(c => (
              <div key={c} className="w-8 h-1.5 rounded-full opacity-70" style={{ background: c }} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Right panel (form) ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-surface min-h-screen lg:min-h-0">
        <div className="w-full max-w-md">

          {/* Mobile logo (only shown on small screens) */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img src="/logo_ma.png" alt="MARELI Academy"
              className="w-20 h-20 object-contain mb-3" />
            <h2 className="font-display font-bold text-lg text-gray-900 text-center">
              Ss. Mary & Elizabeth N&P Academy
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">Buea, Cameroon</p>
          </div>

          <div className="bg-white rounded-3xl shadow-card border border-gray-100 p-8">

            {/* Form header */}
            <div className="mb-7">
              <h2 className="text-2xl font-display font-bold text-gray-900">Staff Sign In</h2>
              <p className="text-sm text-gray-400 mt-1">School Management System</p>
              {/* Colour bar */}
              <div className="flex gap-1 mt-3">
                <div className="h-1 w-8 rounded-full bg-accent" />
                <div className="h-1 w-8 rounded-full bg-primary" />
                <div className="h-1 w-8 rounded-full bg-secondary" />
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
                <input className="input" type="email" required placeholder="you@mareli.cm"
                  value={form.email}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))} />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <input className="input pr-10" type={show ? "text" : "password"}
                    required placeholder="••••••••"
                    value={form.password}
                    onChange={e => setForm(p => ({ ...p, password: e.target.value }))} />
                  <button type="button" onClick={() => setShow(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {show ? <EyeOff size={16}/> : <Eye size={16}/>}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2 py-3 text-base">
                {loading
                  ? <><Loader2 size={16} className="animate-spin"/> Signing in...</>
                  : "Sign In →"}
              </button>
            </form>

            <p className="text-center text-xs text-gray-400 mt-6">
              © {new Date().getFullYear()} MARELI Academy · Buea, Cameroon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
