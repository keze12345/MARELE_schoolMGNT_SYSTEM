import { createClient } from "@supabase/supabase-js";

const supabaseUrl  = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnon = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnon);

// Wake up Render backend on app load
const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
fetch(API.replace("/api", "/api/health")).catch(() => {});
