path = "/home/atumkeze/school-manager/frontend/src/App.jsx"
c = open(path).read()

# Add keep-alive ping after imports
old = 'function ProtectedLayout() {'
new = '''// Keep Render backend alive — pings every 10 minutes to prevent cold starts
function useKeepAlive() {
  React.useEffect(() => {
    const API = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
    const ping = () => fetch(API + "/health").catch(() => {});
    ping(); // ping immediately on load
    const interval = setInterval(ping, 10 * 60 * 1000); // every 10 minutes
    return () => clearInterval(interval);
  }, []);
}

function ProtectedLayout() {
  useKeepAlive();'''

print("found:", old in c)
if old in c:
    c = c.replace(old, new, 1)
    open(path, "w").write(c)
    print("Keep-alive added!")
else:
    print("not found")
