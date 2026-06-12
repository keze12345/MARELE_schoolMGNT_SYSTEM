const supabase = require("./config/supabase");

async function ping() {
  try {
    await supabase.from("profiles").select("id").limit(1);
    console.log("Keepalive OK —", new Date().toISOString());
  } catch (e) {
    console.log("Keepalive failed:", e.message);
  }
}

// Ping every 4 days to prevent free tier pause
setInterval(ping, 4 * 24 * 60 * 60 * 1000);
ping();

module.exports = { ping };
