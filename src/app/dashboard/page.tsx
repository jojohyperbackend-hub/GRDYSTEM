"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  LayoutDashboard, GitBranch, Target, CheckSquare, Brain,
  LogOut, Plus, Skull, Zap, Trophy, Clock, AlertTriangle,
  Check, Send, Loader, Lock, Unlock, Trash2, Calendar, Flag,
  ChevronRight, Gift
} from "lucide-react"
import { auth, signOutUser } from "@/lib/firebase"
import { onAuthStateChanged, User } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import "98.css"

// ─── Types ────────────────────────────────────────────────────────
type Tab = "overview" | "skills" | "missions" | "planner" | "oracle"
type MissionFilter = "all" | "daily" | "weekly" | "boss"

interface GrdRecord {
  id: string
  user_id: string
  type: string
  title: string
  description?: string
  status?: string
  priority?: string
  mission_type?: string
  xp_value?: number
  xp_current?: number
  level?: number
  linked_skill_id?: string
  linked_mission_id?: string
  unlock_condition?: string
  deadline?: string
  is_claimed?: boolean
  is_active?: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at?: string
}

// ─── Utils ────────────────────────────────────────────────────────
function xpToNextLevel(xp: number): number {
  const level = Math.floor(xp / 100) + 1
  return level * 100 - xp
}
function xpPercent(xp: number): number {
  return ((xp % 100) / 100) * 100
}
function clearSessionCookie() {
  document.cookie = "grdystem_session=; path=/; max-age=0"
}

// ─── API ──────────────────────────────────────────────────────────
async function apiGet(params: Record<string, string>) {
  try {
    const q = new URLSearchParams(params)
    const r = await fetch(`/api/system?${q}`)
    const j = await r.json()
    return j.success ? j.data : []
  } catch { return [] }
}
async function apiPost(type: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/system?type=${type}`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return r.json()
}
async function apiPut(id: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/system?id=${id}`, {
    method: "PUT", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return r.json()
}
async function apiDelete(id: string) {
  const r = await fetch(`/api/system?id=${id}`, { method: "DELETE" })
  return r.json()
}
async function apiAI(user_id: string, message: string) {
  const r = await fetch("/api/ai", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_id, message }),
  })
  return r.json()
}

// ─── Scanlines ────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
      style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,#000 2px,#000 4px)" }} />
  )
}

