import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,    setUser]    = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme,   setThemeState] = useState(() => {
    try { return localStorage.getItem("mareli_theme") || "light"; }
    catch { return "light"; }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  useEffect(() => {
    let initialSessionChecked = false;

    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionChecked = true;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // Skip the first null firing on Safari before getSession resolves
      if (!initialSessionChecked && !session) return;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    if (data?.theme) {
      setThemeState(data.theme);
      localStorage.setItem("mareli_theme", data.theme);
      document.documentElement.classList.toggle("dark", data.theme === "dark");
    }
    setLoading(false);
  }

  async function updateProfile(updates) {
    const { error } = await supabase.from("profiles").update(updates).eq("id", user.id);
    if (!error) setProfile(p => ({ ...p, ...updates }));
    return { error };
  }

  async function setTheme(t) {
    setThemeState(t);
    localStorage.setItem("mareli_theme", t);
    document.documentElement.classList.toggle("dark", t === "dark");
    await supabase.from("profiles").update({ theme: t }).eq("id", user.id);
  }

  const signIn  = (email, password) => supabase.auth.signInWithPassword({ email, password });
  const signOut = () => supabase.auth.signOut();

  return (
    <AuthContext.Provider value={{ user, profile, loading, theme, signIn, signOut, updateProfile, setTheme, fetchProfile }}>
      {children}
    </AuthContext.Provider>
  );
}
// Parent routing is handled in App.jsx via role check
