const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");
const cache    = require("../config/cache");

router.get("/", async (req, res) => {
  const cached = cache.get("all_profiles");
  if (cached) return res.json(cached);

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) return res.status(400).json({ error: error.message });
  cache.set("all_profiles", data, 60);
  res.json(data);
});

router.post("/", async (req, res) => {
  const { email, password, full_name, role, phone, gender } = req.body;
  if (!email || !password || !full_name || !role)
    return res.status(400).json({ error: "email, password, full_name and role are required" });

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email, password, email_confirm: true,
  });
  if (authError) return res.status(400).json({ error: authError.message });

  const { error: profileError } = await supabase.from("profiles").insert([{
    id: authData.user.id, full_name, role,
    phone: phone || null, gender: gender || null,
  }]);
  if (profileError) return res.status(400).json({ error: profileError.message });

  cache.del("all_profiles");
  res.json({ success: true, user: { id: authData.user.id, email, full_name, role } });
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { full_name, role, phone, gender } = req.body;

  if (!full_name || !role)
    return res.status(400).json({ error: "full_name and role are required" });

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, role, phone: phone || null, gender: gender || null })
    .eq("id", id);

  if (error) return res.status(400).json({ error: error.message });

  cache.del("all_profiles");
  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return res.status(400).json({ error: error.message });
  await supabase.from("profiles").delete().eq("id", id);
  cache.del("all_profiles");
  res.json({ success: true });
});

module.exports = router;
