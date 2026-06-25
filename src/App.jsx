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

function BottomNav({ tab, setTab }) {
  const sides = [
    { id: "dashboard", icon: "⊞", label: "Dashboard" },
    { id: "jobs",      icon: "🔨", label: "Jobs" },
  ];
  const right = [
    { id: "followups", icon: "📅", label: "Follow-ups" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: 0, right: 0, maxWidth: 480, margin: "0 auto",
      background: T.steel, borderTop: "3px solid " + T.gold, zIndex: 100,
      display: "flex", alignItems: "flex-start",
      paddingBottom: "env(safe-area-inset-bottom)",
      height: "calc(60px + env(safe-area-inset-bottom))",
    }}>
      {sides.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 0 0",
          height: 60, background: "transparent", color: tab === t.id ? T.gold : T.mutedLight, fontSize: 20,
        }}>
          <span style={{ lineHeight: 1 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}

      {/* Center + button — sits above the nav bar */}
      <div style={{ flex: 1, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6 }}>
        <button onClick={() => setTab("add")} style={{
          width: 44, height: 44, borderRadius: "50%", border: "none", cursor: "pointer",
          background: T.gold, color: T.steel, fontSize: 24, fontWeight: 900,
          display: "flex", alignItems: "center", justifyContent: "center",
          marginTop: -22,
          boxShadow: "0 2px 12px " + T.gold + "99",
        }}>+</button>
      </div>

      {right.map(t => (
        <button key={t.id} onClick={() => setTab(t.id)} style={{
          flex: 1, border: "none", cursor: "pointer", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", gap: 3, padding: "10px 0 0",
          height: 60, background: "transparent", color: tab === t.id ? T.gold : T.mutedLight, fontSize: 20,
        }}>
          <span style={{ lineHeight: 1 }}>{t.icon}</span>
          <span style={{ fontSize: 10, fontWeight: tab === t.id ? 700 : 500 }}>{t.label}</span>
        </button>
      ))}

      {/* Balance right side */}
      <div style={{ flex: 1 }} />
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
function Dashboard({ jobs, onJobSelect, onSignOut, onQuickAdd }) {
  const today = todayStr();
  const active = jobs.filter(j => j.status === "Active").length;
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
        <button onClick={onSignOut} style={{ background: "none", border: "1px solid #444", borderRadius: 8, color: T.mutedLight, fontSize: 11, padding: "5px 10px", cursor: "pointer", fontWeight: 600 }}>Sign Out</button>
      </div>

      {(overdue > 0 || dueToday > 0) && (
        <div style={{ background: "#3A1A10", borderBottom: "2px solid " + T.gold, padding: "10px 18px", display: "flex", alignItems: "center", gap: 8 }}>
          <span>🔔</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F5D8A0" }}>{overdue > 0 && overdue + " overdue"}{overdue > 0 && dueToday > 0 && " · "}{dueToday > 0 && dueToday + " due today"}</span>
        </div>
      )}

      <div style={{ padding: "16px 16px 0" }}>
        {/* Quick Add Button */}
        <button onClick={onQuickAdd} style={{ width: "100%", background: T.steel, color: T.gold, border: "2px solid " + T.gold, borderRadius: 12, padding: "14px", fontWeight: 800, fontSize: 15, cursor: "pointer", marginBottom: 14, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
          📞 Quick Add Call-Back
        </button>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          {[
            { label: "Active Jobs", value: active, color: T.success },
            { label: "Open Leads", value: openLeads, color: "#3A68C8" },
            { label: "Total Pipeline", value: fmt$(pipeline), color: T.steel },
            { label: "Follow-ups Due", value: overdue + dueToday, color: overdue > 0 ? T.danger : T.warning },
          ].map(c => (
            <div key={c.label} style={{ background: T.card, borderRadius: 12, padding: 14, border: "1px solid " + T.cardBorder }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: c.color, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 11, color: T.muted, marginTop: 4, fontWeight: 600 }}>{c.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: T.steel, borderRadius: 14, padding: 18, marginBottom: 14, border: "3px solid " + T.gold }}>
          <div style={{ fontSize: 10, color: T.gold, fontWeight: 800, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>Revenue Overview</div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <div style={{ fontSize: 11, color: T.mutedLight }}>Total Pipeline</div>
              <div style={{ fontSize: 30, fontWeight: 900, color: T.white, lineHeight: 1.1 }}>{fmt$(pipeline)}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 11, color: T.mutedLight }}>Won / Active</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.gold }}>{fmt$(wonValue)}</div>
            </div>
          </div>
          {pipeline > 0 && (
            <div style={{ marginTop: 14, display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden" }}>
              {statBreakdown.map(({ s, val }) => <div key={s} style={{ flex: val / pipeline, background: STATUS_CFG[s] ? STATUS_CFG[s].dot : T.muted, minWidth: val > 0 ? 4 : 0 }} />)}
            </div>
          )}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 14px", marginTop: 10 }}>
            {statBreakdown.map(({ s, count, val }) => (
              <div key={s} style={{ fontSize: 11, color: T.mutedLight }}>
                <span style={{ color: STATUS_CFG[s] ? STATUS_CFG[s].dot : T.muted, fontWeight: 700 }}>● </span>{s} {count} · {fmt$(val)}
              </div>
            ))}
          </div>
        </div>

        {callBacks.length > 0 && (
          <div style={{ background: T.card, borderRadius: 14, border: "1px solid " + T.cardBorder, overflow: "hidden", marginBottom: 14 }}>
            <div style={{ background: "#2A1A08", padding: "10px 16px", borderBottom: "2px solid " + T.gold }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, letterSpacing: 1, textTransform: "uppercase" }}>⚠️ Call-Back Queue</div>
            </div>
            {callBacks.map(j => (
              <div key={j.id} onClick={() => onJobSelect(j)} style={{ padding: "12px 16px", borderBottom: "1px solid " + T.cardBorder, cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 14, color: T.steel }}>{j.company}</div>
                  <div style={{ fontSize: 12, color: T.muted, marginTop: 2 }}>{j.contact} · {j.follow_up}</div>
                </div>
                <a href={"tel:" + j.phone} onClick={e => e.stopPropagation()} style={{ background: T.gold, color: T.steel, borderRadius: 8, padding: "7px 12px", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>📞 Call</a>
              </div>
            ))}
          </div>
        )}

        {jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: 40, color: T.muted }}>
            <div style={{ fontSize: 36 }}>🔨</div>
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
        <div style={{ fontWeight: 800, fontSize: 15, color: T.steel, flex: 1 }}>{job.company}</div>
        <Badge status={job.status} />
      </div>
      <div style={{ fontSize: 12, color: T.muted, marginTop: 5 }}>📍 {job.job_site || "No site set"}</div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 10 }}>
        <div style={{ fontSize: 12, color: T.muted }}>{job.type || "—"}{job.crew ? " · " + job.crew : ""}</div>
        <div style={{ fontWeight: 900, color: T.gold, fontSize: 17 }}>{fmt$(job.bid)}</div>
      </div>
      {(overdue || dueToday) && (
        <div style={{ marginTop: 10, background: overdue ? "#FBF0EE" : "#FBF6EA", border: "1px solid " + (overdue ? "#E0A090" : T.gold), borderRadius: 8, padding: "5px 10px", fontSize: 12, color: overdue ? T.danger : T.warning, fontWeight: 700 }}>
          {overdue ? "⚠️ Follow-up overdue · " + job.follow_up : "📅 Follow-up today"}
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
          ? <div style={{ textAlign: "center", padding: 50, color: T.mutedLight }}><div style={{ fontSize: 36 }}>🔨</div><div style={{ marginTop: 8 }}>No jobs found</div></div>
          : filtered.map(j => <JobCard key={j.id} job={j} onClick={onSelect} />)}
      </div>
    </div>
  );
}

// ─── JOB DETAIL WITH NOTES HISTORY ───────────────────────────────────────────
function JobDetail({ job, onBack, onSave, onDelete, userId }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...job });
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [loadingNotes, setLoadingNotes] = useState(true);
  const setF = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

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

  const handleSave = () => { onSave(form); setEditing(false); };

  const rowDiv = { paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid " + T.cardBorder };
  const rowLbl = { fontSize: 10, fontWeight: 800, color: T.mutedLight, textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, display: "block" };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ background: T.steel, paddingLeft: 16, paddingRight: 16, paddingBottom: 16, paddingTop: "calc(14px + env(safe-area-inset-top))", borderBottom: "3px solid " + T.gold }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: T.mutedLight, fontSize: 13, cursor: "pointer", padding: 0, marginBottom: 8 }}>← Back</button>
        <div style={{ fontSize: 20, fontWeight: 900, color: T.white }}>{job.company}</div>
        <div style={{ marginTop: 6 }}><Badge status={form.status} /></div>
      </div>

      <div style={{ padding: "16px 16px 0" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
          {!editing
            ? <button onClick={() => setEditing(true)} style={{ flex: 1, background: T.steel, color: T.gold, border: "2px solid " + T.gold, borderRadius: 10, padding: 12, fontWeight: 800, cursor: "pointer", fontSize: 14 }}>Edit Job</button>
            : <>
                <button onClick={handleSave} style={{ flex: 2, background: T.gold, color: T.steel, border: "none", borderRadius: 10, padding: 12, fontWeight: 800, cursor: "pointer", fontSize: 14 }}>Save Changes</button>
                <button onClick={() => { setForm({ ...job }); setEditing(false); }} style={{ flex: 1, background: T.bg, color: T.muted, border: "1px solid " + T.cardBorder, borderRadius: 10, padding: 12, fontWeight: 700, cursor: "pointer", fontSize: 14 }}>Cancel</button>
              </>
          }
          <a href={"tel:" + job.phone} style={{ background: T.gold, color: T.steel, borderRadius: 10, padding: "12px 16px", fontWeight: 900, fontSize: 20, textDecoration: "none", display: "flex", alignItems: "center" }}>📞</a>
          <a href={"sms:" + job.phone} style={{ background: T.steelMid, color: T.white, borderRadius: 10, padding: "12px 16px", fontWeight: 900, fontSize: 20, textDecoration: "none", display: "flex", alignItems: "center" }}>💬</a>
        </div>

        <div style={{ background: T.card, borderRadius: 14, padding: "16px 16px 2px", border: "1px solid " + T.cardBorder, marginBottom: 14 }}>
          {[
            { label: "Company",    k: "company",   type: "text" },
            { label: "Contact",    k: "contact",   type: "text" },
            { label: "Phone",      k: "phone",     type: "tel" },
            { label: "Job Site",   k: "job_site",  type: "text" },
            { label: "Bid Amount", k: "bid",       type: "number" },
          ].map(({ label, k, type }) => (
            <div key={k} style={rowDiv}>
              <label style={rowLbl}>{label}</label>
              {editing
                ? <input type={type} value={form[k] || ""} onChange={setF(k)} style={{ ...inpStyle }} />
                : <div style={{ fontSize: 15, color: k === "bid" ? T.gold : T.steel, fontWeight: k === "bid" ? 900 : 500 }}>{k === "bid" ? fmt$(form[k]) : form[k] || "—"}</div>
              }
            </div>
          ))}

          <div style={rowDiv}>
            <label style={rowLbl}>Follow-up Date</label>
            {editing
              ? <input type="date" value={form.follow_up || ""} onChange={setF("follow_up")} style={{ ...inpStyle }} />
              : <div style={{ fontSize: 15, color: T.steel }}>{form.follow_up || "—"}</div>
            }
          </div>
          <div style={rowDiv}>
            <label style={rowLbl}>Follow-up Time <span style={{ color: T.mutedLight, fontWeight: 400, textTransform: "none", fontSize: 11 }}>— defaults to 8:00 AM</span></label>
            {editing
              ? <input type="time" value={form.follow_up_time || ""} onChange={setF("follow_up_time")} style={{ ...inpStyle }} />
              : <div style={{ fontSize: 15, color: T.steel }}>{form.follow_up_time ? (() => { const [h,m] = form.follow_up_time.split(":"); const hour = parseInt(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`; })() : "8:00 AM (default)"}</div>
            }
          </div>

          {/* Job Type select */}
          <div style={rowDiv}>
            <label style={rowLbl}>Job Type</label>
            {editing
              ? <select value={form.type || ""} onChange={setF("type")} style={selStyle}>{CONFIG.jobTypes.map(o => <option key={o} value={o}>{o}</option>)}</select>
              : <div style={{ fontSize: 15, color: T.steel }}>{form.type || "—"}</div>
            }
          </div>

          {/* Status select */}
          <div style={rowDiv}>
            <label style={rowLbl}>Status</label>
            {editing
              ? <select value={form.status || ""} onChange={setF("status")} style={selStyle}>{CONFIG.statuses.map(o => <option key={o} value={o}>{o}</option>)}</select>
              : <div style={{ fontSize: 15, color: T.steel }}>{form.status || "—"}</div>
            }
          </div>

          {/* Crew select */}
          <div style={rowDiv}>
            <label style={rowLbl}>Crew</label>
            {editing
              ? <select value={form.crew || ""} onChange={setF("crew")} style={selStyle}>{["", ...CONFIG.crews].map(o => <option key={o} value={o}>{o || "—"}</option>)}</select>
              : <div style={{ fontSize: 15, color: T.steel }}>{form.crew || "—"}</div>
            }
          </div>
        </div>

        {/* Notes History */}
        <div style={{ background: T.card, borderRadius: 14, border: "1px solid " + T.cardBorder, overflow: "hidden", marginBottom: 14 }}>
          <div style={{ background: T.steel, padding: "10px 16px", borderBottom: "2px solid " + T.gold }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: T.gold, letterSpacing: 1, textTransform: "uppercase" }}>📝 Notes History</div>
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
                <button onClick={() => { if (window.confirm("Delete this note?")) deleteNote(n.id); }} style={{ background: "none", border: "none", cursor: "pointer", color: T.mutedLight, fontSize: 16, padding: "2px 4px", flexShrink: 0, lineHeight: 1 }} title="Delete note">🗑</button>
              </div>
            ))}
          </div>
        </div>

        <button onClick={() => { if (window.confirm("Delete this job?")) onDelete(job.id); }} style={{ width: "100%", background: "#FBF0EE", color: T.danger, border: "1px solid #E0A090", borderRadius: 10, padding: 12, fontWeight: 700, cursor: "pointer", fontSize: 14, marginBottom: 40 }}>
          Delete Job
        </button>
      </div>
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
          <div style={fldStyle}><label style={lblStyle}>Job Site</label><input style={inpStyle} value={form.job_site} onChange={set("job_site")} placeholder="1234 Timber Ridge Rd" /></div>
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
            <div style={{ fontSize: 11, color: T.mutedLight }}>🕐 {j.follow_up_time ? (() => { const [h,m] = j.follow_up_time.split(":"); const hour = parseInt(h); return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`; })() : "8:00 AM"}</div>
            <a href={"tel:" + j.phone} onClick={e => e.stopPropagation()} style={{ background: T.gold, color: T.steel, borderRadius: 7, padding: "5px 10px", fontWeight: 800, fontSize: 12, textDecoration: "none" }}>📞</a>
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
            <div style={{ fontSize: 40 }}>✅</div>
            <div style={{ marginTop: 10, fontSize: 14 }}>All clear — no follow-ups scheduled.</div>
          </div>
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

  const showToast = (msg, type) => { setToast({ msg, type }); setTimeout(() => setToast(null), 2800); };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    supabase.from("jobs").select("*").order("created_at", { ascending: false }).then(({ data, error }) => { if (!error) setJobs(data || []); });
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

  const root = { maxWidth: 480, margin: "0 auto", minHeight: "100vh", background: T.bg, fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif", position: "relative" };

  if (loading) return <div style={{ ...root, display: "flex", alignItems: "center", justifyContent: "center", background: T.steel }}><div style={{ color: T.gold, fontSize: 16, fontWeight: 700 }}>Loading…</div></div>;
  if (!session) return <Login />;

  return (
    <div style={root}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}
      {showQuickAdd && <QuickAdd onSave={handleQuickAdd} onClose={() => setShowQuickAdd(false)} userId={session.user.id} />}
      {selected ? (
        <JobDetail job={selected} onBack={() => setSelected(null)} onSave={handleSave} onDelete={handleDelete} userId={session.user.id} />
      ) : (
        <>
          {tab === "dashboard" && <Dashboard jobs={jobs} onJobSelect={setSelected} onSignOut={handleSignOut} onQuickAdd={() => setShowQuickAdd(true)} />}
          {tab === "jobs"      && <JobList jobs={jobs} onSelect={setSelected} />}
          {tab === "add"       && <AddJob onSave={handleAdd} onCancel={() => setTab("jobs")} userId={session.user.id} />}
          {tab === "followups" && <FollowUps jobs={jobs} onSelect={setSelected} />}
        </>
      )}
      {!selected && <BottomNav tab={tab} setTab={setTab} />}
    </div>
  );
}
