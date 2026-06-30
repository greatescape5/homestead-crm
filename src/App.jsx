import { useState, useEffect, useRef } from "react";
import { supabase } from "./supabase";

const CONFIG = {
  companyName: "Homestead",
  companySubtitle: "Concrete & Excavation",
  jobLabel: "Job",
  jobsLabel: "Jobs",
  statuses: ["Lead", "Bidding", "Active", "Punch List", "Complete", "Invoiced"],
  jobTypes: ["Excavation", "Concrete Pour", "Foundation", "Site Prep", "Grading", "Demo & Haul", "Utility Trench", "Other"],
  crews: ["Solo", "Team A", "Team B", "Subcontractor"],
};

const T = {
  bg: "#EDEBE6", card: "#FAFAF7", cardBorder: "#D8D4CB",
  steel: "#1A1A1A", steelMid: "#2E2E2E", gold: "#C8A96E",
  muted: "#7A7570", mutedLight: "#ADA9A2",
  danger: "#A0341E", success: "#2E6644", warning: "#8A6020", white: "#FAFAF7",
};

const STATUS_CFG = {
  Lead:         { color: T.warning, bg: "#FBF4E6", dot: "#C8A96E" },
  Bidding:      { color: "#1E4080", bg: "#EBF0FB", dot: "#3A68C8" },
  Active:       { color: T.success, bg: "#EBF5EE", dot: "#3A8A56" },
  "Punch List": { color: "#5A2080", bg: "#F3ECF9", dot: "#8A50C0" },
  Complete:     { color: T.muted,   bg: "#F2F0EC", dot: "#9A9590" },
  Invoiced:     { color: T.danger,  bg: "#FBF0EE", dot: "#C04030" },
};

const fmt$ = (n) => n ? "$" + Number(n).toLocaleString() : "—";
const todayStr = () => new Date().toISOString().split("T")[0];
const fmtTime = (ts) => {
  const d = new Date(ts);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" }) + " " + d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
};
const EMPTY = { company: "", contact: "", phone: "", job_site: "", type: "", bid: "", status: "Lead", crew: "", notes: "", follow_up: "", follow_up_time: "" };

const fmtFollowUp = (date, time) => {
  if (!date) return null;
  const t = time || "08:00";
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const h12 = hour % 12 || 12;
  return `${date} at ${h12}:${m} ${ampm}`;
};

