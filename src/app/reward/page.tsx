"use client"

import { useEffect, useState, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Trophy, Plus, Check, Lock, Unlock, ArrowLeft, Zap, Gift, X } from "lucide-react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import "98.css"

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

function parseC(raw?: string): UnlockCondition {
  if (!raw) return {}
  try { return JSON.parse(raw) } catch { return {} }
}

async function apiGet(p: Record<string, string>) {
  try { const r = await fetch(`/api/system?${new URLSearchParams(p)}`); const j = await r.json(); return j.success ? j.data : [] } catch { return [] }
}
async function apiPost(type: string, body: Record<string, unknown>) {
  return fetch(`/api/system?type=${type}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
}
async function apiPut(id: string, body: Record<string, unknown>) {
  return fetch(`/api/system?id=${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).then(r => r.json())
}
async function apiDel(id: string) { return fetch(`/api/system?id=${id}`, { method: "DELETE" }).then(r => r.json()) }

function Scanlines() {
  return <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.015]"
    style={{ backgroundImage: "repeating-linear-gradient(0deg,transparent,transparent 2px,#000 2px,#000 4px)" }} />
}

function checkUnlocked(r: GrdRecord, xp: number, done: number, skills: GrdRecord[]): { unlocked: boolean; progress: string } {
  if (r.is_claimed) return { unlocked: true, progress: "Claimed" }
  const c = parseC(r.unlock_condition)
  if (!c || !Object.keys(c).length) return { unlocked: true, progress: "Always available" }
  if (c.xp_required && xp < c.xp_required) return { unlocked: false, progress: `${xp.toLocaleString()} / ${c.xp_required.toLocaleString()} XP` }
  if (c.missions_required && done < c.missions_required) return { unlocked: false, progress: `${done} / ${c.missions_required} missions` }
  if (c.level_required && c.skill_id) {
    const sk = skills.find(s => s.id === c.skill_id)
    if (sk && (sk.level ?? 1) < c.level_required) return { unlocked: false, progress: `${sk.title} Lv.${sk.level ?? 1} / ${c.level_required}` }
  }
  return { unlocked: true, progress: "Ready to claim" }
}

function ProgressBar({ reward, xp, done, skills }: { reward: GrdRecord; xp: number; done: number; skills: GrdRecord[] }) {
  const c = parseC(reward.unlock_condition)
  if (!c || !Object.keys(c).length) return null
  let pct = 0, color = "#F5A623", label = ""
  if (c.xp_required) { pct = Math.min((xp / c.xp_required) * 100, 100); color = pct >= 100 ? "#3D7A5C" : "#F5A623"; label = "XP" }
  else if (c.missions_required) { pct = Math.min((done / c.missions_required) * 100, 100); color = pct >= 100 ? "#3D7A5C" : "#4A6FA5"; label = "Missions" }
  else if (c.level_required && c.skill_id) {
    const sk = skills.find(s => s.id === c.skill_id)
    pct = Math.min(((sk?.level ?? 1) / c.level_required) * 100, 100); color = pct >= 100 ? "#3D7A5C" : "#6C63FF"; label = "Level"
  } else return null
  return (
    <div className="mt-2">
      <div className="flex justify-between text-[9px] mb-1" style={{ color: "#9E9580" }}>
        <span>{label}</span><span style={{ color }}>{Math.round(pct)}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "#2D2D44" }}>
        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }}
          transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
          className="h-full rounded-full" style={{ background: color }} />
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><div className="text-[9px] tracking-[0.3em] uppercase mb-1" style={{ color: "#9E9580", opacity: 0.6 }}>{label}</div>{children}</div>
}
function FIn({ value, onChange, placeholder, type = "text" }: { value: string; onChange: (v: string) => void; placeholder: string; type?: string }) {
  return <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
    className="w-full text-xs px-3 py-2 outline-none"
    style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}
    onFocus={e => { e.target.style.borderColor = "#F5A62360" }} onBlur={e => { e.target.style.borderColor = "#2D2D44" }} />
}

