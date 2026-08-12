import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const AuthContext = createContext({});
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user,        setUser]        = useState(null);
  const [profile,     setProfile]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeYear,  setActiveYear]  = useState(null);  // active academic year
  const [activeTerms, setActiveTerms] = useState([]);    // terms under active year
  const [activeSeqs,  setActiveSeqs]  = useState([]);    // sequences under active year
  const [isHolidayYear, setIsHolidayYear] = useState(false); // is active year a holiday programme
  const [theme, setThemeState] = useState(() => {
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
      if (!initialSessionChecked && !session) return;
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);

  async function fetchAcademicContext() {
    // Load active academic year
    const { data: years } = await supabase
      .from("academic_years")
      .select("*")
      .eq("is_active", true)
      .single();

    if (!years) {
      setActiveYear(null);
      setActiveTerms([]);
      setActiveSeqs([]);
      setIsHolidayYear(false);
      return;
    }

    setActiveYear(years);

    // Detect holiday school by programme_type field
    const isHoliday = years.programme_type === "holiday";
    setIsHolidayYear(isHoliday);

    // Load terms under this active year only
    const { data: terms } = await supabase
      .from("terms")
      .select("*")
      .eq("academic_year_id", years.id)
      .order("created_at");
    setActiveTerms(terms || []);

    // Load sequences under those terms only
    if ((terms || []).length > 0) {
      const termIds = terms.map(t => t.id);
      const { data: seqs } = await supabase
        .from("sequences")
        .select("*")
        .in("term_id", termIds)
        .order("created_at");
      setActiveSeqs(seqs || []);
    } else {
      setActiveSeqs([]);
    }
  }

  async function fetchProfile(userId) {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    setProfile(data);
    if (data?.theme) {
      setThemeState(data.theme);
      localStorage.setItem("mareli_theme", data.theme);
      document.documentElement.classList.toggle("dark", data.theme === "dark");
    }
    await fetchAcademicContext();
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
    <AuthContext.Provider value={{
      user, profile, loading, theme,
      activeYear, activeTerms, activeSeqs, isHolidayYear,
      signIn, signOut, updateProfile, setTheme, fetchProfile,
      refreshAcademicContext: fetchAcademicContext,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