// ─── SWIPE-BACK HOOK ──────────────────────────────────────────────────────────
// iOS-style edge swipe: start near the left edge, drag right past a threshold → onBack()
function useSwipeBack(onBack) {
  useEffect(() => {
    let startX = 0, startY = 0, tracking = false;
    const EDGE = 40;        // must start within 40px of left edge
    const THRESHOLD = 80;   // must travel 80px right
    const MAX_VERT = 60;    // ignore if too much vertical movement (it's a scroll)

    const onStart = (e) => {
      const t = e.touches[0];
      if (t.clientX <= EDGE) { tracking = true; startX = t.clientX; startY = t.clientY; }
      else { tracking = false; }
    };
    const onEnd = (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = Math.abs(t.clientY - startY);
      if (dx > THRESHOLD && dy < MAX_VERT) onBack();
    };

    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [onBack]);
}

// ─── ICONS — clean monochrome line icons (inherit color via currentColor) ─────
function Icon({ name, size = 20, stroke = 2, style }) {
  const p = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: stroke, strokeLinecap: "round", strokeLinejoin: "round", style };
  switch (name) {
    case "dashboard": return <svg {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>;
    case "jobs": return <svg {...p}><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4l-6.6 6.6a1.4 1.4 0 0 0 2 2l6.6-6.6a4 4 0 0 0 5.4-5.4l-2.5 2.5-2-2 2.5-2.5z"/></svg>;
    case "calendar": return <svg {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>;
    case "invoice": return <svg {...p}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>;
    case "bell": return <svg {...p}><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg>;
    case "bellOff": return <svg {...p}><path d="M13.7 21a2 2 0 0 1-3.4 0M18 8a6 6 0 0 0-9.3-5M5.3 5.3A6 6 0 0 0 6 8c0 7-3 9-3 9h13M1 1l22 22"/></svg>;
    case "phone": return <svg {...p}><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.1-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.4-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/></svg>;
    case "message": return <svg {...p}><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.5 8.5 0 0 1-3.9-.9L3 20l1.3-4a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 8.4-8.7h.5a8.5 8.5 0 0 1 8 8z"/></svg>;
    case "trash": return <svg {...p}><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>;
    case "note": return <svg {...p}><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg>;
    case "alert": return <svg {...p}><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4M12 17h.01"/></svg>;
    case "pin": return <svg {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
    case "check": return <svg {...p}><path d="M20 6 9 17l-5-5"/></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>;
    case "back": return <svg {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>;
    case "plus": return <svg {...p}><path d="M12 5v14M5 12h14"/></svg>;
    case "pencil": return <svg {...p}><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>;
    case "close": return <svg {...p}><path d="M18 6 6 18M6 6l12 12"/></svg>;
    case "settings": return <svg {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>;
    case "card": return <svg {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></svg>;
    case "external": return <svg {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6M10 14 21 3"/></svg>;
    default: return null;
  }
}

function Badge({ status }) {
  const c = STATUS_CFG[status] || STATUS_CFG.Lead;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: c.bg, color: c.color, border: "1px solid " + c.dot + "44", borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: c.dot }} />{status}
    </span>
  );
}

function Toast({ msg, type }) {
  return (
    <div style={{ position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 999, background: type === "error" ? T.danger : T.steel, color: T.white, padding: "10px 20px", borderRadius: 10, fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px #0003", whiteSpace: "nowrap", borderBottom: "3px solid " + T.gold }}>
      {msg}
    </div>
  );
}

function Header({ title, sub, right }) {
  return (
    <div style={{ background: T.steel, paddingLeft: 18, paddingRight: 18, paddingBottom: 14, paddingTop: "calc(18px + env(safe-area-inset-top))", borderBottom: "3px solid " + T.gold, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
      <div>
        <div style={{ fontSize: 10, color: T.gold, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{CONFIG.companyName} · {CONFIG.companySubtitle}</div>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white, marginTop: 2 }}>{title}</div>
        {sub && <div style={{ fontSize: 12, color: T.mutedLight, marginTop: 2 }}>{sub}</div>}
      </div>
      {right}
    </div>
  );
}

function BottomNav({ tab, setTab, onCreateInvoice }) {
  const slotStyle = {
    flex: "1 1 0", minWidth: 0, border: "none", cursor: "pointer",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 4, padding: "10px 0 0", height: 60, background: "transparent",
  };
  const labelStyle = (activeTab) => ({ fontSize: 10, fontWeight: activeTab ? 700 : 500, whiteSpace: "nowrap" });

  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 480,
      background: T.steel, borderTop: "3px solid " + T.gold, zIndex: 100,
      display: "flex", alignItems: "flex-start",
      paddingBottom: "env(safe-area-inset-bottom)",
      height: "calc(60px + env(safe-area-inset-bottom))",
    }}>
      <button onClick={() => setTab("dashboard")} style={{ ...slotStyle, color: tab === "dashboard" ? T.gold : T.mutedLight }}>
        <Icon name="dashboard" size={22} stroke={tab === "dashboard" ? 2.4 : 2} />
        <span style={labelStyle(tab === "dashboard")}>Dashboard</span>
      </button>

      <button onClick={() => setTab("jobs")} style={{ ...slotStyle, color: tab === "jobs" ? T.gold : T.mutedLight }}>
        <Icon name="jobs" size={22} stroke={tab === "jobs" ? 2.4 : 2} />
        <span style={labelStyle(tab === "jobs")}>Jobs</span>
      </button>

      {/* Center + button */}
      <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6 }}>
        <button onClick={() => setTab("add")} style={{
          width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
          background: T.gold, color: T.steel,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: -22, boxShadow: "0 2px 12px " + T.gold + "99",
        }}><Icon name="plus" size={24} stroke={2.6} /></button>
      </div>

      <button onClick={() => setTab("followups")} style={{ ...slotStyle, color: tab === "followups" ? T.gold : T.mutedLight }}>
        <Icon name="calendar" size={22} stroke={tab === "followups" ? 2.4 : 2} />
        <span style={labelStyle(tab === "followups")}>Follow-ups</span>
      </button>

      <button onClick={onCreateInvoice} style={{ ...slotStyle, color: T.mutedLight }}>
        <Icon name="invoice" size={22} stroke={2} />
        <span style={labelStyle(false)}>Invoice</span>
      </button>
    </nav>
  );
}

// ─── QUICK ADD MODAL ──────────────────────────────────────────────────────────
function QuickAdd({ onSave, onClose, userId }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [reminder, setReminder] = useState("today");
  const [time, setTime] = useState("");

  const handleSave = async () => {
    if (!name) { alert("Name is required"); return; }
    const follow_up = reminder === "today" ? todayStr()
      : reminder === "tomorrow" ? new Date(Date.now() + 86400000).toISOString().split("T")[0]
      : new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0];
    const { data, error } = await supabase.from("jobs").insert([{
      company: name, contact: name, phone, status: "Lead",
      notes: "", follow_up, follow_up_time: time || "08:00", user_id: userId,
      job_site: "", type: "", bid: 0, crew: ""
    }]).select().single();
    if (!error) { onSave(data); onClose(); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000AA", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: T.card, borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxWidth: 480, margin: "0 auto", paddingBottom: 40 }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: T.steel, marginBottom: 6 }}>Quick Add</div>
        <div style={{ fontSize: 13, color: T.muted, marginBottom: 20 }}>Capture a call-back in seconds.</div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Name / Company</div>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Mike Hendricks" autoComplete="name" style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 15, boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Phone <span style={{ color: T.mutedLight, fontWeight: 400, textTransform: "none", fontSize: 11 }}>— iOS will suggest from your contacts</span></div>
          <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="208-555-0100" autoComplete="tel" style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 15, boxSizing: "border-box" }} />
        </div>

        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Remind Me</div>
          <div style={{ display: "flex", gap: 8 }}>
            {["today", "tomorrow", "next week"].map(r => (
              <button key={r} onClick={() => setReminder(r)} style={{ flex: 1, padding: "10px 6px", borderRadius: 10, border: "none", cursor: "pointer", fontWeight: 700, fontSize: 12, background: reminder === r ? T.gold : T.bg, color: reminder === r ? T.steel : T.muted }}>
                {r.charAt(0).toUpperCase() + r.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>
            Notification Time <span style={{ color: T.mutedLight, fontWeight: 400, textTransform: "none", fontSize: 11 }}>— defaults to 8:00 AM</span>
          </div>
          <input type="time" value={time} onChange={e => setTime(e.target.value)} style={{ width: "100%", padding: "12px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 15, boxSizing: "border-box" }} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={handleSave} style={{ flex: 2, background: T.gold, color: T.steel, border: "none", borderRadius: 12, padding: 14, fontWeight: 900, fontSize: 16, cursor: "pointer" }}>Save Call-Back</button>
          <button onClick={onClose} style={{ flex: 1, background: T.bg, color: T.muted, border: "1px solid " + T.cardBorder, borderRadius: 12, padding: 14, fontWeight: 700, fontSize: 16, cursor: "pointer" }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const handle = async () => {
    setLoading(true); setError(""); setMessage("");
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message);
      else setMessage("Check your email to confirm, then sign in.");
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError("Invalid email or password.");
    }
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: T.steel, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Inter', system-ui, sans-serif" }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 11, color: T.gold, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{CONFIG.companyName}</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: T.white, marginTop: 4 }}>{CONFIG.companySubtitle}</div>
        <div style={{ fontSize: 13, color: T.mutedLight, marginTop: 6 }}>Job Management</div>
      </div>
      <div style={{ width: "100%", background: "#2A2A2A", borderRadius: 16, padding: 24, border: "1px solid #3A3A3A" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: T.white, marginBottom: 20 }}>{mode === "login" ? "Sign In" : "Create Account"}</div>
        {error && <div style={{ background: "#3A1A10", border: "1px solid " + T.danger, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#F5A090", marginBottom: 14 }}>{error}</div>}
        {message && <div style={{ background: "#1A3A20", border: "1px solid " + T.success, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: "#90D5A0", marginBottom: 14 }}>{message}</div>}
        {[["Email", "email", email, setEmail], ["Password", "password", password, setPassword]].map(([label, type, val, setter]) => (
          <div key={label} style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, color: T.mutedLight, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{label}</div>
            <input type={type} value={val} onChange={e => setter(e.target.value)} onKeyDown={e => e.key === "Enter" && handle()}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #444", background: "#1A1A1A", color: T.white, fontSize: 14, boxSizing: "border-box", outline: "none" }} />
          </div>
        ))}
        <button onClick={handle} disabled={loading} style={{ width: "100%", background: T.gold, color: T.steel, border: "none", borderRadius: 10, padding: 14, fontWeight: 900, fontSize: 16, cursor: "pointer", marginTop: 6, opacity: loading ? 0.7 : 1 }}>
          {loading ? "..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <button onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}
            style={{ background: "none", border: "none", color: T.gold, fontSize: 13, cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Need an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function Dashboard({ jobs, onJobSelect, onSignOut, onQuickAdd, userId, onOpenSettings }) {
  const today = todayStr();
  const active = jobs.filter(j => j.status === "Active").length;
  const activeJobs = jobs.filter(j => j.status === "Active");
  const openLeads = jobs.filter(j => ["Lead", "Bidding"].includes(j.status)).length;
  const nonClosed = jobs.filter(j => !["Complete", "Invoiced"].includes(j.status));
  const overdue = nonClosed.filter(j => j.follow_up && j.follow_up < today).length;
  const dueToday = nonClosed.filter(j => j.follow_up === today).length;
  const pipeline = jobs.reduce((s, j) => s + (Number(j.bid) || 0), 0);
  const wonValue = jobs.filter(j => ["Active", "Punch List", "Complete", "Invoiced"].includes(j.status)).reduce((s, j) => s + (Number(j.bid) || 0), 0);
  const callBacks = nonClosed.filter(j => j.follow_up && j.follow_up <= today).sort((a, b) => a.follow_up.localeCompare(b.follow_up));
  const statBreakdown = CONFIG.statuses.map(s => ({ s, count: jobs.filter(j => j.status === s).length, val: jobs.filter(j => j.status === s).reduce((sum, j) => sum + (Number(j.bid) || 0), 0) })).filter(x => x.count > 0);

  return (
    <div style={{ paddingBottom: 90 }}>
      <div style={{ background: T.steel, paddingLeft: 18, paddingRight: 18, paddingBottom: 14, paddingTop: "calc(18px + env(safe-area-inset-top))", borderBottom: "3px solid " + T.gold, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 10, color: T.gold, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>{CONFIG.companyName} · {CONFIG.companySubtitle}</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: T.white, marginTop: 2 }}>Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={onOpenSettings} style={{ background: "none", border: "1px solid #444", borderRadius: 8, color: T.mutedLight, fontSize: 11, padding: "5px 9px", cursor: "pointer", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="settings" size={14} /> Payments</button>
          <button onClick={onSignOut} style={{ background: "none", border: "1px solid #444", borderRadius: 8, color: T.mutedLight, fontSize: 11, padding: "5px 10px", cursor: "pointer", fontWeight: 600 }}>Sign Out</button>
        </div>
      </div>

      {(overdue > 0 || dueToday > 0) && (
        <div style={{ background: "#3A1A10", borderBottom: "2px solid " + T.gold, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
          <Icon name="bell" size={16} style={{ color: "#F5D8A0" }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F5D8A0" }}>{overdue > 0 && overdue + " overdue"}{overdue > 0 && dueToday > 0 && " · "}{dueToday > 0 && dueToday + " due today"}</span>
        </div>
      )}

      <div style={{ padding: "16px 16px 0" }}>
        {/* Quick Add Button */}
        <button onClick={onQuickAdd} style={{ width: "100%", background: T.steel, color: T.gold, border: "2px solid " + T.gold, borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          <Icon name="phone" size={18} /> Quick Add Call-Back
        </button>

        {/* HERO: Today's call-backs — the first thing you see */}
        {callBacks.length > 0 ? (
          <div style={{ background: T.card, borderRadius: 14, border: "1px solid " + T.cardBorder, overflow: "hidden", marginBottom: 16 }}>
            <div style={{ background: T.steel, padding: "11px 16px", borderBottom: "2px solid " + T.gold, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.gold, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}><Icon name="phone" size={14} /> Today's Call-Backs</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: overdue > 0 ? "#F5A090" : T.mutedLight }}>{callBacks.length}</div>
            </div>
            {callBacks.map(j => {
              const isOverdue = j.follow_up < today;
              return (
                <div key={j.id} onClick={() => onJobSelect(j)} style={{ padding: "12px 16px", borderBottom: "1px solid " + T.cardBorder, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: T.steel }}>{j.company}</div>
                    <div style={{ fontSize: 12, color: isOverdue ? T.danger : T.muted, marginTop: 2, fontWeight: isOverdue ? 700 : 400, display: "flex", alignItems: "center", gap: 4 }}>
                      {isOverdue && <Icon name="alert" size={11} />}{j.contact}{j.contact ? " · " : ""}{isOverdue ? "Overdue " + j.follow_up : "Today"}
                    </div>
                  </div>
                  <a href={"tel:" + j.phone} onClick={e => e.stopPropagation()} style={{ background: T.gold, color: T.steel, borderRadius: 8, padding: "8px 14px", fontWeight: 800, fontSize: 13, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="phone" size={14} /> Call</a>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ background: T.card, borderRadius: 14, border: "1px solid " + T.cardBorder, padding: "20px 16px", marginBottom: 16, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
            <Icon name="check" size={28} stroke={2} style={{ color: T.success }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: T.steel }}>You're all caught up</div>
            <div style={{ fontSize: 12, color: T.muted }}>No call-backs due today.</div>
          </div>
        )}

        {/* Slim stat strip */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 14 }}>
          {[
            { label: "Active", value: active, color: T.success },
            { label: "Leads", value: openLeads, color: "#3A68C8" },
            { label: "Due", value: overdue + dueToday, color: overdue > 0 ? T.danger : T.warning },
          ].map(c => (
            <div key={c.label} style={{ background: T.card, borderRadius: 10, padding: "10px 8px", border: "1px solid " + T.cardBorder, textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 10, color: T.muted, marginTop: 3, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{c.label}</div>
            </div>
          ))}
        </div>

        {/* Active Jobs */}
        {activeJobs.length > 0 && (
          <div style={{ background: T.card, borderRadius: 14, border: "1px solid " + T.cardBorder, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ background: T.steel, padding: "11px 16px", borderBottom: "2px solid " + T.gold, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.gold, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}><Icon name="jobs" size={14} /> Active Jobs</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: T.mutedLight }}>{activeJobs.length}</div>
            </div>
            {activeJobs.map(j => (
              <div key={j.id} onClick={() => onJobSelect(j)} style={{ padding: "12px 16px", borderBottom: "1px solid " + T.cardBorder, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.steel }}>{j.company}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
                    <Icon name="pin" size={11} /> {j.job_site || "No site set"}{j.crew ? " · " + j.crew : ""}
                  </div>
                </div>
                <div style={{ fontWeight: 900, color: T.gold, fontSize: 15 }}>{fmt$(j.bid)}</div>
              </div>
            ))}
          </div>
        )}

        {/* Condensed secondary revenue card */}
        <div style={{ background: T.card, borderRadius: 12, padding: "14px 16px", marginBottom: 14, border: "1px solid " + T.cardBorder }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Pipeline</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.steel, lineHeight: 1.1, marginTop: 2 }}>{fmt$(pipeline)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, color: T.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>Won / Active</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.gold, marginTop: 2 }}>{fmt$(wonValue)}</div>
            </div>
          </div>
          {pipeline > 0 && (
            <div style={{ marginTop: 12, display: "flex", gap: 3, height: 5, borderRadius: 3, overflow: "hidden" }}>
              {statBreakdown.map(({ s, val }) => <div key={s} style={{ flex: val / pipeline, background: STATUS_CFG[s] ? STATUS_CFG[s].dot : T.muted, minWidth: val > 0 ? 3 : 0 }} />)}
            </div>
          )}
        </div>

        {jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.muted }}>
            <div style={{ display: "flex", justifyContent: "center", color: T.mutedLight }}><Icon name="jobs" size={36} stroke={1.5} /></div>
            <div style={{ marginTop: 8, fontSize: 14 }}>No jobs yet — tap + to add your first one.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function JobCard({ job, onClick }) {
  const today = todayStr();
  const isClosed = ["Complete", "Invoiced"].includes(job.status);
  const overdue = !isClosed && job.follow_up && job.follow_up < today;
  const dueToday = !isClosed && job.follow_up === today;
  return (
    <div onClick={() => onClick(job)} style={{ background: T.card, borderRadius: 14, padding: 16, marginBottom: 10, border: "1px solid " + T.cardBorder, borderLeft: "4px solid " + (STATUS_CFG[job.status] ? STATUS_CFG[job.status].dot : T.muted), cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div style={{ fontWeight: 800, fontSize: 15, color: T.steel, flex: 1 }}>{job.contact || job.company || "—"}</div>
        <Badge status={job.status} />
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}><Icon name="pin" size={13} /> {job.job_site || "No site set"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <div style={{ fontSize: 12, color: T.muted }}>{job.company || "—"}</div>
        <div style={{ fontWeight: 900, color: T.gold, fontSize: 17 }}>{fmt$(job.bid)}</div>
      </div>
      {(overdue || dueToday) && (
        <div style={{ marginTop: 10, background: overdue ? "#FBF0EE" : "#FBF6EA", border: "1px solid " + (overdue ? "#E0A090" : T.gold), borderRadius: 8, padding: "5px 10px", fontSize: 12, color: overdue ? T.danger : T.warning, fontWeight: 700, display: "flex", alignItems: "center", gap: 5 }}>
          {overdue ? <><Icon name="alert" size={13} /> Follow-up overdue · {job.follow_up}</> : <><Icon name="calendar" size={13} /> Follow-up today</>}
        </div>
      )}
      {job.notes && <div style={{ marginTop: 8, fontSize: 12, color: T.mutedLight, fontStyle: "italic" }}>"{job.notes.slice(0, 90)}{job.notes.length > 90 ? "…" : ""}"</div>}
    </div>
  );
}

function JobList({ jobs, onSelect }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");
  const filtered = jobs.filter(j => {
    const s = search.toLowerCase();
    return (!s || j.company.toLowerCase().includes(s) || (j.contact || "").toLowerCase().includes(s) || (j.job_site || "").toLowerCase().includes(s)) && (filter === "All" || j.status === filter);
  });
  return (
    <div style={{ paddingBottom: 90 }}>
      <Header title={CONFIG.jobsLabel} sub={jobs.length + " total"} />
      <div style={{ padding: "14px 16px 0" }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search jobs, contacts, sites…"
          style={{ width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 14, background: T.card, boxSizing: "border-box", marginBottom: 12, outline: "none" }} />
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 12 }}>
          {["All", ...CONFIG.statuses].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ whiteSpace: "nowrap", padding: "5px 13px", borderRadius: 20, border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700, background: filter === s ? T.steel : T.card, color: filter === s ? T.gold : T.muted }}>{s}</button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: T.mutedLight, marginBottom: 10, fontWeight: 600 }}>{filtered.length} {filtered.length === 1 ? "job" : "jobs"}</div>
        {filtered.length === 0
          ? <div style={{ textAlign: "center", padding: 50, color: T.mutedLight }}><div style={{ display: "flex", justifyContent: "center" }}><Icon name="jobs" size={36} stroke={1.5} /></div><div style={{ marginTop: 8 }}>No jobs found</div></div>
          : filtered.map(j => <JobCard key={j.id} job={j} onClick={onSelect} />)}
      </div>
    </div>
  );
}

// ─── INVOICE BUILDER ──────────────────────────────────────────────────────────
function InvoiceBuilder({ job, onClose, standalone, allJobs, userId }) {
  useSwipeBack(onClose);
  const [invoiceNum] = useState("INV-" + Date.now().toString().slice(-6));
  const [client, setClient] = useState({
    company: job?.company || "",
    contact: job?.contact || "",
    email: "",
    phone: job?.phone || "",
    street: job?.job_site || "",
    town: "",
  });
  const [showSuggest, setShowSuggest] = useState(false);
  const [items, setItems] = useState([
    { desc: job?.type || "Services", qty: 1, rate: Number(job?.bid) || 0 }
  ]);
  const [taxRate, setTaxRate] = useState(0);
  const [notes, setNotes] = useState("Thank you for your business.");
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date(Date.now() + 30 * 86400000);
    return d.toISOString().split("T")[0];
  });
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentInfo, setSentInfo] = useState(null);

  // Autocomplete: filter existing jobs by what's typed
  const suggestions = standalone && client.company.length > 0
    ? (allJobs || []).filter(j => {
        const q = client.company.toLowerCase();
        return (j.company || "").toLowerCase().includes(q) || (j.contact || "").toLowerCase().includes(q);
      }).slice(0, 5)
    : [];

  const pickSuggestion = (j) => {
    setClient(c => ({ ...c, company: j.company || "", contact: j.contact || "", street: j.job_site || "" }));
    setShowSuggest(false);
  };

  const updateItem = (i, field, val) => {
    setItems(items.map((item, idx) => idx === i ? { ...item, [field]: val } : item));
  };
  const addItem = () => setItems([...items, { desc: "", qty: 1, rate: 0 }]);
  const removeItem = (i) => setItems(items.filter((_, idx) => idx !== i));

  const subtotal = items.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.rate) || 0), 0);
  const tax = subtotal * (Number(taxRate) || 0) / 100;
  const total = subtotal + tax;

  const sendInvoice = async () => {
    if (total <= 0) { alert("Invoice total must be greater than $0."); return; }
    setSending(true);
    try {
      const res = await fetch("/api/send-invoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          customerEmail: client.email,
          customerName: client.contact || client.company,
          items,
          taxRate,
          memo: notes,
          jobId: job?.id || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        setSentInfo({ paymentUrl: data.paymentUrl });
      } else {
        alert("Could not create payment link: " + (data.error || "unknown error"));
      }
    } catch (e) {
      alert("Could not create payment link. Try again.");
    }
    setSending(false);
  };

  const copyLink = () => {
    if (sentInfo?.paymentUrl) {
      navigator.clipboard?.writeText(sentInfo.paymentUrl).then(
        () => alert("Payment link copied"),
        () => {}
      );
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      if (!window.jspdf) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      doc.setFontSize(22);
      doc.setFont(undefined, "bold");
      doc.text(CONFIG.companyName, 20, 25);
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(CONFIG.companySubtitle, 20, 32);

      doc.setFontSize(28);
      doc.setFont(undefined, "bold");
      doc.text("INVOICE", 190, 25, { align: "right" });
      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(invoiceNum, 190, 32, { align: "right" });

      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("BILL TO", 20, 50);
      doc.setFont(undefined, "normal");
      doc.setFontSize(10);
      doc.text(client.company || "", 20, 57);
      if (client.contact) doc.text(client.contact, 20, 63);
      let addrY = 69;
      if (client.street) { doc.text(client.street, 20, addrY); addrY += 6; }
      const cityLine = [client.town, "Idaho"].filter(Boolean).join(", ");
      if (cityLine) doc.text(cityLine, 20, addrY);

      doc.setFontSize(10);
      doc.text("Date: " + todayStr(), 190, 57, { align: "right" });
      doc.text("Due: " + dueDate, 190, 63, { align: "right" });

      let y = 85;
      doc.setFillColor(26, 26, 26);
      doc.rect(20, y - 6, 170, 9, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(undefined, "bold");
      doc.setFontSize(9);
      doc.text("DESCRIPTION", 23, y);
      doc.text("QTY", 130, y, { align: "right" });
      doc.text("RATE", 155, y, { align: "right" });
      doc.text("AMOUNT", 187, y, { align: "right" });

      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, "normal");
      y += 10;
      items.forEach(it => {
        const amt = (Number(it.qty) || 0) * (Number(it.rate) || 0);
        doc.text(String(it.desc || ""), 23, y);
        doc.text(String(it.qty), 130, y, { align: "right" });
        doc.text("$" + Number(it.rate).toLocaleString(), 155, y, { align: "right" });
        doc.text("$" + amt.toLocaleString(), 187, y, { align: "right" });
        y += 8;
      });

      y += 5;
      doc.line(120, y, 190, y);
      y += 7;
      doc.text("Subtotal:", 155, y, { align: "right" });
      doc.text("$" + subtotal.toLocaleString(), 187, y, { align: "right" });
      if (tax > 0) {
        y += 7;
        doc.text(`Tax (${taxRate}%):`, 155, y, { align: "right" });
        doc.text("$" + tax.toLocaleString(), 187, y, { align: "right" });
      }
      y += 9;
      doc.setFont(undefined, "bold");
      doc.setFontSize(12);
      doc.text("TOTAL:", 155, y, { align: "right" });
      doc.text("$" + total.toLocaleString(), 187, y, { align: "right" });

      if (notes) {
        y += 20;
        doc.setFont(undefined, "normal");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 100);
        doc.text(notes, 20, y);
      }

      doc.save(`${invoiceNum}-${client.company || "invoice"}.pdf`);
    } catch (e) {
      alert("Error generating PDF. Try again.");
      console.error(e);
    }
    setGenerating(false);
  };

  const lbl = { fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };
  const inp = { width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid " + T.cardBorder, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff" };

  return (
    <div style={{ position: "fixed", top: 0, bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: T.bg, zIndex: 300, overflowY: "auto" }}>
      <div style={{ background: T.steel, paddingLeft: 16, paddingRight: 16, paddingBottom: 16, paddingTop: "calc(14px + env(safe-area-inset-top))", borderBottom: "3px solid " + T.gold }}>
        <button onClick={onClose} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: T.gold, cursor: "pointer", padding: "6px 12px", marginBottom: 10, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="back" size={18} /> <span style={{ fontSize: 13, fontWeight: 700 }}>Back</span></button>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white }}>Create Invoice</div>
        <div style={{ fontSize: 12, color: T.mutedLight, marginTop: 2 }}>{invoiceNum}{client.company ? " · " + client.company : ""}</div>
      </div>

      <div style={{ padding: "16px 16px 40px", maxWidth: 480, margin: "0 auto" }}>
        {/* Bill To / Client info */}
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: "1px solid " + T.cardBorder, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.steel, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Bill To</div>
          <div style={{ marginBottom: 12, position: "relative" }}>
            <label style={lbl}>Company / Name</label>
            <input
              value={client.company}
              onChange={e => { setClient({ ...client, company: e.target.value }); setShowSuggest(true); }}
              onFocus={() => setShowSuggest(true)}
              placeholder="Client name or company"
              autoComplete="off"
              style={inp}
            />
            {standalone && showSuggest && suggestions.length > 0 && (
              <div style={{ position: "absolute", top: "100%", left: 0, right: 0, background: "#fff", border: "1px solid " + T.cardBorder, borderRadius: 8, marginTop: 4, zIndex: 10, boxShadow: "0 4px 12px #0002", overflow: "hidden" }}>
                {suggestions.map(s => (
                  <div key={s.id} onClick={() => pickSuggestion(s)} style={{ padding: "10px 12px", borderBottom: "1px solid " + T.cardBorder, cursor: "pointer", fontSize: 14 }}>
                    <div style={{ fontWeight: 700, color: T.steel }}>{s.company}</div>
                    {s.contact && <div style={{ fontSize: 12, color: T.muted }}>{s.contact}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Contact Name</label>
            <input value={client.contact} onChange={e => setClient({ ...client, contact: e.target.value })} placeholder="Contact person" autoComplete="off" style={inp} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Email <span style={{ color: T.mutedLight, fontWeight: 400, textTransform: "none", fontSize: 11 }}>— required to send invoice</span></label>
            <input type="email" value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} placeholder="customer@email.com" autoComplete="off" style={inp} />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={lbl}>Street Address</label>
            <input value={client.street} onChange={e => setClient({ ...client, street: e.target.value })} placeholder="1234 Timber Ridge Rd" autoComplete="off" style={inp} />
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <div style={{ flex: 2 }}>
              <label style={lbl}>Town</label>
              <input value={client.town} onChange={e => setClient({ ...client, town: e.target.value })} placeholder="Sandpoint" autoComplete="off" style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>State</label>
              <div style={{ ...inp, background: T.bg, color: T.muted, display: "flex", alignItems: "center" }}>Idaho</div>
            </div>
          </div>
        </div>

        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: "1px solid " + T.cardBorder, marginBottom: 14 }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: T.steel, textTransform: "uppercase", letterSpacing: 1, marginBottom: 14 }}>Line Items</div>
          {items.map((it, i) => (
            <div key={i} style={{ marginBottom: 14, paddingBottom: 14, borderBottom: i < items.length - 1 ? "1px solid " + T.cardBorder : "none" }}>
              <input value={it.desc} onChange={e => updateItem(i, "desc", e.target.value)} placeholder="Description" style={{ ...inp, marginBottom: 8 }} />
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Qty</label>
                  <input type="number" value={it.qty} onChange={e => updateItem(i, "qty", e.target.value)} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Rate</label>
                  <input type="number" value={it.rate} onChange={e => updateItem(i, "rate", e.target.value)} style={inp} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={lbl}>Amount</label>
                  <div style={{ fontSize: 14, fontWeight: 800, color: T.gold, padding: "10px 0" }}>{fmt$((Number(it.qty) || 0) * (Number(it.rate) || 0))}</div>
                </div>
                {items.length > 1 && (
                  <button onClick={() => removeItem(i)} style={{ background: "none", border: "none", cursor: "pointer", color: T.danger, padding: 4, display: "flex", alignItems: "center" }}><Icon name="trash" size={18} /></button>
                )}
              </div>
            </div>
          ))}
          <button onClick={addItem} style={{ width: "100%", background: T.bg, color: T.steel, border: "1px dashed " + T.cardBorder, borderRadius: 8, padding: 10, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>+ Add Line Item</button>
        </div>

        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: "1px solid " + T.cardBorder, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 12, marginBottom: 14 }}>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Tax Rate (%)</label>
              <input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} style={inp} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={lbl}>Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inp} />
            </div>
          </div>
          <label style={lbl}>Notes</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inp, resize: "vertical" }} />
        </div>

        <div style={{ background: T.steel, borderRadius: 14, padding: 18, marginBottom: 14, border: "3px solid " + T.gold }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
            <span style={{ fontSize: 13, color: T.mutedLight }}>Subtotal</span>
            <span style={{ fontSize: 14, color: T.white, fontWeight: 600 }}>{fmt$(subtotal)}</span>
          </div>
          {tax > 0 && (
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 13, color: T.mutedLight }}>Tax ({taxRate}%)</span>
              <span style={{ fontSize: 14, color: T.white, fontWeight: 600 }}>{fmt$(tax)}</span>
            </div>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: "1px solid #333" }}>
            <span style={{ fontSize: 15, color: T.gold, fontWeight: 800 }}>TOTAL</span>
            <span style={{ fontSize: 22, color: T.gold, fontWeight: 900 }}>{fmt$(total)}</span>
          </div>
        </div>

        {sentInfo ? (
          <div style={{ background: "#EBF5EE", border: "1px solid #3A8A56", borderRadius: 12, padding: 16, marginBottom: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.success, fontWeight: 800, fontSize: 15, marginBottom: 8 }}>
              <Icon name="check" size={18} /> Payment Link Ready
            </div>
            <div style={{ fontSize: 12, color: T.muted, marginBottom: 8, wordBreak: "break-all", background: "#fff", border: "1px solid " + T.cardBorder, borderRadius: 8, padding: "8px 10px" }}>{sentInfo.paymentUrl}</div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button onClick={copyLink} style={{ flex: 1, minWidth: 90, background: T.steel, color: T.gold, border: "none", borderRadius: 8, padding: "10px", fontWeight: 800, fontSize: 13, cursor: "pointer" }}>Copy Link</button>
              <a href={`sms:${client.phone || ""}?&body=${encodeURIComponent("Here's your invoice from " + CONFIG.companyName + ": " + sentInfo.paymentUrl)}`} style={{ flex: 1, minWidth: 90, background: T.gold, color: T.steel, borderRadius: 8, padding: "10px", fontWeight: 800, fontSize: 13, textDecoration: "none", textAlign: "center" }}>Text</a>
              <a href={`mailto:${client.email || ""}?subject=${encodeURIComponent("Invoice from " + CONFIG.companyName)}&body=${encodeURIComponent("Here's your invoice. Pay securely here: " + sentInfo.paymentUrl)}`} style={{ flex: 1, minWidth: 90, background: T.gold, color: T.steel, borderRadius: 8, padding: "10px", fontWeight: 800, fontSize: 13, textDecoration: "none", textAlign: "center" }}>Email</a>
            </div>
          </div>
        ) : (
          <button onClick={sendInvoice} disabled={sending} style={{ width: "100%", background: T.success, color: "#fff", border: "none", borderRadius: 12, padding: 15, fontWeight: 900, fontSize: 16, cursor: "pointer", marginBottom: 10, opacity: sending ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            {sending ? "Creating..." : <><Icon name="card" size={18} /> Create Payment Link</>}
          </button>
        )}

        <button onClick={generatePDF} disabled={generating} style={{ width: "100%", background: T.gold, color: T.steel, border: "none", borderRadius: 12, padding: 15, fontWeight: 900, fontSize: 16, cursor: "pointer", marginBottom: 10, opacity: generating ? 0.7 : 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          {generating ? "Generating..." : <><Icon name="invoice" size={18} /> Download PDF</>}
        </button>
        <div style={{ fontSize: 12, color: T.muted, textAlign: "center" }}>A 0.5% platform fee applies to paid invoices.</div>
      </div>
    </div>
  );
}

// ─── JOB DETAIL WITH NOTES HISTORY ───────────────────────────────────────────
function JobDetail({ job, onBack, onSave, onDelete, userId }) {
  const [form, setForm] = useState({ ...job });
  const [editingField, setEditingField] = useState(null); // which field key is being edited
  const [draft, setDraft] = useState("");                  // temp value while editing
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(true);
  const [showInvoice, setShowInvoice] = useState(false);

  // Swipe back to job list — but not while the invoice overlay or an inline edit is open
  useSwipeBack(() => { if (!showInvoice && !editingField) onBack(); });

  useEffect(() => {
    supabase.from("job_notes").select("*").eq("job_id", job.id).order("created_at", { ascending: false })
      .then(({ data }) => { setNotes(data || []); setLoadingNotes(false); });
  }, [job.id]);

  const addNote = async () => {
    if (!newNote.trim()) return;
    const { data, error } = await supabase.from("job_notes").insert([{ job_id: job.id, user_id: userId, note: newNote.trim() }]).select().single();
    if (!error) { setNotes(n => [data, ...n]); setNewNote(""); }
  };

  const deleteNote = async (id) => {
    const { error } = await supabase.from("job_notes").delete().eq("id", id);
    if (!error) setNotes(n => n.filter(note => note.id !== id));
  };

  const startEdit = (k, currentVal) => { setEditingField(k); setDraft(currentVal == null ? "" : String(currentVal)); };
  const cancelEdit = () => { setEditingField(null); setDraft(""); };
  const confirmEdit = (k) => {
    const updated = { ...form, [k]: draft };
    setForm(updated);
    setEditingField(null);
    setDraft("");
    onSave(updated); // persist immediately
  };

  const rowDiv = { paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid " + T.cardBorder };
  const rowLbl = { fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };

  // Inline-editable row. `display` is what shows when not editing; `inputType` drives the editor.
  const EditRow = ({ label, k, inputType = "text", options = null, autoComplete, displayVal, valColor, valWeight }) => {
    const isEditing = editingField === k;
    return (
      <div style={rowDiv}>
        <label style={rowLbl}>{label}</label>
        {isEditing ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {options
              ? <select value={draft} onChange={e => setDraft(e.target.value)} style={{ ...selStyle, flex: 1 }} autoFocus>{options.map(o => <option key={o} value={o}>{o || "—"}</option>)}</select>
              : <input type={inputType} value={draft} onChange={e => setDraft(e.target.value)} autoComplete={autoComplete || "on"} autoFocus style={{ ...inpStyle, flex: 1 }} />
            }
            <button onClick={() => confirmEdit(k)} style={{ background: T.success, color: "#fff", border: "none", borderRadius: 8, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="check" size={18} /></button>
            <button onClick={cancelEdit} style={{ background: "#FBF0EE", color: T.danger, border: "1px solid #E0A090", borderRadius: 8, width: 38, height: 38, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Icon name="close" size={18} /></button>
          </div>
        ) : (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <div style={{ fontSize: 15, color: valColor || T.steel, fontWeight: valWeight || 500, flex: 1 }}>{displayVal != null ? displayVal : (form[k] || "—")}</div>
            <button onClick={() => startEdit(k, form[k])} style={{ background: "none", border: "none", color: T.mutedLight, cursor: "pointer", padding: 4, flexShrink: 0 }} title={"Edit " + label}><Icon name="pencil" size={16} /></button>
          </div>
        )}
      </div>
    );
  };

  const fmtTimeDisplay = form.follow_up_time
    ? (() => { const [h,m] = form.follow_up_time.split(":"); const hour = parseInt(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`; })()
    : "8:00 AM (default)";

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: T.steel, paddingLeft: 16, paddingRight: 16, paddingBottom: 16, paddingTop: "calc(14px + env(safe-area-inset-top))", borderBottom: "3px solid " + T.gold }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.mutedLight, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 5 }}><Icon name="back" size={15} /> Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white }}>{job.company}</div>
        <div style={{ marginTop: 6 }}><Badge status={form.status} /></div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          <button onClick={() => setShowInvoice(true)} style={{ flex: 1, background: T.steel, color: T.gold, border: "2px solid " + T.gold, borderRadius: 10, padding: 12, fontWeight: 800, cursor: "pointer", fontSize: 14, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}><Icon name="invoice" size={16} /> Create Invoice</button>
          <a href={"tel:" + job.phone} style={{ background: T.gold, color: T.steel, borderRadius: 10, padding: "12px 16px", textDecoration: "none", display: "flex", alignItems: "center" }}><Icon name="phone" size={20} /></a>
          <a href={"sms:" + job.phone} style={{ background: T.steelMid, color: T.white, borderRadius: 10, padding: "12px 16px", textDecoration: "none", display: "flex", alignItems: "center" }}><Icon name="message" size={20} /></a>
        </div>

        <div style={{ background: T.card, borderRadius: 14, padding: "16px 16px 2px", border: "1px solid " + T.cardBorder, marginBottom: 14 }}>
          <EditRow label="Company"          k="company" />
          <EditRow label="Contact"          k="contact" />
          <EditRow label="Phone"            k="phone" inputType="tel" />
          <EditRow label="Job Site Address" k="job_site" autoComplete="off" />
          <EditRow label="Bid Amount"       k="bid" inputType="number" displayVal={fmt$(form.bid)} valColor={T.gold} valWeight={900} />
          <EditRow label="Follow-up Date"   k="follow_up" inputType="date" />
          <EditRow label="Follow-up Time"   k="follow_up_time" inputType="time" displayVal={fmtTimeDisplay} />
          <EditRow label="Job Type"         k="type"   options={CONFIG.jobTypes} />
          <EditRow label="Status"           k="status" options={CONFIG.statuses} />
          <EditRow label="Crew"             k="crew"   options={["", ...CONFIG.crews]} />
        </div>

        {/* Notes History */}
        <div style={{ background: T.card, borderRadius: 14, border: "1px solid " + T.cardBorder, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ background: T.steel, padding: "10px 16px", borderBottom: "2px solid " + T.gold }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, letterSpacing: 1, textTransform: "uppercase", display: "flex", alignItems: "center", gap: 6 }}><Icon name="note" size={14} /> Notes History</div>
          </div>

          <div style={{ padding: 14 }}>
            <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
              <input value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note…"
                onKeyDown={e => e.key === "Enter" && addNote()}
                style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 14, outline: "none" }} />
              <button onClick={addNote} style={{ background: T.gold, color: T.steel, border: "none", borderRadius: 10, padding: "10px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Add</button>
            </div>

            {loadingNotes ? (
              <div style={{ textAlign: "center", padding: 20, color: T.mutedLight, fontSize: 13 }}>Loading…</div>
            ) : notes.length === 0 ? (
              <div style={{ textAlign: "center", padding: 20, color: T.mutedLight, fontSize: 13 }}>No notes yet — add your first one above.</div>
            ) : notes.map(n => (
              <div key={n.id} style={{ borderBottom: "1px solid " + T.cardBorder, paddingBottom: 12, marginBottom: 12, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, color: T.steel, lineHeight: 1.5 }}>{n.note}</div>
                  <div style={{ fontSize: 11, color: T.mutedLight, marginTop: 4 }}>{fmtTime(n.created_at)}</div>
                </div>
                <button onClick={() => { if (window.confirm("Delete this note?")) deleteNote(n.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.mutedLight, padding: "2px 4px", flexShrink: 0, display: "flex", alignItems: "center" }} title="Delete note"><Icon name="trash" size={16} /></button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { if (window.confirm("Delete this job?")) onDelete(job.id); }} style={{ width: "100%", background: "#FBF0EE", color: T.danger, border: "1px solid #E0A090", borderRadius: 10, padding: 12, fontWeight: 700, cursor: "pointer", fontSize: 14, marginBottom: 40 }}>
          Delete Job
        </button>
      </div>
      {showInvoice && <InvoiceBuilder job={job} userId={userId} onClose={() => setShowInvoice(false)} />}
    </div>
  );
}

const inpStyle = { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 14, boxSizing: "border-box", outline: "none", background: "#fff" };
const selStyle = { width: "100%", padding: "11px 12px", borderRadius: 10, border: "1px solid " + T.cardBorder, fontSize: 14, background: T.bg, boxSizing: "border-box" };
const lblStyle = { fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };
const fldStyle = { marginBottom: 14 };

function AddJob({ onSave, onCancel, userId }) {
  const [form, setForm] = useState({ ...EMPTY });
  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div style={{ paddingBottom: 90, minHeight: "100vh" }}>
      <Header title={"New " + CONFIG.jobLabel} sub="Fill in what you know — edit anytime." />
      <div style={{ padding: "16px 16px 0", maxWidth: 420, margin: "0 auto" }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 16, border: "1px solid " + T.cardBorder, marginBottom: 14 }}>
          <div style={fldStyle}><label style={lblStyle}>Company Name *</label><input style={inpStyle} value={form.company} onChange={set("company")} placeholder="Ridgeline Builders" /></div>
          <div style={fldStyle}><label style={lblStyle}>Contact Name</label><input style={inpStyle} value={form.contact} onChange={set("contact")} placeholder="Mike Hendricks" /></div>
          <div style={fldStyle}><label style={lblStyle}>Phone — iOS suggests from contacts</label><input style={inpStyle} type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} placeholder="208-555-0100" /></div>
          <div style={fldStyle}><label style={lblStyle}>Job Site Address</label><input style={inpStyle} value={form.job_site} onChange={set("job_site")} autoComplete="off" placeholder="1234 Timber Ridge Rd" /></div>
          <div style={fldStyle}><label style={lblStyle}>Job Type</label>
            <select style={selStyle} value={form.type} onChange={set("type")}>
              {["", ...CONFIG.jobTypes].map(o => <option key={o} value={o}>{o || "—"}</option>)}
            </select>
          </div>
          <div style={fldStyle}><label style={lblStyle}>Bid Amount</label><input style={inpStyle} type="number" value={form.bid} onChange={set("bid")} placeholder="0" /></div>
          <div style={fldStyle}><label style={lblStyle}>Status</label>
            <select style={selStyle} value={form.status} onChange={set("status")}>
              {CONFIG.statuses.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>
          <div style={fldStyle}><label style={lblStyle}>Crew</label>
            <select style={selStyle} value={form.crew} onChange={set("crew")}>
              {["", ...CONFIG.crews].map(o => <option key={o} value={o}>{o || "—"}</option>)}
            </select>
          </div>
          <div style={fldStyle}><label style={lblStyle}>Follow-up Date</label><input style={inpStyle} type="date" value={form.follow_up} onChange={set("follow_up")} /></div>
          <div style={fldStyle}>
            <label style={lblStyle}>Follow-up Time <span style={{ color: T.mutedLight, fontWeight: 400, textTransform: "none", fontSize: 11 }}>— defaults to 8:00 AM</span></label>
            <input style={inpStyle} type="time" value={form.follow_up_time} onChange={set("follow_up_time")} />
          </div>
          <div style={fldStyle}><label style={lblStyle}>Notes</label><textarea style={{ ...inpStyle, resize: "vertical" }} rows={3} value={form.notes} onChange={set("notes")} placeholder="Any details…" /></div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={() => { if (!form.company) { alert("Company name required"); return; } onSave({ ...form, bid: Number(form.bid) || 0 }); }}
            style={{ flex: 2, background: T.gold, color: T.steel, border: "none", borderRadius: 12, padding: 14, fontWeight: 900, cursor: "pointer", fontSize: 16 }}>
            Add {CONFIG.jobLabel}
          </button>
          <button onClick={onCancel} style={{ flex: 1, background: T.card, color: T.muted, border: "1px solid " + T.cardBorder, borderRadius: 12, padding: 14, fontWeight: 700, cursor: "pointer", fontSize: 16 }}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function FollowUps({ jobs, onSelect }) {
  const today = todayStr();
  const active = jobs.filter(j => !["Complete", "Invoiced"].includes(j.status));
  const overdue  = active.filter(j => j.follow_up && j.follow_up < today).sort((a, b) => a.follow_up.localeCompare(b.follow_up));
  const dueToday = active.filter(j => j.follow_up === today);
  const upcoming = active.filter(j => j.follow_up && j.follow_up > today).sort((a, b) => a.follow_up.localeCompare(b.follow_up));

  const Section = ({ title, items, color, accent }) => !items.length ? null : (
    <div style={{ marginBottom: 20 }}>
      <div style={{ fontSize: 11, fontWeight: 800, color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>{title} ({items.length})</div>
      {items.map(j => (
        <div key={j.id} onClick={() => onSelect(j)} style={{ background: T.card, borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid " + T.cardBorder, borderLeft: "4px solid " + accent, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, color: T.steel, fontSize: 14 }}>{j.company}</div>
            <div style={{ fontSize: 12, color: T.muted, marginTop: 3, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              <span>{j.contact}</span><Badge status={j.status} />
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color }}>{j.follow_up}</div>
            <div style={{ fontSize: 11, color: T.mutedLight, display: "flex", alignItems: "center", gap: 4 }}><Icon name="clock" size={12} /> {j.follow_up_time ? (() => { const [h,m] = j.follow_up_time.split(":"); const hour = parseInt(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`; })() : "8:00 AM"}</div>
            <a href={"tel:" + j.phone} onClick={e => e.stopPropagation()} style={{ background: T.gold, color: T.steel, borderRadius: 7, padding: "6px 10px", textDecoration: "none", display: "flex", alignItems: "center" }}><Icon name="phone" size={14} /></a>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div style={{ paddingBottom: 90 }}>
      <Header title="Follow-ups" sub="Stay on every lead." />
      <div style={{ padding: "16px 16px 0" }}>
        <Section title="Overdue"   items={overdue}  color={T.danger}  accent={T.danger} />
        <Section title="Due Today" items={dueToday} color={T.warning} accent={T.gold} />
        <Section title="Upcoming"  items={upcoming} color={T.success} accent={T.success} />
        {!overdue.length && !dueToday.length && !upcoming.length && (
          <div style={{ textAlign: "center", padding: 60, color: T.mutedLight }}>
            <div style={{ display: "flex", justifyContent: "center", color: T.success }}><Icon name="check" size={40} stroke={2.5} /></div>
            <div style={{ marginTop: 10, fontSize: 14 }}>All clear — no follow-ups scheduled.</div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PAYMENTS / STRIPE CONNECT SCREEN ─────────────────────────────────────────
function PaymentsScreen({ onBack, userId, userEmail }) {
  useSwipeBack(onBack);
  const [status, setStatus] = useState("loading"); // loading | not_connected | pending | connected
  const [working, setWorking] = useState(false);

  const checkStatus = async () => {
    try {
      const res = await fetch("/api/stripe-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      const data = await res.json();
      if (!data.connected) setStatus("not_connected");
      else if (data.onboarded) setStatus("connected");
      else setStatus("pending");
    } catch (e) {
      setStatus("not_connected");
    }
  };

  useEffect(() => { checkStatus(); }, []);

  const startOnboarding = async () => {
    setWorking(true);
    try {
      const res = await fetch("/api/stripe-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, email: userEmail, returnUrl: window.location.href }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Could not start setup: " + (data.error || "unknown error"));
        setWorking(false);
      }
    } catch (e) {
      alert("Could not connect to Stripe. Try again.");
      setWorking(false);
    }
  };

  return (
    <div style={{ minHeight: "100dvh", background: T.bg, paddingBottom: 90 }}>
      <div style={{ background: T.steel, paddingLeft: 16, paddingRight: 16, paddingBottom: 16, paddingTop: "calc(14px + env(safe-area-inset-top))", borderBottom: "3px solid " + T.gold }}>
        <button onClick={onBack} style={{ background: "rgba(255,255,255,0.1)", border: "none", color: T.gold, fontSize: 13, fontWeight: 700, cursor: "pointer", padding: "6px 12px", marginBottom: 10, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="back" size={15} /> Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white }}>Payments</div>
        <div style={{ fontSize: 12, color: T.mutedLight, marginTop: 2 }}>Connect Stripe to send payable invoices.</div>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: T.card, borderRadius: 14, padding: 20, border: "1px solid " + T.cardBorder, textAlign: "center" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 14, color: status === "connected" ? T.success : T.gold }}>
            <Icon name={status === "connected" ? "check" : "card"} size={40} stroke={1.8} />
          </div>

          {status === "loading" && <div style={{ color: T.muted, fontSize: 14 }}>Checking status…</div>}

          {status === "not_connected" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.steel, marginBottom: 6 }}>Accept payments on invoices</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.5 }}>Connect your Stripe account so customers can pay invoices online. Payouts go straight to your bank.</div>
              <button onClick={startOnboarding} disabled={working} style={{ width: "100%", background: T.gold, color: T.steel, border: "none", borderRadius: 10, padding: 14, fontWeight: 900, fontSize: 15, cursor: "pointer", opacity: working ? 0.7 : 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {working ? "Opening Stripe…" : <>Connect Stripe <Icon name="external" size={16} /></>}
              </button>
            </>
          )}

          {status === "pending" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.steel, marginBottom: 6 }}>Setup incomplete</div>
              <div style={{ fontSize: 13, color: T.muted, marginBottom: 18, lineHeight: 1.5 }}>You started connecting but Stripe still needs a few details before you can accept payments.</div>
              <button onClick={startOnboarding} disabled={working} style={{ width: "100%", background: T.gold, color: T.steel, border: "none", borderRadius: 10, padding: 14, fontWeight: 900, fontSize: 15, cursor: "pointer", opacity: working ? 0.7 : 1 }}>
                {working ? "Opening Stripe…" : "Finish Setup"}
              </button>
            </>
          )}

          {status === "connected" && (
            <>
              <div style={{ fontSize: 16, fontWeight: 800, color: T.success, marginBottom: 6 }}>Stripe Connected</div>
              <div style={{ fontSize: 13, color: T.muted, lineHeight: 1.5 }}>You're all set. Invoices you send can now be paid online, and payouts go to your bank.</div>
            </>
          )}
        </div>

        {status !== "loading" && status !== "connected" && (
          <button onClick={checkStatus} style={{ width: "100%", background: "none", border: "none", color: T.muted, fontSize: 12, marginTop: 14, cursor: "pointer", textDecoration: "underline" }}>Refresh status</button>
        )}
      </div>
    </div>
  );
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState([]);
  const [tab, setTab] = useState("dashboard");
  const [selected, setSelected] = useState(null);
  const [toast, setToast] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [showStandaloneInvoice, setShowStandaloneInvoice] = useState(false);
  const [showPayments, setShowPayments] = useState(false);

  const showToast = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("jobs").select("*").order("created_at", { ascending: false }).then(({ data, error }) => { if (!error) setJobs(data || []); });
    // Tag user in OneSignal for targeted notifications
    if (window.OneSignalDeferred) {
      window.OneSignalDeferred.push(async (OneSignal) => {
        try { await OneSignal.User.addTag('user_id', session.user.id); } catch(e) {}
      });
    }
  }, [session]);

  const handleAdd = async (form) => {
    const { data, error } = await supabase.from("jobs").insert([{ ...form, user_id: session.user.id }]).select().single();
    if (error) { showToast("Error saving job", "error"); return; }
    setJobs(js => [data, ...js]); setTab("jobs"); showToast(data.company + " added");
  };

  const handleQuickAdd = (job) => { setJobs(js => [job, ...js]); showToast(job.company + " added to call-backs"); };

  const handleSave = async (updated) => {
    const { error } = await supabase.from("jobs").update(updated).eq("id", updated.id);
    if (error) { showToast("Error updating", "error"); return; }
    setJobs(js => js.map(j => j.id === updated.id ? updated : j)); setSelected(updated); showToast("Job updated");
  };

  const handleDelete = async (id) => {
    const { error } = await supabase.from("jobs").delete().eq("id", id);
    if (error) { showToast("Error deleting", "error"); return; }
    setJobs(js => js.filter(j => j.id !== id)); setSelected(null); setTab("jobs"); showToast("Job deleted");
  };

  const handleSignOut = async () => { await supabase.auth.signOut(); setJobs([]); setSelected(null); setTab("dashboard"); };

  const root = { maxWidth: 480, margin: "0 auto", minHeight: "100dvh", background: T.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", position: "relative" };

  if (loading) return <div style={{ ...root, display: "flex", alignItems: "center", justifyContent: "center", background: T.steel }}><div style={{ color: T.gold, fontSize: 16, fontWeight: 700 }}>Loading…</div></div>;
  if (!session) return <Login />;

  return (
    <div style={root}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showQuickAdd && <QuickAdd onSave={handleQuickAdd} onClose={() => setShowQuickAdd(false)} userId={session.user.id} />}
      {showStandaloneInvoice && <InvoiceBuilder job={null} standalone={true} allJobs={jobs} userId={session.user.id} onClose={() => setShowStandaloneInvoice(false)} />}
      {showPayments ? (
        <PaymentsScreen onBack={() => setShowPayments(false)} userId={session.user.id} userEmail={session.user.email} />
      ) : selected ? (
        <JobDetail job={selected} onBack={() => setSelected(null)} onSave={handleSave} onDelete={handleDelete} userId={session.user.id} />
      ) : (
        <>
          {tab === "dashboard" && <Dashboard jobs={jobs} onJobSelect={setSelected} onSignOut={handleSignOut} onQuickAdd={() => setShowQuickAdd(true)} userId={session.user.id} onOpenSettings={() => setShowPayments(true)} />}
          {tab === "jobs"      && <JobList jobs={jobs} onSelect={setSelected} />}
          {tab === "add"       && <AddJob onSave={handleAdd} onCancel={() => setTab("jobs")} userId={session.user.id} />}
          {tab === "followups" && <FollowUps jobs={jobs} onSelect={setSelected} />}
        </>
      )}
      {!selected && <BottomNav tab={tab} setTab={(t) => { setShowPayments(false); setTab(t); }} onCreateInvoice={() => setShowStandaloneInvoice(true)} />}
    </div>
  );
}