export default function RewardPage() {
  const router = useRouter()
  const [uid, setUid] = useState("")
  const [mounted, setMounted] = useState(false)

  const [rewards, setRewards] = useState<GrdRecord[]>([])
  const [skills, setSkills] = useState<GrdRecord[]>([])
  const [missions, setMissions] = useState<GrdRecord[]>([])
  const [xpLogs, setXpLogs] = useState<GrdRecord[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [claimingId, setClaimId] = useState<string | null>(null)
  const [showClaim, setShowClaim] = useState<GrdRecord | null>(null)
  const [filter, setFilter] = useState<"all" | "available" | "locked" | "claimed">("all")

  const [form, setForm] = useState({
    title: "", description: "", unlock_type: "xp",
    xp_required: "500", missions_required: "5", level_required: "5", skill_id: "",
  })

  useEffect(() => {
    setMounted(true)
    const g = sessionStorage.getItem("grdystem_guest")
    if (g) { setUid(`guest_${g.replace(/\s+/g, "_").toLowerCase()}`); return }
    const unsub = onAuthStateChanged(auth, u => {
      if (!u) { router.push("/login"); return }
      setUid(u.uid)
    })
    return () => unsub()
  }, [])

  const fetchAll = useCallback(async () => {
    if (!uid) return
    setLoading(true)
    const [r, s, m, x] = await Promise.all([
      apiGet({ type: "reward", user_id: uid }),
      apiGet({ type: "skill", user_id: uid }),
      apiGet({ type: "mission", user_id: uid }),
      apiGet({ type: "xp_log", user_id: uid, limit: "200" }),
    ])
    setRewards(Array.isArray(r) ? r : [])
    setSkills(Array.isArray(s) ? s : [])
    setMissions(Array.isArray(m) ? m : [])
    setXpLogs(Array.isArray(x) ? x : [])
    setLoading(false)
  }, [uid])

  useEffect(() => { if (uid) fetchAll() }, [uid, fetchAll])

  const totalXP = xpLogs.reduce((s, x) => s + (x.xp_value ?? 0), 0)
  const doneMissions = missions.filter(m => m.status === "completed").length

  const enriched = rewards.map(r => ({ ...r, ...checkUnlocked(r, totalXP, doneMissions, skills) }))
  const filtered = enriched.filter(r => {
    if (filter === "available") return r.unlocked && !r.is_claimed
    if (filter === "locked")    return !r.unlocked && !r.is_claimed
    if (filter === "claimed")   return r.is_claimed
    return true
  })

  const stats = {
    total:     rewards.length,
    available: enriched.filter(r => r.unlocked && !r.is_claimed).length,
    locked:    enriched.filter(r => !r.unlocked && !r.is_claimed).length,
    claimed:   enriched.filter(r => r.is_claimed).length,
  }

  async function claimReward(reward: GrdRecord) {
    setClaimId(reward.id)
    await apiPut(reward.id, { is_claimed: true, status: "completed" })
    setClaimId(null); setShowClaim(null); fetchAll()
  }
  async function deleteReward(id: string) { await apiDel(id); fetchAll() }
  async function createReward() {
    if (!form.title.trim()) return
    let uc: UnlockCondition | null = null
    if (form.unlock_type === "xp")       uc = { xp_required: Number(form.xp_required) }
    if (form.unlock_type === "missions") uc = { missions_required: Number(form.missions_required) }
    if (form.unlock_type === "level" && form.skill_id) uc = { level_required: Number(form.level_required), skill_id: form.skill_id }
    await apiPost("reward", { user_id: uid, title: form.title, description: form.description, unlock_condition: uc ? JSON.stringify(uc) : null })
    setForm({ title: "", description: "", unlock_type: "xp", xp_required: "500", missions_required: "5", level_required: "5", skill_id: "" })
    setShowForm(false); fetchAll()
  }

  if (!mounted) return null

  return (
    <div className="fixed inset-0 bg-[#0A0A0F] text-[#E8E0D0] flex flex-col overflow-hidden"
      style={{ fontFamily: "'Courier New', monospace" }}>
      <Scanlines />

      {/* ── HEADER ────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between gap-2 px-4 py-2.5 border-b border-[#2D2D44] z-10"
        style={{ background: "#0A0A0F" }}>
        <div className="flex items-center gap-2 min-w-0">
          <Link href="/dashboard">
            <motion.button whileHover={{ x: -2 }} whileTap={{ scale: 0.95 }}
              className="flex items-center gap-1.5 text-[10px] tracking-[0.2em] uppercase px-2.5 py-1.5 flex-shrink-0"
              style={{ color: "#9E9580", border: "1px solid #2D2D44", background: "#1A1A2E" }}
              onMouseEnter={e => { e.currentTarget.style.color = "#E8E0D0"; e.currentTarget.style.borderColor = "#9E958050" }}
              onMouseLeave={e => { e.currentTarget.style.color = "#9E9580"; e.currentTarget.style.borderColor = "#2D2D44" }}>
              <ArrowLeft className="w-3 h-3" />
              <span className="hidden sm:inline">Dashboard</span>
            </motion.button>
          </Link>
          <div className="min-w-0">
            <div className="text-[8px] tracking-[0.3em] uppercase" style={{ color: "#9E9580", opacity: 0.4 }}>// Reward Vault</div>
            <div className="text-xs font-bold uppercase tracking-wide truncate" style={{ color: "#E8E0D0" }}>Rewards</div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="hidden sm:flex items-center gap-1 text-[10px]" style={{ color: "#9E9580" }}>
            <Zap className="w-3 h-3" style={{ color: "#F5A623" }} />
            {totalXP.toLocaleString()} XP
          </div>
          <motion.button onClick={() => setShowForm(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
            className="flex items-center gap-1.5 px-2.5 py-2 text-[11px] tracking-widest uppercase"
            style={{ border: "1px solid #F5A62360", color: "#F5A623", fontFamily: "inherit" }}>
            <Plus className="w-3 h-3" />
            <span className="hidden sm:inline">New Reward</span>
            <span className="sm:hidden">New</span>
          </motion.button>
        </div>
      </header>

      {/* ── SCROLLABLE BODY ───────────────────────────── */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="p-3 sm:p-4 lg:p-6 max-w-5xl mx-auto">

          {/* Stat cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-4">
            {[
              { label: "Total",     value: stats.total,     icon: Gift,    color: "#F5A623" },
              { label: "Available", value: stats.available, icon: Unlock,  color: "#3D7A5C" },
              { label: "Locked",    value: stats.locked,    icon: Lock,    color: "#4A6FA5" },
              { label: "Claimed",   value: stats.claimed,   icon: Trophy,  color: "#D4892A" },
            ].map((s, i) => {
              const Icon = s.icon
              return (
                <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="border border-[#2D2D44] p-3" style={{ background: "#1A1A2E" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[8px] tracking-[0.2em] uppercase" style={{ color: "#9E9580" }}>{s.label}</span>
                    <Icon className="w-3 h-3" style={{ color: s.color }} />
                  </div>
                  <div className="text-xl sm:text-2xl font-black" style={{ color: s.color }}>{s.value}</div>
                </motion.div>
              )
            })}
          </div>

          {/* Filter tabs */}
          <div className="flex overflow-x-auto border-b border-[#2D2D44] mb-4 gap-0">
            {(["all", "available", "locked", "claimed"] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)}
                className="text-[10px] px-3 py-2 tracking-widest uppercase whitespace-nowrap flex-shrink-0 transition-all duration-150"
                style={{
                  color: filter === f ? "#F5A623" : "#9E9580",
                  borderBottom: filter === f ? "2px solid #F5A623" : "2px solid transparent",
                  marginBottom: "-1px", background: "transparent", fontFamily: "inherit",
                }}>
                {f === "available" && stats.available > 0 && filter !== "available"
                  ? <span style={{ color: "#3D7A5C" }}>{f} ({stats.available})</span>
                  : f}
              </button>
            ))}
          </div>

          {/* Reward grid */}
          {loading ? (
            <div className="text-xs py-12 text-center" style={{ color: "#9E9580" }}>Loading rewards...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16">
              <Gift className="w-10 h-10 mx-auto mb-4" style={{ color: "#2D2D44" }} />
              <div className="text-sm font-bold mb-1" style={{ color: "#9E9580" }}>
                {filter === "claimed" ? "No rewards claimed yet."
                  : filter === "available" ? "No rewards available yet."
                  : "No rewards created yet."}
              </div>
              {filter === "all" && <div className="text-xs" style={{ color: "#9E9580", opacity: 0.5 }}>Create your first reward to get started.</div>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {filtered.map((r, i) => (
                  <motion.div key={r.id}
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: i * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={!r.is_claimed ? { y: -2 } : {}}
                    className="relative border flex flex-col p-4"
                    style={{
                      background: r.is_claimed ? "#12121A" : "#1A1A2E",
                      border: r.is_claimed ? "1px solid #D4892A40" : r.unlocked ? "1px solid #3D7A5C40" : "1px solid #2D2D44",
                      opacity: r.is_claimed ? 0.75 : 1,
                    }}>

                    {r.is_claimed && (
                      <div className="absolute inset-0 pointer-events-none"
                        style={{ background: "linear-gradient(135deg, #D4892A08 0%, transparent 60%)" }} />
                    )}

                    {/* Top row */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {r.is_claimed ? (
                          <div className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center"
                            style={{ background: "#D4892A20", border: "1px solid #D4892A40" }}>
                            <Trophy className="w-3 h-3" style={{ color: "#D4892A" }} />
                          </div>
                        ) : r.unlocked ? (
                          <motion.div
                            animate={{ boxShadow: ["0 0 8px #3D7A5C30", "0 0 14px #3D7A5C50", "0 0 8px #3D7A5C30"] }}
                            transition={{ duration: 2, repeat: Infinity }}
                            className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center"
                            style={{ background: "#3D7A5C20", border: "1px solid #3D7A5C50" }}>
                            <Gift className="w-3 h-3" style={{ color: "#3D7A5C" }} />
                          </motion.div>
                        ) : (
                          <div className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center"
                            style={{ background: "#2D2D44" }}>
                            <Lock className="w-3 h-3" style={{ color: "#9E9580", opacity: 0.5 }} />
                          </div>
                        )}
                        <div className="text-[8px] tracking-[0.3em] uppercase" style={{
                          color: r.is_claimed ? "#D4892A" : r.unlocked ? "#3D7A5C" : "#9E9580",
                          opacity: r.is_claimed || r.unlocked ? 1 : 0.5,
                        }}>
                          {r.is_claimed ? "CLAIMED" : r.unlocked ? "AVAILABLE" : "LOCKED"}
                        </div>
                      </div>
                      {!r.is_claimed && (
                        <motion.button onClick={() => deleteReward(r.id)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                          className="flex-shrink-0 opacity-20 hover:opacity-70 transition-opacity p-0.5" style={{ color: "#9E9580" }}>
                          <X className="w-3.5 h-3.5" />
                        </motion.button>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-sm font-black mb-1 leading-snug" style={{
                      color: r.is_claimed ? "#9E9580" : "#E8E0D0",
                      textDecoration: r.is_claimed ? "line-through" : "none",
                      wordBreak: "break-word",
                    }}>{r.title}</h3>

                    {r.description && (
                      <p className="text-[10px] leading-relaxed mb-2 line-clamp-2" style={{ color: "#9E9580" }}>{r.description}</p>
                    )}

                    {/* Condition text */}
                    {r.unlock_condition && (() => {
                      const c = parseC(r.unlock_condition)
                      if (!c || !Object.keys(c).length) return null
                      return <div className="text-[9px] mb-1" style={{ color: "#9E9580", opacity: 0.5 }}>
                        {c.xp_required && `${c.xp_required.toLocaleString()} XP required`}
                        {c.missions_required && `${c.missions_required} missions required`}
                        {c.level_required && c.skill_id && `${skills.find(s => s.id === c.skill_id)?.title ?? "skill"} Lv.${c.level_required}`}
                      </div>
                    })()}

                    {/* Progress bar */}
                    {!r.is_claimed && <ProgressBar reward={r} xp={totalXP} done={doneMissions} skills={skills} />}

                    {/* Progress label */}
                    {!r.is_claimed && (
                      <div className="text-[9px] mt-1 mb-3" style={{ color: "#9E9580", opacity: 0.4 }}>
                        {(r as GrdRecord & { progress: string }).progress}
                      </div>
                    )}

                    {/* CTA */}
                    {!r.is_claimed && r.unlocked && (
                      <motion.button onClick={() => setShowClaim(r)}
                        whileHover={{ scale: 1.03, boxShadow: "0 0 18px #3D7A5C40" }} whileTap={{ scale: 0.97 }}
                        className="mt-auto w-full flex items-center justify-center gap-2 py-2.5 text-xs tracking-[0.2em] uppercase font-black"
                        style={{ background: "#3D7A5C", color: "#E8E0D0", fontFamily: "inherit" }}>
                        <Gift className="w-3.5 h-3.5" /> Claim
                      </motion.button>
                    )}
                    {r.is_claimed && (
                      <div className="mt-auto flex items-center justify-center gap-2 py-2 text-[10px] tracking-widest uppercase"
                        style={{ color: "#D4892A", opacity: 0.7 }}>
                        <Trophy className="w-3 h-3" /> Claimed
                      </div>
                    )}
                    {!r.is_claimed && !r.unlocked && (
                      <div className="mt-auto flex items-center justify-center gap-2 py-2.5 text-[10px] tracking-widest uppercase border border-[#2D2D44]"
                        style={{ color: "#9E9580", opacity: 0.35 }}>
                        <Lock className="w-3 h-3" /> Locked
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ── CLAIM MODAL ───────────────────────────────── */}
      <AnimatePresence>
        {showClaim && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "#0A0A0F95", backdropFilter: "blur(8px)" }}
            onClick={e => e.target === e.currentTarget && setShowClaim(null)}>
            <motion.div initial={{ opacity: 0, y: 24, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10 }} transition={{ ease: [0.34, 1.2, 0.64, 1], duration: 0.35 }}
              className="window w-full max-w-xs sm:max-w-sm"
              style={{ background: "#1A1A2E", border: "2px solid #3D7A5C60", fontFamily: "inherit" }}>
              <div className="title-bar" style={{ background: "linear-gradient(to right,#3D7A5C40,#1A1A2E)", padding: "4px 8px" }}>
                <div className="title-bar-text" style={{ color: "#E8E0D0", fontSize: "10px", letterSpacing: "0.1em" }}>claim_reward.exe</div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Close" onClick={() => setShowClaim(null)} style={{ filter: "invert(0.6)" }} />
                </div>
              </div>
              <div className="window-body" style={{ background: "#1A1A2E", margin: 0, padding: "20px" }}>
                <div className="text-center mb-5">
                  <motion.div
                    animate={{ scale: [1, 1.08, 1], boxShadow: ["0 0 14px #3D7A5C40", "0 0 26px #3D7A5C70", "0 0 14px #3D7A5C40"] }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                    className="w-12 h-12 mx-auto rounded-sm flex items-center justify-center mb-3"
                    style={{ background: "#3D7A5C20", border: "2px solid #3D7A5C60" }}>
                    <Trophy className="w-6 h-6" style={{ color: "#3D7A5C" }} />
                  </motion.div>
                  <div className="text-[9px] tracking-[0.4em] uppercase mb-2" style={{ color: "#3D7A5C" }}>Reward Unlocked</div>
                  <h3 className="text-sm font-black mb-1" style={{ color: "#E8E0D0", wordBreak: "break-word" }}>{showClaim.title}</h3>
                  {showClaim.description && <p className="text-xs" style={{ color: "#9E9580" }}>{showClaim.description}</p>}
                </div>
                <div className="text-[10px] text-center mb-4" style={{ color: "#9E9580", opacity: 0.6 }}>
                  Once claimed, this reward is marked as received. Cannot be undone.
                </div>
                <div className="flex gap-2">
                  <motion.button onClick={() => claimReward(showClaim)} disabled={claimingId === showClaim.id}
                    whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-black flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{ background: "#3D7A5C", color: "#E8E0D0", fontFamily: "inherit" }}>
                    {claimingId === showClaim.id
                      ? <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                      : <><Check className="w-3.5 h-3.5" /> Confirm</>}
                  </motion.button>
                  <motion.button onClick={() => setShowClaim(null)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                    className="px-4 py-2.5 text-xs tracking-widest uppercase"
                    style={{ border: "1px solid #2D2D44", color: "#9E9580", fontFamily: "inherit" }}>
                    Cancel
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── CREATE REWARD MODAL ───────────────────────── */}
      <AnimatePresence>
        {showForm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "#0A0A0F95", backdropFilter: "blur(8px)" }}
            onClick={e => e.target === e.currentTarget && setShowForm(false)}>
            <motion.div initial={{ opacity: 0, y: 28, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12 }} transition={{ ease: [0.34, 1.2, 0.64, 1], duration: 0.38 }}
              className="window w-full max-w-sm"
              style={{ background: "#1A1A2E", border: "2px solid #2D2D44", fontFamily: "inherit", maxHeight: "90vh", overflowY: "auto" }}>
              <div className="title-bar sticky top-0" style={{ background: "linear-gradient(to right,#2D2D44,#1A1A2E)", padding: "4px 8px" }}>
                <div className="title-bar-text" style={{ color: "#E8E0D0", fontSize: "10px", letterSpacing: "0.1em" }}>new_reward.exe</div>
                <div className="title-bar-controls">
                  <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
                  <button aria-label="Close" onClick={() => setShowForm(false)} style={{ filter: "invert(0.6)" }} />
                </div>
              </div>
              <div className="window-body" style={{ background: "#1A1A2E", margin: 0, padding: "16px" }}>
                <div className="space-y-3">
                  <Field label="Reward Name *">
                    <FIn value={form.title} onChange={v => setForm(p => ({ ...p, title: v }))} placeholder="e.g. Weekend gaming, Ramen date..." />
                  </Field>
                  <Field label="Description">
                    <FIn value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} placeholder="What does this mean to you?" />
                  </Field>
                  <Field label="Unlock Condition">
                    <div className="grid grid-cols-2 gap-1.5">
                      {[{ v: "xp", l: "⚡ XP Total" }, { v: "missions", l: "🎯 Missions" }, { v: "level", l: "⬆ Skill Level" }, { v: "free", l: "🔓 Always Free" }].map(opt => (
                        <button key={opt.v} onClick={() => setForm(p => ({ ...p, unlock_type: opt.v }))}
                          className="py-2 text-[10px] tracking-wide uppercase transition-all duration-150"
                          style={{ background: form.unlock_type === opt.v ? "#F5A62320" : "#12121A", border: `1px solid ${form.unlock_type === opt.v ? "#F5A62360" : "#2D2D44"}`, color: form.unlock_type === opt.v ? "#F5A623" : "#9E9580", fontFamily: "inherit" }}>
                          {opt.l}
                        </button>
                      ))}
                    </div>
                  </Field>

                  {form.unlock_type === "xp" && (
                    <Field label="XP Required"><FIn type="number" value={form.xp_required} onChange={v => setForm(p => ({ ...p, xp_required: v }))} placeholder="500" /></Field>
                  )}
                  {form.unlock_type === "missions" && (
                    <Field label="Missions to Complete"><FIn type="number" value={form.missions_required} onChange={v => setForm(p => ({ ...p, missions_required: v }))} placeholder="5" /></Field>
                  )}
                  {form.unlock_type === "level" && (
                    <div className="grid grid-cols-2 gap-2">
                      <Field label="Skill">
                        <select value={form.skill_id} onChange={e => setForm(p => ({ ...p, skill_id: e.target.value }))}
                          className="w-full text-xs px-3 py-2 outline-none"
                          style={{ background: "#12121A", border: "1px solid #2D2D44", color: "#E8E0D0", fontFamily: "inherit" }}>
                          <option value="">— Select —</option>
                          {skills.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                        </select>
                      </Field>
                      <Field label="Level Required"><FIn type="number" value={form.level_required} onChange={v => setForm(p => ({ ...p, level_required: v }))} placeholder="5" /></Field>
                    </div>
                  )}
                  {form.unlock_type === "free" && (
                    <div className="text-[10px] py-2 text-center" style={{ color: "#3D7A5C", opacity: 0.7 }}>Always available to claim.</div>
                  )}

                  <div className="flex gap-2 pt-1">
                    <motion.button onClick={createReward} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="flex-1 py-2.5 text-xs tracking-[0.2em] uppercase font-black"
                      style={{ background: "#D4892A", color: "#0A0A0F", fontFamily: "inherit" }}>
                      Create Reward
                    </motion.button>
                    <motion.button onClick={() => setShowForm(false)} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                      className="px-4 py-2.5 text-xs tracking-widest uppercase"
                      style={{ border: "1px solid #2D2D44", color: "#9E9580", fontFamily: "inherit" }}>
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