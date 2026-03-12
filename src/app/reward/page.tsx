"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Trophy, Plus, Check, Lock, Unlock, ArrowLeft,
  Zap, Star, Gift, Skull, AlertTriangle, Flame, X
} from "lucide-react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import "98.css"

// ─── Types ────────────────────────────────────────────────────────
interface GrdRecord {
  id: string
  user_id: string
  type: string
  title: string
  description?: string
  status?: string
  xp_value?: number
  linked_skill_id?: string
  linked_mission_id?: string
  unlock_condition?: string
  is_claimed?: boolean
  is_active?: boolean
  metadata?: Record<string, unknown>
  created_at: string
  updated_at?: string
  level?: number
  xp_current?: number
}

interface UnlockCondition {
  xp_required?: number
  level_required?: number
  missions_required?: number
  skill_id?: string
}

// ─── Utils ────────────────────────────────────────────────────────
function cx(...c: (string | undefined | false | null)[]): string {
  return c.filter(Boolean).join(" ")
}

// ─── API ──────────────────────────────────────────────────────────
async function apiGet(params: Record<string, string>) {
  const q = new URLSearchParams(params)
  const r = await fetch(`/api/system?${q}`)
  const j = await r.json()
  return j.success ? j.data : []
}
async function apiPost(type: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/system?type=${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return await r.json()
}
async function apiPut(id: string, body: Record<string, unknown>) {
  const r = await fetch(`/api/system?id=${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  return await r.json()
}
async function apiDelete(id: string) {
  const r = await fetch(`/api/system?id=${id}`, { method: "DELETE" })
  return await r.json()
}

// ─── Scanlines ────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg,transparent,transparent 2px,#000 2px,#000 4px)",
      }}
    />
  )
}

// ─── Particles ────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 16 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    duration: Math.random() * 20 + 14,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.25 + 0.05,
  }))
  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-400"
          style={{
            left: `${p.x}%`, top: `${p.y}%`,
            width: p.size, height: p.size, opacity: p.opacity,
          }}
          animate={{ y: [0, -36, 0], opacity: [p.opacity, p.opacity * 2.5, p.opacity], scale: [1, 1.4, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

// ─── Check if reward is unlocked ─────────────────────────────────
function checkUnlocked(
  reward: GrdRecord,
  totalXP: number,
  completedMissions: number,
  skills: GrdRecord[]
): { unlocked: boolean; progress: string } {
  if (reward.is_claimed) return { unlocked: true, progress: "Claimed" }

  let condition: UnlockCondition = {}
  try {
    condition = reward.unlock_condition ? JSON.parse(reward.unlock_condition) : {}
  } catch {
    condition = {}
  }

  if (!condition || Object.keys(condition).length === 0) {
    return { unlocked: true, progress: "Always available" }
  }

  if (condition.xp_required) {
    if (totalXP < condition.xp_required) {
      return {
        unlocked: false,
        progress: `${totalXP.toLocaleString()} / ${condition.xp_required.toLocaleString()} XP`,
      }
    }
  }

  if (condition.missions_required) {
    if (completedMissions < condition.missions_required) {
      return {
        unlocked: false,
        progress: `${completedMissions} / ${condition.missions_required} missions`,
      }
    }
  }

  if (condition.level_required && condition.skill_id) {
    const skill = skills.find((s) => s.id === condition.skill_id)
    if (skill && (skill.level ?? 1) < condition.level_required) {
      return {
        unlocked: false,
        progress: `${skill.title} Level ${skill.level ?? 1} / ${condition.level_required}`,
      }
    }
  }

  return { unlocked: true, progress: "Ready to claim" }
}

// ─── XP progress bar for unlock condition ────────────────────────
function UnlockProgress({
  reward,
  totalXP,
  completedMissions,
  skills,
}: {
  reward: GrdRecord
  totalXP: number
  completedMissions: number
  skills: GrdRecord[]
}) {
  let condition: UnlockCondition = {}
  try {
    condition = reward.unlock_condition ? JSON.parse(reward.unlock_condition) : {}
  } catch {
    condition = {}
  }

  if (!condition || Object.keys(condition).length === 0) return null

  if (condition.xp_required) {
    const pct = Math.min((totalXP / condition.xp_required) * 100, 100)
    return (
      <div className="mt-3">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: "#9E9580" }}>
          <span>XP Progress</span>
          <span style={{ color: "#F5A623" }}>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "#2D2D44" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: pct >= 100 ? "#3D7A5C" : "#F5A623" }}
          />
        </div>
      </div>
    )
  }

  if (condition.missions_required) {
    const pct = Math.min((completedMissions / condition.missions_required) * 100, 100)
    return (
      <div className="mt-3">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: "#9E9580" }}>
          <span>Mission Progress</span>
          <span style={{ color: "#4A6FA5" }}>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "#2D2D44" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: pct >= 100 ? "#3D7A5C" : "#4A6FA5" }}
          />
        </div>
      </div>
    )
  }

  if (condition.level_required && condition.skill_id) {
    const skill = skills.find((s) => s.id === condition.skill_id)
    const currentLevel = skill?.level ?? 1
    const pct = Math.min((currentLevel / condition.level_required) * 100, 100)
    return (
      <div className="mt-3">
        <div className="flex justify-between text-[9px] mb-1" style={{ color: "#9E9580" }}>
          <span>{skill?.title ?? "Skill"} Level</span>
          <span style={{ color: "#6C63FF" }}>{Math.round(pct)}%</span>
        </div>
        <div className="h-1.5 rounded-full" style={{ background: "#2D2D44" }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
            className="h-full rounded-full"
            style={{ background: pct >= 100 ? "#3D7A5C" : "#6C63FF" }}
          />
        </div>
      </div>
    )
  }

  return null
}

// ─────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────
export default function RewardPage() {
  const router = useRouter()
  const [uid, setUid]           = useState("")
  const [displayName, setName]  = useState("Wanderer")
  const [mounted, setMounted]   = useState(false)

  // Data
  const [rewards,   setRewards]   = useState<GrdRecord[]>([])
  const [skills,    setSkills]    = useState<GrdRecord[]>([])
  const [missions,  setMissions]  = useState<GrdRecord[]>([])
  const [xpLogs,    setXpLogs]    = useState<GrdRecord[]>([])
  const [loading,   setLoading]   = useState(true)

  // UI state
  const [showForm,  setShowForm]  = useState(false)
  const [claimingId, setClaimId]  = useState<string | null>(null)
  const [showClaim, setShowClaim] = useState<GrdRecord | null>(null)
  const [filter, setFilter]       = useState<"all" | "available" | "locked" | "claimed">("all")

  // Form
  const [form, setForm] = useState({
    title: "",
    description: "",
    unlock_type: "xp",       // xp | missions | level | free
    xp_required: "500",
    missions_required: "5",
    level_required: "5",
    skill_id: "",
  })

  // ── Auth ─────────────────────────────────────────────────────────
  useEffect(() => {
    setMounted(true)
    const guest = sessionStorage.getItem("grdystem_guest")
    if (guest) {
      setName(guest)
      setUid(`guest_${guest.replace(/\s+/g, "_").toLowerCase()}`)
      return
    }
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { router.push("/login"); return }
      setUid(u.uid)
      setName(u.displayName ?? "Wanderer")
    })
    return () => unsub()
  }, [])

  // ── Fetch all ─────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const [r, s, m, x] = await Promise.all([
      apiGet({ type: "reward",  user_id: uid }),
      apiGet({ type: "skill",   user_id: uid }),
      apiGet({ type: "mission", user_id: uid }),
      apiGet({ type: "xp_log",  user_id: uid, limit: "200" }),
    ])
    setRewards(Array.isArray(r) ? r : [])
    setSkills(Array.isArray(s) ? s : [])
    setMissions(Array.isArray(m) ? m : [])
    setXpLogs(Array.isArray(x) ? x : [])
    setLoading(false)
  }, [uid])

  useEffect(() => { if (uid) fetchAll() }, [uid])

  // ── Derived ───────────────────────────────────────────────────────
  const totalXP          = xpLogs.reduce((s, x) => s + (x.xp_value ?? 0), 0)
  const completedMissions = missions.filter((m) => m.status === "completed").length

  const enriched = rewards.map((r) => ({
    ...r,
    ...checkUnlocked(r, totalXP, completedMissions, skills),
  }))

  const filtered = enriched.filter((r) => {
    if (filter === "all")       return true
    if (filter === "available") return r.unlocked && !r.is_claimed
    if (filter === "locked")    return !r.unlocked && !r.is_claimed
    if (filter === "claimed")   return r.is_claimed
    return true
  })

  const stats = {
    total:     rewards.length,
    available: enriched.filter((r) => r.unlocked && !r.is_claimed).length,
    locked:    enriched.filter((r) => !r.unlocked && !r.is_claimed).length,
    claimed:   enriched.filter((r) => r.is_claimed).length,
  }

  // ── Handlers ──────────────────────────────────────────────────────
  async function claimReward(reward: GrdRecord) {
    setClaimId(reward.id)
    await apiPut(reward.id, { is_claimed: true, status: "completed" })
    setClaimId(null)
    setShowClaim(null)
    fetchAll()
  }

  async function deleteReward(id: string) {
    await apiDelete(id)
    fetchAll()
  }

  async function createReward() {
    if (!form.title.trim()) return

    let unlock_condition: UnlockCondition | null = null

    if (form.unlock_type === "xp") {
      unlock_condition = { xp_required: Number(form.xp_required) }
    } else if (form.unlock_type === "missions") {
      unlock_condition = { missions_required: Number(form.missions_required) }
    } else if (form.unlock_type === "level" && form.skill_id) {
      unlock_condition = { level_required: Number(form.level_required), skill_id: form.skill_id }
    }

    await apiPost("reward", {
      user_id: uid,
      title: form.title,
      description: form.description,
      unlock_condition: unlock_condition ? JSON.stringify(unlock_condition) : null,
    })

    setForm({ title: "", description: "", unlock_type: "xp", xp_required: "500", missions_required: "5", level_required: "5", skill_id: "" })
    setShowForm(false)
    fetchAll()
  }

  if (!mounted) return null

  return (
    <div
      className="min-h-screen bg-[#0A0A0F] text-[#E8E0D0] relative"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <Scanlines />
      <Particles />

      {/* ── HEADER ──────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-30 flex items-center justify-between px-5 md:px-8 py-3 border-b border-[#2D2D44]"
        style={{ background: "#0A0A0F95", backdropFilter: "blur(12px)" }}
      >
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <motion.button
              whileHover={{ x: -2, boxShadow: "0 0 12px #9E958020" }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center gap-2 text-[10px] tracking-[0.25em] uppercase px-3 py-1.5 transition-all duration-150"
              style={{ color: "#9E9580", border: "1px solid #2D2D44", background: "#1A1A2E" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E0D0"; e.currentTarget.style.borderColor = "#9E958050" }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "#9E9580"; e.currentTarget.style.borderColor = "#2D2D44" }}
            >
              <ArrowLeft className="w-3 h-3" />
              Dashboard
            </motion.button>
          </Link>

          <div>
            <div className="text-[9px] tracking-[0.4em] uppercase" style={{ color: "#9E9580", opacity: 0.5 }}>
              // Reward Vault
            </div>
            <h1 className="text-sm font-black uppercase tracking-wider" style={{ color: "#E8E0D0" }}>
              Rewards
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-[10px] tracking-widest" style={{ color: "#9E9580" }}>
            <Zap className="w-3 h-3" style={{ color: "#F5A623" }} />
            {totalXP.toLocaleString()} XP
          </div>
          <motion.button
            onClick={() => setShowForm(true)}
            whileHover={{ scale: 1.04, boxShadow: "0 0 16px #F5A62330" }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center gap-2 px-3 py-2 text-[11px] tracking-widest uppercase"
            style={{ border: "1px solid #F5A62360", color: "#F5A623", fontFamily: "inherit" }}
          >
            <Plus className="w-3 h-3" /> New Reward
          </motion.button>
        </div>
      </header>

      <div className="relative z-10 px-5 md:px-8 py-6 max-w-5xl mx-auto">

        {/* ── STAT CARDS ──────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Rewards", value: stats.total,     icon: Gift,    color: "#F5A623" },
            { label: "Available",     value: stats.available, icon: Unlock,  color: "#3D7A5C" },
            { label: "Locked",        value: stats.locked,    icon: Lock,    color: "#4A6FA5" },
            { label: "Claimed",       value: stats.claimed,   icon: Trophy,  color: "#D4892A" },
          ].map((s, i) => {
            const Icon = s.icon
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                className="border border-[#2D2D44] p-4"
                style={{ background: "#1A1A2E" }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: "#9E9580" }}>{s.label}</span>
                  <Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                </div>
                <div className="text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
              </motion.div>
            )
          })}
        </div>

        {/* ── FILTER TABS ─────────────────────────────────── */}
        <div className="flex gap-1 mb-5 border-b border-[#2D2D44] pb-0">
          {(["all", "available", "locked", "claimed"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-[10px] px-4 py-2 tracking-widest uppercase transition-all duration-150"
              style={{
                color: filter === f ? "#F5A623" : "#9E9580",
                borderBottom: filter === f ? "2px solid #F5A623" : "2px solid transparent",
                marginBottom: "-1px",
                background: "transparent",
                fontFamily: "inherit",
              }}
            >
              {f === "available" && stats.available > 0 && filter !== "available"
                ? <span style={{ color: "#3D7A5C" }}>{f} ({stats.available})</span>
                : f}
            </button>
          ))}
        </div>

        {/* ── REWARD GRID ─────────────────────────────────── */}
        {loading ? (
          <div className="text-xs py-12 text-center" style={{ color: "#9E9580" }}>Loading rewards...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Gift className="w-10 h-10 mx-auto mb-4" style={{ color: "#2D2D44" }} />
            <div className="text-sm font-bold mb-2" style={{ color: "#9E9580" }}>
              {filter === "claimed" ? "No rewards claimed yet." : filter === "available" ? "No rewards available yet." : "No rewards created yet."}
            </div>
            <div className="text-xs" style={{ color: "#9E9580", opacity: 0.5 }}>
              {filter === "all" && "Create your first reward to get started."}
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {filtered.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                  whileHover={!r.is_claimed ? { y: -3 } : {}}
                  className="relative border p-5 flex flex-col"
                  style={{
                    background: r.is_claimed ? "#12121A" : "#1A1A2E",
                    border: r.is_claimed
                      ? "1px solid #D4892A40"
                      : r.unlocked
                      ? "1px solid #3D7A5C40"
                      : "1px solid #2D2D44",
                    opacity: r.is_claimed ? 0.75 : 1,
                  }}
                >
                  {/* Claimed overlay shimmer */}
                  {r.is_claimed && (
                    <div className="absolute inset-0 pointer-events-none"
                      style={{ background: "linear-gradient(135deg, #D4892A08 0%, transparent 60%)" }} />
                  )}

                  {/* Top row */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {r.is_claimed ? (
                        <div className="w-7 h-7 rounded-sm flex items-center justify-center"
                          style={{ background: "#D4892A20", border: "1px solid #D4892A40" }}>
                          <Trophy className="w-3.5 h-3.5" style={{ color: "#D4892A" }} />
                        </div>
                      ) : r.unlocked ? (
                        <motion.div
                          animate={{ boxShadow: ["0 0 8px #3D7A5C30", "0 0 16px #3D7A5C50", "0 0 8px #3D7A5C30"] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-7 h-7 rounded-sm flex items-center justify-center"
                          style={{ background: "#3D7A5C20", border: "1px solid #3D7A5C50" }}>
                          <Gift className="w-3.5 h-3.5" style={{ color: "#3D7A5C" }} />
                        </motion.div>
                      ) : (
                        <div className="w-7 h-7 rounded-sm flex items-center justify-center"
                          style={{ background: "#2D2D44", border: "1px solid #2D2D44" }}>
                          <Lock className="w-3.5 h-3.5" style={{ color: "#9E9580", opacity: 0.5 }} />
                        </div>
                      )}
                      <div>
                        <div className="text-[8px] tracking-[0.35em] uppercase"
                          style={{
                            color: r.is_claimed ? "#D4892A" : r.unlocked ? "#3D7A5C" : "#9E9580",
                            opacity: r.is_claimed ? 1 : r.unlocked ? 1 : 0.5,
                          }}>
                          {r.is_claimed ? "CLAIMED" : r.unlocked ? "AVAILABLE" : "LOCKED"}
                        </div>
                      </div>
                    </div>

                    {/* Delete */}
                    {!r.is_claimed && (
                      <motion.button
                        onClick={() => deleteReward(r.id)}
                        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                        className="opacity-30 hover:opacity-70 transition-opacity"
                        style={{ color: "#9E9580" }}>
                        <X className="w-3.5 h-3.5" />
                      </motion.button>
                    )}
                  </div>

                  {/* Title & desc */}
                  <h3
                    className="text-sm font-black mb-1 leading-snug"
                    style={{
                      color: r.is_claimed ? "#9E9580" : "#E8E0D0",
                      textDecoration: r.is_claimed ? "line-through" : "none",
                    }}
                  >
                    {r.title}
                  </h3>
                  {r.description && (
                    <p className="text-[10px] leading-relaxed mb-3 flex-1" style={{ color: "#9E9580" }}>
                      {r.description}
                    </p>
                  )}

                  {/* Unlock condition label */}
                  {r.unlock_condition && (() => {
                    let cond: UnlockCondition = {}
                    try { cond = JSON.parse(r.unlock_condition) } catch {}
                    return (
                      <div className="text-[9px] tracking-wide mb-2" style={{ color: "#9E9580", opacity: 0.6 }}>
                        {cond.xp_required && `Requires ${cond.xp_required.toLocaleString()} XP`}
                        {cond.missions_required && `Requires ${cond.missions_required} missions completed`}
                        {cond.level_required && cond.skill_id && `Requires Level ${cond.level_required} in ${skills.find(s => s.id === cond.skill_id)?.title ?? "skill"}`}
                      </div>
                    )
                  })()}

                  {/* Progress bar */}
                  {!r.is_claimed && (
                    <UnlockProgress
                      reward={r}
                      totalXP={totalXP}
                      completedMissions={completedMissions}
                      skills={skills}
                    />
                  )}

                  {/* Progress label */}
                  {!r.is_claimed && (
                    <div className="text-[9px] mt-1.5 mb-4" style={{ color: "#9E9580", opacity: 0.5 }}>
                      {(r as GrdRecord & { progress: string }).progress}
                    </div>
                  )}

                  {/* Claim button */}
                  {!r.is_claimed && r.unlocked && (
                    <motion.button
                      onClick={() => setShowClaim(r)}
                      whileHover={{ scale: 1.03, boxShadow: "0 0 20px #3D7A5C40" }}
                      whileTap={{ scale: 0.97 }}
                      className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 text-xs tracking-[0.2em] uppercase font-black transition-all duration-200"
                      style={{ background: "#3D7A5C", color: "#E8E0D0", fontFamily: "inherit" }}
                    >
                      <Gift className="w-3.5 h-3.5" />
                      Claim Reward
                    </motion.button>
                  )}

                  {/* Claimed state */}
                  {r.is_claimed && (
                    <div className="mt-auto flex items-center justify-center gap-2 py-2 text-[10px] tracking-widest uppercase"
                      style={{ color: "#D4892A", opacity: 0.7 }}>
                      <Trophy className="w-3 h-3" />
                      Reward Claimed
                    </div>
                  )}

                  {/* Locked state */}
                  {!r.is_claimed && !r.unlocked && (
                    <div className="mt-auto flex items-center justify-center gap-2 py-2.5 text-[10px] tracking-widest uppercase border border-[#2D2D44]"
                      style={{ color: "#9E9580", opacity: 0.4 }}>
                      <Lock className="w-3 h-3" />
                      Not Yet Unlocked
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* ══════════════ CLAIM CONFIRM MODAL ════════════════════════ */}
      <AnimatePresence>
        {showClaim && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "#0A0A0F95", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowClaim(null)}
          >
            <motion.div
              initial={{ opacity: 0, y: 32, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ ease: [0.34, 1.2, 0.64, 1], duration: 0.4 }}
              className="window w-full max-w-sm"
              style={{ background: "#1A1A2E", border: "2px solid #3D7A5C60", fontFamily: "inherit" }}
            >
              <div className="title-bar"
                style={{ background: "linear-gradient(to right, #3D7A5C40, #1A1A2E)", padding: "4px 8px" }}>
                <div className="title-bar-text"
                  style={{ color: "#E8E0D0", fontSize: "10px", letterSpacing: "0.15em" }}>
                  claim_reward.exe
                </div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Close" onClick={() => setShowClaim(null)} style={{ filter: "invert(0.6)" }} />
                </div>
              </div>
              <div className="window-body" style={{ background: "#1A1A2E", margin: 0, padding: "24px" }}>
                <div className="text-center mb-6">
                  <motion.div
                    animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 16px #3D7A5C40", "0 0 32px #3D7A5C70", "0 0 16px #3D7A5C40"] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="w-14 h-14 mx-auto rounded-sm flex items-center justify-center mb-4"
                    style={{ background: "#3D7A5C20", border: "2px solid #3D7A5C60" }}
                  >
                    <Trophy className="w-7 h-7" style={{ color: "#3D7A5C" }} />
                  </motion.div>
                  <div className="text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: "#3D7A5C" }}>
                    Reward Unlocked
                  </div>
                  <h3 className="text-base font-black mb-2" style={{ color: "#E8E0D0" }}>
                    {showClaim.title}
                  </h3>
                  {showClaim.description && (
                    <p className="text-xs" style={{ color: "#9E9580" }}>{showClaim.description}</p>
                  )}
                </div>

                <div className="text-[10px] text-center mb-5" style={{ color: "#9E9580", opacity: 0.6 }}>
                  Once claimed, this reward is marked as received.
                  <br />This action cannot be undone.
                </div>

                <div className="flex gap-2">
                  <motion.button
                    onClick={() => claimReward(showClaim)}
                    disabled={claimingId === showClaim.id}
                    whileHover={{ scale: 1.03, boxShadow: "0 0 24px #3D7A5C50" }}
                    whileTap={{ scale: 0.97 }}
                    className="flex-1 py-3 text-xs tracking-[0.2em] uppercase font-black flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "#3D7A5C", color: "#E8E0D0", fontFamily: "inherit" }}
                  >
                    {claimingId === showClaim.id ? (
                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                    ) : (
                      <><Check className="w-3.5 h-3.5" /> Confirm Claim</>
                    )}
                  </motion.button>
                  <motion.button
                    onClick={() => setShowClaim(null)}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-5 py-3 text-xs tracking-widest uppercase"
                    style={{ border: "1px solid #2D2D44", color: "#9E9580", fontFamily: "inherit" }}
                  >
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ══════════════ CREATE REWARD MODAL ════════════════════════ */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "#0A0A0F95", backdropFilter: "blur(8px)" }}
            onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 40, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ ease: [0.34, 1.2, 0.64, 1], duration: 0.45 }}
              className="window w-full max-w-md max-h-[90vh] overflow-y-auto"
              style={{ background: "#1A1A2E", border: "2px solid #2D2D44", fontFamily: "inherit" }}
            >
              <div className="title-bar sticky top-0"
                style={{ background: "linear-gradient(to right, #2D2D44, #1A1A2E)", padding: "4px 8px" }}>
                <div className="title-bar-text"
                  style={{ color: "#E8E0D0", fontSize: "10px", letterSpacing: "0.15em" }}>
                  new_reward.exe
                </div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Close" onClick={() => setShowForm(false)} style={{ filter: "invert(0.6)" }} />
                </div>
              </div>

              <div className="window-body" style={{ background: "#1A1A2E", margin: 0, padding: "20px" }}>
                <div className="space-y-4">

                  {/* Title */}
                  <div>
                    <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                      Reward Name *
                    </div>
                    <input
                      value={form.title}
                      onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                      placeholder="e.g. Weekend gaming session, Ramen date..."
                      className="w-full text-xs px-3 py-2.5 outline-none"
                      style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                      onFocus={(e) => { e.target.style.borderColor = "#F5A62360" }}
                      onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }}
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                      Description
                    </div>
                    <input
                      value={form.description}
                      onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="What does this reward mean to you?"
                      className="w-full text-xs px-3 py-2.5 outline-none"
                      style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                      onFocus={(e) => { e.target.style.borderColor = "#F5A62360" }}
                      onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }}
                    />
                  </div>

                  {/* Unlock type */}
                  <div>
                    <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                      Unlock Condition
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { v: "xp",       l: "⚡ XP Total"       },
                        { v: "missions", l: "🎯 Missions Done"  },
                        { v: "level",    l: "⬆ Skill Level"    },
                        { v: "free",     l: "🔓 Always Free"    },
                      ].map((opt) => (
                        <button
                          key={opt.v}
                          onClick={() => setForm((p) => ({ ...p, unlock_type: opt.v }))}
                          className="py-2 text-[10px] tracking-wide uppercase transition-all duration-150"
                          style={{
                            background: form.unlock_type === opt.v ? "#F5A62320" : "#12121A",
                            border: `1px solid ${form.unlock_type === opt.v ? "#F5A62360" : "#2D2D44"}`,
                            color: form.unlock_type === opt.v ? "#F5A623" : "#9E9580",
                            fontFamily: "inherit",
                          }}
                        >
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Condition inputs */}
                  {form.unlock_type === "xp" && (
                    <div>
                      <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                        XP Required
                      </div>
                      <input
                        type="number" value={form.xp_required}
                        onChange={(e) => setForm((p) => ({ ...p, xp_required: e.target.value }))}
                        placeholder="500"
                        className="w-full text-xs px-3 py-2.5 outline-none"
                        style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                        onFocus={(e) => { e.target.style.borderColor = "#F5A62360" }}
                        onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }}
                      />
                    </div>
                  )}

                  {form.unlock_type === "missions" && (
                    <div>
                      <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                        Missions to Complete
                      </div>
                      <input
                        type="number" value={form.missions_required}
                        onChange={(e) => setForm((p) => ({ ...p, missions_required: e.target.value }))}
                        placeholder="5"
                        className="w-full text-xs px-3 py-2.5 outline-none"
                        style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                        onFocus={(e) => { e.target.style.borderColor = "#F5A62360" }}
                        onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }}
                      />
                    </div>
                  )}

                  {form.unlock_type === "level" && (
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                          Skill
                        </div>
                        <select
                          value={form.skill_id}
                          onChange={(e) => setForm((p) => ({ ...p, skill_id: e.target.value }))}
                          className="w-full text-xs px-3 py-2.5 outline-none"
                          style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                        >
                          <option value="">— Select Skill —</option>
                          {skills.map((s) => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="text-[9px] tracking-[0.35em] uppercase mb-1.5" style={{ color: "#9E9580", opacity: 0.6 }}>
                          Level Required
                        </div>
                        <input
                          type="number" value={form.level_required}
                          onChange={(e) => setForm((p) => ({ ...p, level_required: e.target.value }))}
                          placeholder="5"
                          className="w-full text-xs px-3 py-2.5 outline-none"
                          style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
                          onFocus={(e) => { e.target.style.borderColor = "#F5A62360" }}
                          onBlur={(e) => { e.target.style.borderColor = "#2D2D44" }}
                        />
                      </div>
                    </div>
                  )}

                  {form.unlock_type === "free" && (
                    <div className="text-[10px] py-2 text-center" style={{ color: "#3D7A5C", opacity: 0.7 }}>
                      This reward will always be available to claim.
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    <motion.button
                      onClick={createReward}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-black"
                      style={{ background: "#D4892A", color: "#0A0A0F", fontFamily: "inherit" }}
                    >
                      Create Reward
                    </motion.button>
                    <motion.button
                      onClick={() => setShowForm(false)}
                      whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-5 py-2.5 text-xs tracking-widest uppercase"
                      style={{ border: "1px solid #2D2D44", color: "#9E9580", fontFamily: "inherit" }}
                    >
                      Cancel
                    </motion.button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}