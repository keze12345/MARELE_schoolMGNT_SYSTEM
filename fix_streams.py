path = "/home/atumkeze/school-manager/frontend/src/context/AuthContext.jsx"
c = open(path).read()

old = '''  const [theme,   setThemeState] = useState(() => localStorage.getItem("mareli_theme") || "light");'''

new = '''  const [theme,   setThemeState] = useState(() => {
    try { return localStorage.getItem("mareli_theme") || "light"; }
    catch { return "light"; }
  });'''

print("theme fix found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    print("theme fix applied!")

old2 = '''  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      else { setProfile(null); setLoading(false); }
    });
    return () => subscription.unsubscribe();
  }, []);'''

new2 = '''  useEffect(() => {
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
  }, []);'''

print("race fix found:", old2 in c)
if old2 in c:
    c = c.replace(old2, new2, 1)
    print("race fix applied!")

open(path, "w").write(c)
print("AuthContext.jsx saved!")
