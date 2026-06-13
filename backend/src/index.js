const express  = require("express");
const cors     = require("cors");
require("dotenv").config();

require("./keepalive");

const usersRouter = require("./routes/users");

const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
  ],
  credentials: true,
}));

app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/users", usersRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


// Auto-create parent account when student is enrolled
app.post('/api/create-parent', async (req, res) => {
  const supabase = require('./config/supabase');
  const { parent_name, parent_phone, student_id } = req.body;
  if (!parent_phone || !student_id) return res.status(400).json({ error: 'Missing fields' });

  const phone    = parent_phone.replace(/[^0-9]/g, '');
  const email    = phone + '@mareli.cm';
  const password = phone;

  try {
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    let parentId;

    if (existing) {
      parentId = existing.id;
    } else {
      const { data: authUser, error: authErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: parent_name, role: 'parent' }
      });
      if (authErr) return res.status(400).json({ error: authErr.message });
      parentId = authUser.user.id;

      await supabase.from('profiles').insert([{
        id:        parentId,
        full_name: parent_name,
        email,
        role:      'parent',
        phone:     parent_phone,
      }]);
    }

    await supabase
      .from('students')
      .update({ parent_user_id: parentId })
      .eq('id', student_id);

    res.json({ success: true, email, password, parentId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
