const supabase = require("./config/supabase");

async function ping() {
  try {
    await supabase.from("profiles").select("id").limit(1);
    console.log("Keepalive OK —", new Date().toISOString());
  } catch (e) {
    console.log("Keepalive failed:", e.message);
  }
}

// Ping every 10 minutes to prevent Render from sleeping
setInterval(ping, 10 * 60 * 1000);
ping();

module.exports = { ping };
