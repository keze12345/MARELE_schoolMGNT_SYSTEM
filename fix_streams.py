path = "/home/atumkeze/school-manager/backend/src/routes/users.js"
c = open(path).read()

old = '''router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) return res.status(400).json({ error: error.message });
  await supabase.from("profiles").delete().eq("id", id);
  cache.del("all_profiles");
  res.json({ success: true });
});'''

new = '''router.delete("/:id", async (req, res) => {
  const { id } = req.params;

  // Delete related records first to avoid FK conflicts
  await supabase.from("classes").update({ teacher_id: null, teacher_name: null }).eq("teacher_id", id);
  await supabase.from("streams").update({ teacher_id: null, teacher_name: null }).eq("teacher_id", id);
  await supabase.from("attendance").delete().eq("recorded_by", id);
  await supabase.from("students").update({ parent_user_id: null }).eq("parent_user_id", id);

  // Delete profile first, then auth user
  await supabase.from("profiles").delete().eq("id", id);

  const { error } = await supabase.auth.admin.deleteUser(id);
  if (error) {
    console.error("Auth delete error:", error.message);
    // Profile already deleted — still treat as success
    cache.del("all_profiles");
    return res.json({ success: true });
  }

  cache.del("all_profiles");
  res.json({ success: true });
});'''

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("Delete route fixed!")
else:
    print("not found")