// ─── XP Bar ───────────────────────────────────────────────────────
function XPBar({ xp, color = "#6C63FF" }: { xp: number; color?: string }) {
  return (
    <div className="w-full h-1.5 rounded-full" style={{ background: "#2D2D44" }}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${xpPercent(xp)}%` }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="h-full rounded-full"
        style={{ background: color }}
      />
    </div>
  )
}

// ─── Priority badge ───────────────────────────────────────────────
function PriorityBadge({ p }: { p: string }) {
  const map: Record<string, { color: string; label: string }> = {
    low:      { color: "#3D7A5C", label: "LOW"  },
    medium:   { color: "#4A6FA5", label: "MED"  },
    high:     { color: "#D4892A", label: "HIGH" },
    critical: { color: "#8B2020", label: "CRIT" },
  }
  const v = map[p] ?? map.medium
  return (
    <span className="text-[9px] tracking-widest px-1.5 py-0.5 font-bold"
      style={{ color: v.color, border: `1px solid ${v.color}40` }}>
      {v.label}
    </span>
  )
}

// ─── Mission badge ────────────────────────────────────────────────
function MissionBadge({ t }: { t: string }) {
  const map: Record<string, string> = { daily: "#4A6FA5", weekly: "#3D7A5C", boss: "#8B2020" }
  const c = map[t] ?? "#4A6FA5"
  return (
    <span className="text-[9px] tracking-widest px-2 py-0.5 uppercase font-bold"
      style={{ color: c, border: `1px solid ${c}50`, background: `${c}12` }}>
      {t === "boss" ? "👹 BOSS" : t}
    </span>
  )
}

// ─── 98.css Window ────────────────────────────────────────────────
function Win98({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="window" style={{ background: "#1A1A2E", border: "2px solid #2D2D44", fontFamily: "inherit" }}>
      <div className="title-bar" style={{ background: "linear-gradient(to right,#2D2D44,#1A1A2E)", padding: "4px 8px" }}>
        <div className="title-bar-text" style={{ color: "#E8E0D0", fontSize: "10px", letterSpacing: "0.15em" }}>{title}</div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
          <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
          <button aria-label="Close" style={{ filter: "invert(0.6)" }} />
        </div>
      </div>
      <div className="window-body" style={{ background: "#1A1A2E", margin: 0, padding: "18px" }}>
        {children}
      </div>
    </div>
  )
}

// ─── Modal ────────────────────────────────────────────────────────
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "#0A0A0F90", backdropFilter: "blur(8px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 32, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16 }} transition={{ ease: [0.34, 1.2, 0.64, 1], duration: 0.4 }}
        className="window w-full max-w-md"
        style={{ background: "#1A1A2E", border: "2px solid #2D2D44", fontFamily: "'Courier New', monospace" }}>
        <div className="title-bar" style={{ background: "linear-gradient(to right,#2D2D44,#1A1A2E)", padding: "4px 8px" }}>
          <div className="title-bar-text" style={{ color: "#E8E0D0", fontSize: "10px", letterSpacing: "0.15em" }}>{title}</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
            <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
            <button aria-label="Close" onClick={onClose} style={{ filter: "invert(0.6)" }} />
          </div>
        </div>
        <div className="window-body" style={{ background: "#1A1A2E", margin: 0, padding: "20px" }}>{children}</div>
      </motion.div>
    </motion.div>
  )
}

// ─── Form primitives ──────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>{label}</div>
      {children}
    </div>
  )
}
function FInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder: string; type?: string
}) {
  return (
    <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
      className="w-full text-xs px-3 py-2.5 outline-none"
      style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
      onFocus={(e) => { e.target.style.borderColor = "#F5A62360" }}
      onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }} />
  )
}
function FSelect({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { v: string; l: string }[]
}) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value)}
      className="w-full text-xs px-3 py-2.5 outline-none"
      style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}>
      {options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  )
}
function MBtn({ onClick, children, primary }: { onClick: () => void; children: React.ReactNode; primary?: boolean }) {
  return (
    <motion.button onClick={onClick} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
      className="px-5 py-2.5 text-xs tracking-widest uppercase font-bold"
      style={{
        background: primary ? "#D4892A" : "transparent",
        border: primary ? "none" : "1px solid #2D2D44",
        color: primary ? "#0A0A0F" : "#9E9580",
        fontFamily: "inherit",
      }}>
      {children}
    </motion.button>
  )
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter()
  const [user,      setUser]      = useState<User | null>(null)
  const [guestName, setGuestName] = useState<string | null>(null)
  const [uid,       setUid]       = useState("")
  const [tab,       setTab]       = useState<Tab>("overview")
  const [mounted,   setMounted]   = useState(false)

  // Data
  const [skills,   setSkills]   = useState<GrdRecord[]>([])
  const [missions, setMissions] = useState<GrdRecord[]>([])
  const [todos,    setTodos]    = useState<GrdRecord[]>([])
  const [xpLogs,   setXpLogs]   = useState<GrdRecord[]>([])
  const [loading,  setLoading]  = useState(true)

  // Oracle
  const [oracleMsg,  setOracleMsg]  = useState("")
  const [oracleResp, setOracleResp] = useState<Record<string, unknown> | null>(null)
  const [oracleLoad, setOracleLoad] = useState(false)

  // Modals
  const [showSkillForm,   setShowSkillForm]   = useState(false)
  const [showMissionForm, setShowMissionForm] = useState(false)
  const [showTodoForm,    setShowTodoForm]    = useState(false)

  // Forms
  const [skillForm,   setSkillForm]   = useState({ title: "", description: "" })
  const [missionForm, setMissionForm] = useState({ title: "", description: "", mission_type: "daily", xp_value: "50", linked_skill_id: "", deadline: "" })
  const [todoForm,    setTodoForm]    = useState({ title: "", description: "", priority: "medium", deadline: "", linked_skill_id: "" })

  // Mission filter
  const [mFilter, setMFilter] = useState<MissionFilter>("all")

  // ── Auth ──────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const guest = sessionStorage.getItem("grdystem_guest")
    if (guest) {
      setGuestName(guest)
      setUid(`guest_${guest.replace(/\s+/g, "_").toLowerCase()}`)
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/login"); return }
      setUser(u)
      setUid(u.uid)
    })
    return () => unsub()
  }, [])

  // ── Fetch ─────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const [s, m, t, x] = await Promise.all([
      apiGet({ type: "skill",   user_id: uid }),
      apiGet({ type: "mission", user_id: uid }),
      apiGet({ type: "todo",    user_id: uid }),
      apiGet({ type: "xp_log",  user_id: uid, limit: "50" }),
    ])
    setSkills(Array.isArray(s) ? s : [])
    setMissions(Array.isArray(m) ? m : [])
    setTodos(Array.isArray(t) ? t : [])
    setXpLogs(Array.isArray(x) ? x : [])
    setLoading(false)
  }, [uid])

  useEffect(() => { if (uid) fetchAll() }, [uid, fetchAll])

  // ── Handlers ──────────────────────────────────────────────────────
  async function handleSignOut() {
    clearSessionCookie()
    if (guestName) { sessionStorage.removeItem("grdystem_guest"); router.push("/"); return }
    await signOutUser()
    router.push("/")
  }

  async function createSkill() {
    if (!skillForm.title.trim()) return
    await apiPost("skill", { user_id: uid, ...skillForm })
    setSkillForm({ title: "", description: "" })
    setShowSkillForm(false)
    fetchAll()
  }

  async function createMission() {
    if (!missionForm.title.trim()) return
    await apiPost("mission", {
      user_id: uid, ...missionForm,
      xp_value: Number(missionForm.xp_value),
      linked_skill_id: missionForm.linked_skill_id || null,
      deadline: missionForm.deadline || null,
    })
    setMissionForm({ title: "", description: "", mission_type: "daily", xp_value: "50", linked_skill_id: "", deadline: "" })
    setShowMissionForm(false)
    fetchAll()
  }

  async function createTodo() {
    if (!todoForm.title.trim()) return
    await apiPost("todo", {
      user_id: uid, ...todoForm,
      linked_skill_id: todoForm.linked_skill_id || null,
      deadline: todoForm.deadline || null,
    })
    setTodoForm({ title: "", description: "", priority: "medium", deadline: "", linked_skill_id: "" })
    setShowTodoForm(false)
    fetchAll()
  }

  async function completeMission(m: GrdRecord) { await apiPut(m.id, { status: "completed" }); fetchAll() }
  async function completeTodo(t: GrdRecord)    { await apiPut(t.id, { status: "completed" }); fetchAll() }
  async function deleteSkill(s: GrdRecord)     { await apiDelete(s.id); fetchAll() }
  async function deleteMission(m: GrdRecord)   { await apiDelete(m.id); fetchAll() }
  async function deleteTodo(t: GrdRecord)      { await apiDelete(t.id); fetchAll() }

  async function askOracle() {
    if (!oracleMsg.trim() || oracleLoad) return
    setOracleLoad(true)
    setOracleResp(null)
    const res = await apiAI(uid, oracleMsg)
    if (res.success) setOracleResp(res.data)
    setOracleLoad(false)
  }

  // ── Derived ───────────────────────────────────────────────────────
  const totalXP     = xpLogs.reduce((s, x) => s + (x.xp_value ?? 0), 0)
  const completedM  = missions.filter(m => m.status === "completed").length
  const activeM     = missions.filter(m => m.status === "active").length
  const bossM       = missions.filter(m => m.mission_type === "boss" && m.status === "active")
  const filteredM   = mFilter === "all" ? missions : missions.filter(m => m.mission_type === mFilter)
  const completedT  = todos.filter(t => t.status === "completed").length
  const activeT     = todos.filter(t => t.status === "active")
  const displayName = guestName ?? user?.displayName ?? "Wanderer"
  const playerTitle = totalXP < 500 ? "Wanderer" : totalXP < 2000 ? "Seeker" : totalXP < 5000 ? "Forged" : "Ascendant"

  if (!mounted) return null

  const TABS: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "overview",  icon: LayoutDashboard, label: "Overview"  },
    { id: "skills",    icon: GitBranch,       label: "Skills"    },
    { id: "missions",  icon: Target,          label: "Missions"  },
    { id: "planner",   icon: CheckSquare,     label: "Planner"   },
    { id: "oracle",    icon: Brain,           label: "Oracle"    },
  ]

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-[#E8E0D0]" style={{ fontFamily: "'Courier New', monospace" }}>
      <Scanlines />

      {/* ── SIDEBAR ───────────────────────────────────────── */}
      <aside className="fixed left-0 top-0 bottom-0 w-14 md:w-52 z-40 flex flex-col border-r border-[#2D2D44]"
        style={{ background: "#0D0D16" }}>

        {/* Logo */}
        <div className="flex items-center gap-2 px-3 md:px-4 py-4 border-b border-[#2D2D44]">
          <motion.div animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 2.4, repeat: Infinity }}
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: "#F5A623", boxShadow: "0 0 8px #F5A623" }} />
          <span className="hidden md:block text-xs tracking-[0.3em] font-black uppercase" style={{ color: "#E8E0D0" }}>GRDYSTEM</span>
        </div>

        {/* Nav tabs */}
        <nav className="flex-1 py-4 space-y-0.5 px-2">
          {TABS.map((t) => {
            const Icon = t.icon
            const active = tab === t.id
            return (
              <motion.button key={t.id} onClick={() => setTab(t.id)} whileHover={{ x: 2 }}
                className="w-full flex items-center gap-3 px-2 py-2.5 text-left transition-all duration-150"
                style={{
                  background: active ? "#1A1A2E" : "transparent",
                  borderLeft: active ? "2px solid #F5A623" : "2px solid transparent",
                  color: active ? "#E8E0D0" : "#9E9580",
                }}>
                <Icon className="w-4 h-4 flex-shrink-0" />
                <span className="hidden md:block text-xs tracking-widest uppercase">{t.label}</span>
              </motion.button>
            )
          })}

          {/* Reward link */}
          <Link href="/reward">
            <motion.div whileHover={{ x: 2 }}
              className="w-full flex items-center gap-3 px-2 py-2.5 cursor-pointer transition-all duration-150"
              style={{ borderLeft: "2px solid transparent", color: "#9E9580" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#D4892A" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9E9580" }}>
              <Gift className="w-4 h-4 flex-shrink-0" />
              <span className="hidden md:block text-xs tracking-widest uppercase">Rewards</span>
            </motion.div>
          </Link>
        </nav>

        {/* User + signout */}
        <div className="border-t border-[#2D2D44] px-2 py-3">
          <div className="flex items-center gap-2 px-2 mb-2">
            <div className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center text-[10px] font-black"
              style={{ background: "#2D2D44", color: "#F5A623" }}>
              {displayName[0].toUpperCase()}
            </div>
            <div className="hidden md:block min-w-0">
              <div className="text-[10px] truncate" style={{ color: "#E8E0D0" }}>{displayName}</div>
              <div className="text-[8px] tracking-widest uppercase" style={{ color: "#9E9580", opacity: 0.5 }}>{playerTitle}</div>
            </div>
          </div>
          <motion.button onClick={handleSignOut} whileHover={{ x: 2 }}
            className="w-full flex items-center gap-3 px-2 py-2 text-left transition-colors duration-150"
            style={{ color: "#9E9580" }}>
            <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="hidden md:block text-[10px] tracking-widest uppercase">Exit</span>
          </motion.button>
        </div>
      </aside>

      {/* ── MAIN ──────────────────────────────────────────── */}
      <main className="ml-14 md:ml-52 min-h-screen">

        {/* Header */}
        <header className="sticky top-0 z-30 flex items-center justify-between px-5 py-3 border-b border-[#2D2D44]"
          style={{ background: "#0A0A0F90", backdropFilter: "blur(12px)" }}>
          <div>
            <div className="text-[9px] tracking-[0.4em] uppercase mb-0.5" style={{ color: "#9E9580", opacity: 0.4 }}>
              {"// " + { overview: "War Room", skills: "Skill Tree", missions: "Mission Board", planner: "Planner", oracle: "Oracle AI" }[tab]}
            </div>
            <h1 className="text-sm font-black uppercase tracking-wider" style={{ color: "#E8E0D0" }}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1.5 text-[10px] tracking-widest" style={{ color: "#9E9580" }}>
              <Zap className="w-3 h-3" style={{ color: "#F5A623" }} />
              {totalXP.toLocaleString()} XP
            </div>
            {bossM.length > 0 && (
              <motion.div animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                className="hidden md:flex items-center gap-1.5 px-2 py-1 text-[9px] tracking-widest uppercase"
                style={{ color: "#8B2020", border: "1px solid #8B202040" }}>
                <Skull className="w-3 h-3" />
                {bossM.length} Boss Active
              </motion.div>
            )}
          </div>
        </header>

        {/* Content */}
        <div className="p-4 md:p-6">
          <AnimatePresence mode="wait">
            <motion.div key={tab}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}>

              {/* ══════ OVERVIEW ══════════════════════════════════ */}
              {tab === "overview" && (
                <div className="space-y-5">

                  {/* Stat cards */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { label: "Total XP",       value: totalXP.toLocaleString(), icon: Zap,       color: "#F5A623" },
                      { label: "Active Skills",   value: skills.length,            icon: GitBranch, color: "#4A6FA5" },
                      { label: "Missions Done",   value: completedM,               icon: Check,     color: "#3D7A5C" },
                      { label: "Active Missions", value: activeM,                  icon: Target,    color: "#D4892A" },
                    ].map((s, i) => {
                      const Icon = s.icon
                      return (
                        <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.07 }}
                          className="border border-[#2D2D44] p-4" style={{ background: "#1A1A2E" }}>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: "#9E9580" }}>{s.label}</span>
                            <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                          </div>
                          <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                        </motion.div>
                      )
                    })}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Character card */}
                    <Win98 title="character.sys">
                      <div className="flex items-center gap-4 mb-5">
                        <div className="w-14 h-14 rounded-sm flex items-center justify-center text-2xl font-black flex-shrink-0"
                          style={{ background: "#2D2D44", color: "#F5A623", border: "1px solid #F5A62330" }}>
                          {displayName[0].toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-black mb-0.5" style={{ color: "#E8E0D0" }}>{displayName}</div>
                          <div className="text-[9px] tracking-[0.3em] uppercase" style={{ color: "#F5A623" }}>{playerTitle}</div>
                          <div className="text-[9px] mt-0.5" style={{ color: "#9E9580", opacity: 0.5 }}>{totalXP.toLocaleString()} XP total</div>
                        </div>
                      </div>
                      <div className="space-y-2.5">
                        {[
                          { label: "Skills",           val: skills.length,  color: "#4A6FA5" },
                          { label: "Missions Cleared", val: completedM,     color: "#3D7A5C" },
                          { label: "Todos Done",       val: completedT,     color: "#D4892A" },
                        ].map((r, i) => (
                          <div key={i} className="flex justify-between items-center text-xs"
                            style={{ borderBottom: "1px solid #2D2D4440", paddingBottom: "8px" }}>
                            <span style={{ color: "#9E9580" }}>{r.label}</span>
                            <span style={{ color: r.color, fontWeight: "bold" }}>{r.val}</span>
                          </div>
                        ))}
                      </div>
                    </Win98>

                    {/* Top skills */}
                    <div className="border border-[#2D2D44] p-4" style={{ background: "#1A1A2E" }}>
                      <div className="text-[9px] tracking-[0.4em] uppercase mb-4" style={{ color: "#9E9580", opacity: 0.5 }}>// Top Skills</div>
                      {loading ? (
                        <div className="text-xs" style={{ color: "#9E9580" }}>Loading...</div>
                      ) : skills.length === 0 ? (
                        <div className="text-xs" style={{ color: "#9E9580", opacity: 0.4 }}>No skills yet.</div>
                      ) : (
                        <div className="space-y-4">
                          {skills.slice(0, 4).map((s) => (
                            <div key={s.id}>
                              <div className="flex justify-between mb-1.5">
                                <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "#E8E0D0" }}>{s.title}</span>
                                <span className="text-[10px]" style={{ color: "#9E9580" }}>LVL {s.level}</span>
                              </div>
                              <XPBar xp={s.xp_current ?? 0} />
                              <div className="text-[9px] mt-1" style={{ color: "#9E9580", opacity: 0.4 }}>
                                {xpToNextLevel(s.xp_current ?? 0)} XP to next level
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Boss missions */}
                  {bossM.length > 0 && (
                    <div className="border border-red-900/50 p-4" style={{ background: "#1A1A2E" }}>
                      <div className="flex items-center gap-2 mb-3">
                        <Skull className="w-4 h-4" style={{ color: "#8B2020" }} />
                        <span className="text-[9px] tracking-[0.4em] uppercase" style={{ color: "#8B2020" }}>Active Boss Missions</span>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        {bossM.map((m) => (
                          <div key={m.id} className="flex items-center justify-between p-3 border border-red-900/30"
                            style={{ background: "#12121A" }}>
                            <div>
                              <div className="text-xs font-bold mb-0.5" style={{ color: "#E8E0D0" }}>{m.title}</div>
                              <div className="text-[9px]" style={{ color: "#8B2020" }}>+{m.xp_value} XP</div>
                            </div>
                            <div className="flex gap-2">
                              <motion.button onClick={() => completeMission(m)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="text-[9px] px-2 py-1 tracking-widest uppercase"
                                style={{ border: "1px solid #3D7A5C40", color: "#3D7A5C" }}>
                                Done
                              </motion.button>
                              <motion.button onClick={() => deleteMission(m)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                                className="p-1 opacity-30 hover:opacity-70 transition-opacity" style={{ color: "#8B2020" }}>
                                <Trash2 className="w-3 h-3" />
                              </motion.button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Recent XP */}
                  <div className="border border-[#2D2D44] p-4" style={{ background: "#1A1A2E" }}>
                    <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: "#9E9580", opacity: 0.5 }}>// Recent XP Activity</div>
                    {xpLogs.length === 0 ? (
                      <div className="text-xs" style={{ color: "#9E9580", opacity: 0.4 }}>No XP activity yet.</div>
                    ) : (
                      <div className="space-y-2">
                        {xpLogs.slice(0, 6).map((x) => (
                          <div key={x.id} className="flex items-center justify-between text-xs"
                            style={{ borderBottom: "1px solid #2D2D4430", paddingBottom: "6px" }}>
                            <span style={{ color: "#9E9580" }}>{x.title}</span>
                            <span style={{ color: "#F5A623", fontWeight: "bold" }}>+{x.xp_value} XP</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ══════ SKILLS ════════════════════════════════════ */}
              {tab === "skills" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] tracking-[0.4em] uppercase" style={{ color: "#9E9580", opacity: 0.5 }}>
                      {skills.length} skills registered
                    </div>
                    <motion.button onClick={() => setShowSkillForm(true)}
                      whileHover={{ scale: 1.04, boxShadow: "0 0 16px #F5A62330" }} whileTap={{ scale: 0.96 }}
                      className="flex items-center gap-2 px-3 py-2 text-[11px] tracking-widest uppercase"
                      style={{ border: "1px solid #F5A62360", color: "#F5A623", fontFamily: "inherit" }}>
                      <Plus className="w-3 h-3" /> New Skill
                    </motion.button>
                  </div>

                  {loading ? (
                    <div className="text-xs" style={{ color: "#9E9580" }}>Loading skills...</div>
                  ) : skills.length === 0 ? (
                    <div className="text-center py-16">
                      <GitBranch className="w-8 h-8 mx-auto mb-3" style={{ color: "#2D2D44" }} />
                      <div className="text-xs" style={{ color: "#9E9580", opacity: 0.5 }}>No skills yet. Start building your skill tree.</div>
                    </div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-4">
                      {skills.map((s, i) => {
                        const nodes = (s.metadata?.nodes as { name: string; unlocked: boolean }[]) ?? []
                        return (
                          <motion.div key={s.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.06 }}
                            className="border border-[#2D2D44] p-5" style={{ background: "#1A1A2E" }}>
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-black uppercase tracking-wide mb-0.5" style={{ color: "#E8E0D0" }}>{s.title}</div>
                                {s.description && <div className="text-[10px]" style={{ color: "#9E9580" }}>{s.description}</div>}
                              </div>
                              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                                <div className="text-right">
                                  <div className="text-xs font-black" style={{ color: "#6C63FF" }}>LVL {s.level}</div>
                                  <div className="text-[9px]" style={{ color: "#9E9580" }}>{s.xp_current} XP</div>
                                </div>
                                <motion.button onClick={() => deleteSkill(s)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                  className="p-1.5 opacity-25 hover:opacity-75 transition-opacity" style={{ color: "#8B2020" }}>
                                  <Trash2 className="w-3.5 h-3.5" />
                                </motion.button>
                              </div>
                            </div>
                            <XPBar xp={s.xp_current ?? 0} />
                            <div className="text-[9px] mt-1 mb-4" style={{ color: "#9E9580", opacity: 0.4 }}>
                              {xpToNextLevel(s.xp_current ?? 0)} XP to Level {(s.level ?? 1) + 1}
                            </div>
                            {nodes.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {nodes.map((n, ni) => (
                                  <span key={ni} className="flex items-center gap-1 text-[9px] px-2 py-0.5"
                                    style={{
                                      background: n.unlocked ? "#6C63FF20" : "#2D2D44",
                                      color: n.unlocked ? "#A78BFA" : "#9E9580",
                                      border: `1px solid ${n.unlocked ? "#6C63FF40" : "#2D2D44"}`,
                                    }}>
                                    {n.unlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                    {n.name}
                                  </span>
                                ))}
                              </div>
                            )}
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══════ MISSIONS ══════════════════════════════════ */}
              {tab === "missions" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex gap-0">
                      {(["all", "daily", "weekly", "boss"] as MissionFilter[]).map((f) => (
                        <button key={f} onClick={() => setMFilter(f)}
                          className="text-[10px] px-3 py-1.5 tracking-widest uppercase transition-all duration-150"
                          style={{
                            background: mFilter === f ? "#1A1A2E" : "transparent",
                            borderBottom: mFilter === f ? "1px solid #F5A623" : "1px solid #2D2D44",
                            color: mFilter === f ? "#F5A623" : "#9E9580",
                            fontFamily: "inherit",
                          }}>
                          {f === "boss" ? "👹 " : ""}{f}
                        </button>
                      ))}
                    </div>
                    <motion.button onClick={() => setShowMissionForm(true)}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      className="flex items-center gap-2 px-3 py-2 text-[11px] tracking-widest uppercase"
                      style={{ border: "1px solid #F5A62360", color: "#F5A623", fontFamily: "inherit" }}>
                      <Plus className="w-3 h-3" /> New Mission
                    </motion.button>
                  </div>

                  {loading ? (
                    <div className="text-xs" style={{ color: "#9E9580" }}>Loading...</div>
                  ) : filteredM.length === 0 ? (
                    <div className="text-center py-16">
                      <Target className="w-8 h-8 mx-auto mb-3" style={{ color: "#2D2D44" }} />
                      <div className="text-xs" style={{ color: "#9E9580", opacity: 0.5 }}>No missions. Create your first mission.</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {filteredM.map((m, i) => (
                        <motion.div key={m.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.04 }}
                          className="flex items-center gap-3 p-4 border"
                          style={{
                            background: "#1A1A2E",
                            border: m.mission_type === "boss" ? "1px solid #8B202040" : "1px solid #2D2D44",
                            opacity: m.status === "completed" ? 0.5 : 1,
                          }}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <MissionBadge t={m.mission_type ?? "daily"} />
                              <span className="text-xs font-bold truncate" style={{
                                color: m.status === "completed" ? "#9E9580" : "#E8E0D0",
                                textDecoration: m.status === "completed" ? "line-through" : "none",
                              }}>{m.title}</span>
                            </div>
                            <div className="flex items-center gap-3 text-[9px]" style={{ color: "#9E9580" }}>
                              <span style={{ color: "#F5A623" }}>+{m.xp_value} XP</span>
                              {m.deadline && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />{new Date(m.deadline).toLocaleDateString()}
                                </span>
                              )}
                              {m.linked_skill_id && (
                                <span style={{ color: "#4A6FA5" }}>→ {skills.find(s => s.id === m.linked_skill_id)?.title ?? "skill"}</span>
                              )}
                            </div>
                          </div>
                          {m.status !== "completed" && (
                            <motion.button onClick={() => completeMission(m)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              className="p-1.5 flex-shrink-0" style={{ border: "1px solid #3D7A5C40", color: "#3D7A5C" }}>
                              <Check className="w-3.5 h-3.5" />
                            </motion.button>
                          )}
                          {m.status === "completed" && (
                            <div className="p-1.5 flex-shrink-0" style={{ color: "#3D7A5C" }}>
                              <Check className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <motion.button onClick={() => deleteMission(m)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                            className="p-1.5 flex-shrink-0 opacity-25 hover:opacity-70 transition-opacity" style={{ color: "#8B2020" }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </motion.button>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══════ PLANNER ═══════════════════════════════════ */}
              {tab === "planner" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="text-[9px] tracking-[0.4em] uppercase" style={{ color: "#9E9580", opacity: 0.5 }}>
                      {activeT.length} active · {completedT} done
                    </div>
                    <motion.button onClick={() => setShowTodoForm(true)}
                      whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                      className="flex items-center gap-2 px-3 py-2 text-[11px] tracking-widest uppercase"
                      style={{ border: "1px solid #F5A62360", color: "#F5A623", fontFamily: "inherit" }}>
                      <Plus className="w-3 h-3" /> New Task
                    </motion.button>
                  </div>

                  {loading ? (
                    <div className="text-xs" style={{ color: "#9E9580" }}>Loading...</div>
                  ) : todos.length === 0 ? (
                    <div className="text-center py-16">
                      <CheckSquare className="w-8 h-8 mx-auto mb-3" style={{ color: "#2D2D44" }} />
                      <div className="text-xs" style={{ color: "#9E9580", opacity: 0.5 }}>No tasks planned.</div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {todos.map((t, i) => {
                        const overdue = t.deadline && new Date(t.deadline) < new Date() && t.status !== "completed"
                        return (
                          <motion.div key={t.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-start gap-3 p-4 border"
                            style={{
                              background: "#1A1A2E",
                              border: overdue ? "1px solid #8B202040" : "1px solid #2D2D44",
                              opacity: t.status === "completed" ? 0.5 : 1,
                            }}>
                            {t.status !== "completed" ? (
                              <motion.button onClick={() => completeTodo(t)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                                className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm"
                                style={{ border: "1px solid #3D7A5C60" }} />
                            ) : (
                              <div className="w-4 h-4 mt-0.5 flex-shrink-0 rounded-sm flex items-center justify-center"
                                style={{ background: "#3D7A5C30", border: "1px solid #3D7A5C" }}>
                                <Check className="w-2.5 h-2.5" style={{ color: "#3D7A5C" }} />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <PriorityBadge p={t.priority ?? "medium"} />
                                {overdue && <AlertTriangle className="w-3 h-3" style={{ color: "#8B2020" }} />}
                                <span className="text-xs font-bold truncate" style={{
                                  color: t.status === "completed" ? "#9E9580" : "#E8E0D0",
                                  textDecoration: t.status === "completed" ? "line-through" : "none",
                                }}>{t.title}</span>
                              </div>
                              {t.description && <div className="text-[10px] mb-1" style={{ color: "#9E9580" }}>{t.description}</div>}
                              <div className="flex items-center gap-3 text-[9px]" style={{ color: "#9E9580" }}>
                                {t.deadline && (
                                  <span className="flex items-center gap-1" style={{ color: overdue ? "#8B2020" : "#9E9580" }}>
                                    <Calendar className="w-2.5 h-2.5" />{new Date(t.deadline).toLocaleDateString()}
                                  </span>
                                )}
                                {t.linked_skill_id && (
                                  <span style={{ color: "#4A6FA5" }}>→ {skills.find(s => s.id === t.linked_skill_id)?.title ?? "skill"}</span>
                                )}
                              </div>
                            </div>
                            <motion.button onClick={() => deleteTodo(t)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                              className="p-1 flex-shrink-0 opacity-25 hover:opacity-70 transition-opacity" style={{ color: "#8B2020" }}>
                              <Trash2 className="w-3.5 h-3.5" />
                            </motion.button>
                          </motion.div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ══════ ORACLE ════════════════════════════════════ */}
              {tab === "oracle" && (
                <div className="space-y-4 max-w-2xl">
                  <Win98 title="oracle.sys — GRDYSTEM AI">
                    <div className="text-[10px] leading-relaxed mb-5" style={{ color: "#9E9580" }}>
                      ORACLE analyzes your real progress — skill gaps, mission pace, stagnation, and what to do next.
                      Not a general AI. Only speaks within your system context.
                    </div>

                    {/* Quick prompts */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {[
                        "Analisis progress minggu ini",
                        "Rekomendasikan misi baru",
                        "Skill mana yang stagnan?",
                        "Langkah berikutnya?",
                      ].map((p) => (
                        <button key={p} onClick={() => setOracleMsg(p)}
                          className="text-[9px] px-2.5 py-1.5 tracking-wide transition-all duration-150"
                          style={{ border: "1px solid #2D2D44", color: "#9E9580", background: "transparent", fontFamily: "inherit" }}
                          onMouseEnter={(e) => { e.currentTarget.style.borderColor = "#4A6FA560"; e.currentTarget.style.color = "#E8E0D0" }}
                          onMouseLeave={(e) => { e.currentTarget.style.borderColor = "#2D2D44"; e.currentTarget.style.color = "#9E9580" }}>
                          {p}
                        </button>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="flex gap-2">
                      <input value={oracleMsg} onChange={(e) => setOracleMsg(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && askOracle()}
                        placeholder="Ask Oracle about your progress..."
                        className="flex-1 text-xs px-3 py-2.5 outline-none"
                        style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                        onFocus={(e) => { e.target.style.borderColor = "#4A6FA5" }}
                        onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }} />
                      <motion.button onClick={askOracle} disabled={oracleLoad || !oracleMsg.trim()}
                        whileHover={!oracleLoad ? { scale: 1.05 } : {}} whileTap={!oracleLoad ? { scale: 0.95 } : {}}
                        className="px-4 py-2.5 flex items-center gap-2 text-xs tracking-widest uppercase disabled:opacity-40"
                        style={{ background: "#4A6FA5", color: "#E8E0D0", fontFamily: "inherit" }}>
                        {oracleLoad ? <Loader className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      </motion.button>
                    </div>
                  </Win98>

                  {/* Oracle response */}
                  <AnimatePresence>
                    {oracleLoad && (
                      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="border border-[#2D2D44] p-5" style={{ background: "#1A1A2E" }}>
                        <div className="flex items-center gap-3 text-xs" style={{ color: "#3D7A5C" }}>
                          <Loader className="w-4 h-4 animate-spin" />
                          <span className="tracking-widest">Oracle is analyzing your system...</span>
                          <motion.span animate={{ opacity: [1, 0, 1] }} transition={{ duration: 1, repeat: Infinity }}>█</motion.span>
                        </div>
                      </motion.div>
                    )}

                    {oracleResp && !oracleLoad && (() => {
                      const d = oracleResp as {
                        oracle_sections?: Record<string, string>
                        progress_summary?: Record<string, number>
                        quest_recommendations?: string[]
                        next_objective?: string
                      }
                      return (
                        <motion.div key="resp" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                          {/* Sections */}
                          {Object.entries(d.oracle_sections ?? {}).map(([key, val]) => (
                            <div key={key} className="border border-[#2D2D44] p-4" style={{ background: "#1A1A2E" }}>
                              <div className="text-[9px] tracking-[0.4em] uppercase mb-2" style={{
                                color: key === "ORACLE VERDICT" ? "#8B2020" : key === "RECOMMENDATION" ? "#3D7A5C" : "#4A6FA5"
                              }}>
                                [{key}]
                              </div>
                              <div className="text-xs leading-relaxed" style={{ color: "#E8E0D0" }}>
                                {String(val).split("→").map((line, i) => (
                                  <div key={i} className={i > 0 ? "flex gap-2 mt-1" : ""}>
                                    {i > 0 && <span style={{ color: "#F5A623" }}>→</span>}
                                    <span style={{ color: i === 0 ? "#E8E0D0" : "#9E9580" }}>{line.trim()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}

                          {/* Progress summary */}
                          {d.progress_summary && (
                            <div className="border border-[#2D2D44] p-4" style={{ background: "#1A1A2E" }}>
                              <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: "#9E9580", opacity: 0.5 }}>// Progress Summary</div>
                              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                {Object.entries(d.progress_summary).map(([k, v]) => (
                                  <div key={k} className="text-center p-2 border border-[#2D2D44]" style={{ background: "#12121A" }}>
                                    <div className="text-sm font-black" style={{ color: "#F5A623" }}>{v}</div>
                                    <div className="text-[8px] tracking-wide uppercase mt-0.5" style={{ color: "#9E9580" }}>{k.replace(/_/g, " ")}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Quest recommendations */}
                          {d.quest_recommendations && d.quest_recommendations.length > 0 && (
                            <div className="border border-[#3D7A5C30] p-4" style={{ background: "#1A1A2E" }}>
                              <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: "#3D7A5C" }}>// Quest Recommendations</div>
                              <div className="space-y-2">
                                {d.quest_recommendations.map((q, i) => (
                                  <div key={i} className="flex gap-2 text-xs" style={{ color: "#9E9580" }}>
                                    <ChevronRight className="w-3 h-3 flex-shrink-0 mt-0.5" style={{ color: "#3D7A5C" }} />
                                    {q}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Next objective */}
                          {d.next_objective && (
                            <div className="border border-[#F5A62330] p-4" style={{ background: "#1A1A2E" }}>
                              <div className="text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: "#F5A623", opacity: 0.7 }}>// Next Objective</div>
                              <div className="flex items-center gap-2 text-xs font-bold" style={{ color: "#E8E0D0" }}>
                                <Flag className="w-3.5 h-3.5" style={{ color: "#F5A623" }} />
                                {d.next_objective}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )
                    })()}
                  </AnimatePresence>
                </div>
              )}

            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* ══════════════ MODALS ══════════════════════════════════════ */}

      <AnimatePresence>
        {showSkillForm && (
          <Modal title="new_skill.exe" onClose={() => setShowSkillForm(false)}>
            <div className="space-y-4">
              <Field label="Skill Name *">
                <FInput value={skillForm.title} onChange={(v) => setSkillForm(p => ({ ...p, title: v }))} placeholder="e.g. Programming, Stoicism..." />
              </Field>
              <Field label="Description">
                <FInput value={skillForm.description} onChange={(v) => setSkillForm(p => ({ ...p, description: v }))} placeholder="What does mastering this mean?" />
              </Field>
              <div className="flex gap-2 pt-2">
                <MBtn onClick={createSkill} primary>Create Skill</MBtn>
                <MBtn onClick={() => setShowSkillForm(false)}>Cancel</MBtn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMissionForm && (
          <Modal title="new_mission.exe" onClose={() => setShowMissionForm(false)}>
            <div className="space-y-4">
              <Field label="Mission Name *">
                <FInput value={missionForm.title} onChange={(v) => setMissionForm(p => ({ ...p, title: v }))} placeholder="e.g. Read 20 pages daily..." />
              </Field>
              <Field label="Type *">
                <FSelect value={missionForm.mission_type} onChange={(v) => setMissionForm(p => ({ ...p, mission_type: v }))}
                  options={[{ v: "daily", l: "Daily Mission" }, { v: "weekly", l: "Weekly Mission" }, { v: "boss", l: "👹 Boss Mission" }]} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="XP Reward">
                  <FInput type="number" value={missionForm.xp_value} onChange={(v) => setMissionForm(p => ({ ...p, xp_value: v }))} placeholder="50" />
                </Field>
                <Field label="Deadline">
                  <FInput type="date" value={missionForm.deadline} onChange={(v) => setMissionForm(p => ({ ...p, deadline: v }))} placeholder="" />
                </Field>
              </div>
              <Field label="Linked Skill">
                <FSelect value={missionForm.linked_skill_id} onChange={(v) => setMissionForm(p => ({ ...p, linked_skill_id: v }))}
                  options={[{ v: "", l: "— None —" }, ...skills.map(s => ({ v: s.id, l: s.title }))]} />
              </Field>
              <div className="flex gap-2 pt-2">
                <MBtn onClick={createMission} primary>Create Mission</MBtn>
                <MBtn onClick={() => setShowMissionForm(false)}>Cancel</MBtn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showTodoForm && (
          <Modal title="new_task.exe" onClose={() => setShowTodoForm(false)}>
            <div className="space-y-4">
              <Field label="Task Name *">
                <FInput value={todoForm.title} onChange={(v) => setTodoForm(p => ({ ...p, title: v }))} placeholder="e.g. Setup project, Write article..." />
              </Field>
              <Field label="Description">
                <FInput value={todoForm.description} onChange={(v) => setTodoForm(p => ({ ...p, description: v }))} placeholder="Details..." />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Priority">
                  <FSelect value={todoForm.priority} onChange={(v) => setTodoForm(p => ({ ...p, priority: v }))}
                    options={[{ v: "low", l: "Low" }, { v: "medium", l: "Medium" }, { v: "high", l: "High" }, { v: "critical", l: "🔴 Critical" }]} />
                </Field>
                <Field label="Deadline">
                  <FInput type="date" value={todoForm.deadline} onChange={(v) => setTodoForm(p => ({ ...p, deadline: v }))} placeholder="" />
                </Field>
              </div>
              <Field label="Linked Skill">
                <FSelect value={todoForm.linked_skill_id} onChange={(v) => setTodoForm(p => ({ ...p, linked_skill_id: v }))}
                  options={[{ v: "", l: "— None —" }, ...skills.map(s => ({ v: s.id, l: s.title }))]} />
              </Field>
              <div className="flex gap-2 pt-2">
                <MBtn onClick={createTodo} primary>Create Task</MBtn>
                <MBtn onClick={() => setShowTodoForm(false)}>Cancel</MBtn>
              </div>
            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  )
}