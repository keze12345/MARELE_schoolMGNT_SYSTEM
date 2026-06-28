const express  = require("express");
const router   = express.Router();
const supabase = require("../config/supabase");

router.get("/", async (req, res) => {
  const { academic_year_id } = req.query;
  let query = supabase.from("streams").select("*").order("name");
  if (academic_year_id) query = query.eq("academic_year_id", academic_year_id);
  const { data, error } = await query;
  if (error) return res.status(400).json({ error: error.message });
  res.json(data || []);
});

router.post("/", async (req, res) => {
  const { academic_year_id, name, teacher_id, teacher_name } = req.body;
  if (!academic_year_id || !name)
    return res.status(400).json({ error: "academic_year_id and name are required" });
  const { data, error } = await supabase
    .from("streams")
    .insert([{ academic_year_id, name, teacher_id: teacher_id || null, teacher_name: teacher_name || null }])
    .select().single();
  if (error) return res.status(400).json({ error: error.message });
  res.json(data);
});

router.put("/:id", async (req, res) => {
  const { id } = req.params;
  const { teacher_id, teacher_name } = req.body;
  const { error: e1 } = await supabase.from("streams")
    .update({ teacher_id: teacher_id || null, teacher_name: teacher_name || null }).eq("id", id);
  if (e1) return res.status(400).json({ error: e1.message });
  const { error: e2 } = await supabase.from("classes")
    .update({ teacher_id: teacher_id || null, teacher_name: teacher_name || null }).eq("stream_id", id);
  if (e2) return res.status(400).json({ error: e2.message });
  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("streams").delete().eq("id", id);
  if (error) return res.status(400).json({ error: error.message });
  res.json({ success: true });
});

module.exports = router;
