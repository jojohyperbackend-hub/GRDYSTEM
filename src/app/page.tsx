"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useScroll, useTransform, useSpring, useInView } from "framer-motion"
import { ArrowRight, Zap, Shield, Target, GitBranch, Trophy, Brain, Cpu, Skull } from "lucide-react"
import Link from "next/link"
import "98.css"

// ─── clsx util ────────────────────────────────────────────────────
function clsx(...c: (string | undefined | false)[]): string {
  return c.filter(Boolean).join(" ")
}

// ─── Particles ────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 32 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2.5 + 0.5,
    duration: Math.random() * 22 + 14,
    delay: Math.random() * 12,
    opacity: Math.random() * 0.35 + 0.08,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-400"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [0, -44, 0], opacity: [p.opacity, p.opacity * 2.8, p.opacity], scale: [1, 1.5, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

// ─── Scanlines ────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 opacity-[0.025]"
      style={{ backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)" }}
    />
  )
}

// ─── Grid bg ──────────────────────────────────────────────────────
function GridBg() {
  return (
    <div
      className="absolute inset-0 opacity-[0.035] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(#4A6FA5 1px, transparent 1px), linear-gradient(90deg, #4A6FA5 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  )
}

// ─── Section reveal ───────────────────────────────────────────────
function Reveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true, margin: "-72px" })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 52 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.75, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

// ─── 98.css Window wrapper ────────────────────────────────────────
function Win98Window({
  title,
  children,
  className = "",
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={clsx("window", className)}
      style={{ background: "#1A1A2E", border: "2px solid #2D2D44", fontFamily: "inherit" }}
    >
      <div
        className="title-bar"
        style={{ background: "linear-gradient(to right, #2D2D44, #1A1A2E)", padding: "4px 6px" }}
      >
        <div className="title-bar-text" style={{ color: "#E8E0D0", fontSize: "11px", letterSpacing: "0.1em" }}>
          {title}
        </div>
        <div className="title-bar-controls">
          <button aria-label="Minimize" style={{ filter: "invert(0.7)" }} />
          <button aria-label="Maximize" style={{ filter: "invert(0.7)" }} />
          <button aria-label="Close" style={{ filter: "invert(0.7)" }} />
        </div>
      </div>
      <div className="window-body" style={{ background: "#1A1A2E", padding: "16px", margin: 0 }}>
        {children}
      </div>
    </div>
  )
}

// ─── Feature data ─────────────────────────────────────────────────
const features = [
  {
    icon: GitBranch,
    label: "SKILL TREE",
    title: "Build Your Mastery Web",
    desc: "Every skill you learn becomes a living node. Unlock sub-abilities, track XP, gain levels. No skill tree is the same.",
    accent: "text-blue-400",
    border: "border-blue-400/20",
  },
  {
    icon: Target,
    label: "MISSION SYSTEM",
    title: "Daily. Weekly. Boss.",
    desc: "Three tiers of missions — all self-defined. From micro-habits to landmark goals. Every completion feeds your character.",
    accent: "text-green-400",
    border: "border-green-400/20",
  },
  {
    icon: Trophy,
    label: "REWARD SYSTEM",
    title: "You Choose the Loot",
    desc: "Set personal rewards that unlock when you hit XP thresholds or finish Boss Missions. Real prizes for real progress.",
    accent: "text-amber-400",
    border: "border-amber-400/20",
  },
  {
    icon: Shield,
    label: "TODO PLANNER",
    title: "Pre-Mission Briefing",
    desc: "Plan every move before entering the field. Title, deadline, priority, status, linked skill — full tactical control.",
    accent: "text-red-400",
    border: "border-red-400/20",
  },
  {
    icon: Zap,
    label: "DASHBOARD",
    title: "Your War Room",
    desc: "XP growth charts, skill radar, completion rates, activity heatmap. All live data. All yours.",
    accent: "text-purple-400",
    border: "border-purple-400/20",
  },
  {
    icon: Brain,
    label: "ORACLE AI",
    title: "The System Speaks",
    desc: "An AI that only exists inside your system. Analyzes patterns, detects gaps, recommends missions, evaluates pace.",
    accent: "text-cyan-400",
    border: "border-cyan-400/20",
  },
]

const stats = [
  { value: "∞", label: "Skills You Can Build" },
  { value: "3", label: "Mission Tiers" },
  { value: "1", label: "Character — You" },
  { value: "0", label: "Shortcuts" },
]

const skillBars = [
  { name: "Programming", level: 12, xp: 78, color: "#4A6FA5" },
  { name: "Stoicism", level: 5, xp: 34, color: "#D4892A" },
  { name: "Physical Training", level: 8, xp: 55, color: "#3D7A5C" },
  { name: "Deep Work", level: 3, xp: 12, color: "#8B2020" },
]

// ─── Page ─────────────────────────────────────────────────────────
export default function LandingPage() {
  const { scrollYProgress } = useScroll()
  const heroOpacity = useTransform(scrollYProgress, [0, 0.22], [1, 0])
  const heroY = useTransform(scrollYProgress, [0, 0.22], [0, -64])
  const smoothY = useSpring(heroY, { stiffness: 55, damping: 18 })
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  if (!mounted) return null

  return (
    <main
      className="bg-[#0A0A0F] min-h-screen text-[#E8E0D0] overflow-x-hidden"
      style={{ fontFamily: "'Courier New', monospace" }}
    >

      {/* ───────────────── NAVBAR ───────────────────────────── */}
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-14 py-3 border-b border-[#2D2D44]/70 bg-[#0A0A0F]/85 backdrop-blur-md"
      >
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ opacity: [1, 0.3, 1] }}
            transition={{ duration: 2.4, repeat: Infinity }}
            className="w-2 h-2 rounded-full bg-amber-400"
            style={{ boxShadow: "0 0 10px #F5A623" }}
          />
          <span className="text-sm tracking-[0.35em] font-black text-[#E8E0D0] uppercase">GRDYSTEM</span>
        </div>

        <Link href="/login">
          <motion.button
            whileHover={{ scale: 1.05, boxShadow: "0 0 24px #F5A62345" }}
            whileTap={{ scale: 0.96 }}
            className="text-[11px] tracking-[0.25em] uppercase px-5 py-2 border border-amber-400/50 text-amber-400 hover:bg-amber-400/10 transition-colors duration-200"
            style={{ fontFamily: "inherit" }}
          >
            Enter System
          </motion.button>
        </Link>
      </motion.nav>

      {/* ───────────────── HERO ─────────────────────────────── */}
      <section className="relative min-h-screen flex flex-col items-center justify-center px-6 text-center overflow-hidden">
        <Particles />
        <Scanlines />
        <GridBg />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full pointer-events-none" style={{ background: "radial-gradient(ellipse, #F5A62308 0%, transparent 70%)" }} />

        <motion.div style={{ opacity: heroOpacity, y: smoothY }} className="relative z-20 max-w-4xl mx-auto">

          {/* Status badge */}
          <motion.div
            initial={{ opacity: 0, y: -18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15 }}
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.45em] uppercase border px-4 py-1.5 mb-10"
            style={{ color: "#F5A623", borderColor: "#F5A62325", opacity: 0.8 }}
          >
            <motion.span
              animate={{ opacity: [1, 0, 1] }}
              transition={{ duration: 1.2, repeat: Infinity }}
              className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block"
            />
            System Online — v1.0.0
          </motion.div>

          {/* Headline */}
          <motion.h1
            initial={{ opacity: 0, y: 36 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.1, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="text-5xl md:text-7xl lg:text-[88px] font-black tracking-tight uppercase leading-[0.92] mb-6"
            style={{ color: "#E8E0D0" }}
          >
            Your Life
            <br />
            <span style={{ color: "#F5A623", textShadow: "0 0 50px #F5A62355" }}>Is The Game.</span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.85, delay: 0.6 }}
            className="text-sm md:text-base leading-relaxed max-w-lg mx-auto mb-12 tracking-wide"
            style={{ color: "#9E9580" }}
          >
            A gamified self-improvement OS. Build real skills.
            <br className="hidden md:block" />
            Complete real missions. Level up — except the character is you.
          </motion.p>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, delay: 0.82, ease: [0.34, 1.56, 0.64, 1] }}
          >
            <Link href="/login">
              <motion.button
                whileHover={{ scale: 1.06, boxShadow: "0 0 48px #D4892A55" }}
                whileTap={{ scale: 0.96 }}
                className="group inline-flex items-center gap-3 font-black text-sm tracking-[0.25em] uppercase px-10 py-4 transition-colors duration-200"
                style={{ background: "#D4892A", color: "#0A0A0F", boxShadow: "0 0 32px #D4892A25", fontFamily: "inherit" }}
              >
                Begin Your Grind
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
              </motion.button>
            </Link>
          </motion.div>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.2, duration: 1 }}
            className="absolute -bottom-28 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[9px] tracking-[0.45em] uppercase" style={{ color: "#9E9580", opacity: 0.4 }}>Scroll</span>
            <motion.div
              animate={{ y: [0, 7, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              className="w-px h-8"
              style={{ background: "linear-gradient(to bottom, #9E958040, transparent)" }}
            />
          </motion.div>
        </motion.div>
      </section>

      {/* ───────────────── STATS BAR ────────────────────────── */}
      <section className="border-y border-[#2D2D44] py-10 px-6" style={{ background: "#1A1A2E60" }}>
        <Reveal>
          <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
              >
                <div className="text-3xl md:text-4xl font-black mb-1" style={{ color: "#F5A623", textShadow: "0 0 24px #F5A62335" }}>
                  {s.value}
                </div>
                <div className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "#9E9580" }}>{s.label}</div>
              </motion.div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* ───────────────── ORACLE WINDOW (98.css) ───────────── */}
      <section className="py-32 px-6 border-b border-[#2D2D44]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "#4A6FA5", opacity: 0.7 }}>
              // Core Philosophy
            </div>
            <h2 className="text-3xl md:text-5xl font-black uppercase leading-tight mb-16" style={{ color: "#E8E0D0" }}>
              The Grind Is<br />
              <span style={{ color: "#9E9580" }}>The Point.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-2 gap-10 items-start">
            <Reveal delay={0.1}>
              <p className="text-sm leading-relaxed mb-4" style={{ color: "#9E9580" }}>
                Most productivity apps make progress feel effortless and cheap.
                GRDYSTEM does the opposite. Every XP point is earned. Every skill level means something.
                Every Boss Mission you finish is a landmark you will remember forever.
              </p>
              <p className="text-sm leading-relaxed mb-8" style={{ color: "#9E9580" }}>
                You are not a "user." You are a{" "}
                <span style={{ color: "#E8E0D0", fontWeight: "bold" }}>Wanderer</span>{" "}
                — building yourself from nothing, one completed mission at a time.
              </p>

              <Win98Window title="system_status.exe">
                <div className="space-y-2">
                  {[
                    { label: "Character Status", value: "ACTIVE", color: "#3D7A5C" },
                    { label: "Active Skills", value: "4 / ∞", color: "#4A6FA5" },
                    { label: "Boss Missions", value: "1 PENDING", color: "#8B2020" },
                    { label: "Current Streak", value: "7 DAYS", color: "#D4892A" },
                  ].map((row, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center text-xs"
                      style={{ borderBottom: "1px solid #2D2D44", paddingBottom: "6px" }}
                    >
                      <span style={{ color: "#9E9580" }}>{row.label}</span>
                      <span style={{ color: row.color, fontWeight: "bold", letterSpacing: "0.1em" }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </Win98Window>
            </Reveal>

            <Reveal delay={0.2}>
              <Win98Window title="oracle.sys — Live Feed">
                <div className="text-xs leading-[1.9]" style={{ color: "#3D7A5C", minHeight: "200px" }}>
                  <span style={{ color: "#9E9580", opacity: 0.5 }}>[ORACLE] &gt; </span>
                  Initializing user profile analysis...<br />
                  <span style={{ color: "#9E9580", opacity: 0.5 }}>[ORACLE] &gt; </span>
                  Skill gap detected:{" "}
                  <span style={{ color: "#F5A623" }}>Stoicism</span> — 14 days inactive.<br />
                  <span style={{ color: "#9E9580", opacity: 0.5 }}>[ORACLE] &gt; </span>
                  Recommending Daily Mission:{" "}
                  <span style={{ color: "#E8E0D0" }}>"Read Meditations 10 min"</span><br />
                  <span style={{ color: "#9E9580", opacity: 0.5 }}>[ORACLE] &gt; </span>
                  XP velocity:{" "}
                  <span style={{ color: "#3D7A5C" }}>+12.4% vs last week</span><br />
                  <span style={{ color: "#9E9580", opacity: 0.5 }}>[ORACLE] &gt; </span>
                  Boss Mission pace:{" "}
                  <span style={{ color: "#8B2020" }}>Below target.</span> Adjust or fall behind.<br />
                  <span style={{ color: "#9E9580", opacity: 0.5 }}>[ORACLE] &gt; </span>
                  Recommended reward:{" "}
                  <span style={{ color: "#D4892A" }}>"Weekend off-screen day"</span><br />
                  <span style={{ color: "#9E9580", opacity: 0.4 }}>_</span>
                  <motion.span
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    style={{ color: "#3D7A5C" }}
                  >█</motion.span>
                </div>
              </Win98Window>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ───────────────── FEATURES GRID ────────────────────── */}
      <section className="py-28 px-6 border-b border-[#2D2D44]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "#9E9580", opacity: 0.5 }}>
              // System Modules
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase mb-16" style={{ color: "#E8E0D0" }}>
              Six Systems.<br />One Character.
            </h2>
          </Reveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <Reveal key={i} delay={i * 0.08}>
                  <motion.div
                    whileHover={{ y: -5, boxShadow: "0 24px 48px rgba(0,0,0,0.5)" }}
                    transition={{ duration: 0.22 }}
                    className={clsx("border h-full p-6", f.border)}
                    style={{ background: "#1A1A2E" }}
                  >
                    <div className={clsx("mb-4", f.accent)}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className={clsx("text-[9px] tracking-[0.35em] uppercase mb-2", f.accent)}>{f.label}</div>
                    <h3 className="text-sm font-bold mb-3 leading-snug" style={{ color: "#E8E0D0" }}>{f.title}</h3>
                    <p className="text-xs leading-relaxed" style={{ color: "#9E9580" }}>{f.desc}</p>
                  </motion.div>
                </Reveal>
              )
            })}
          </div>
        </div>
      </section>

      {/* ───────────────── XP SKILL WINDOW (98.css) ─────────── */}
      <section className="py-32 px-6 border-b border-[#2D2D44]">
        <div className="max-w-3xl mx-auto">
          <Reveal>
            <div className="text-[10px] tracking-[0.4em] uppercase mb-4" style={{ color: "#F5A623", opacity: 0.5 }}>
              // Character Progression
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase mb-4" style={{ color: "#E8E0D0" }}>
              Watch Yourself Level Up
            </h2>
            <p className="text-sm leading-relaxed max-w-md mb-14" style={{ color: "#9E9580" }}>
              Every completed mission adds XP. Every XP milestone unlocks new skill nodes.
              Progress is visible, permanent, and yours alone.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <Win98Window title="skill_tree.exe — Active Skills">
              <div className="space-y-6">
                {skillBars.map((skill, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -16 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.12 + 0.2 }}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: "#E8E0D0" }}>
                        {skill.name}
                      </span>
                      <span className="text-[10px] tracking-widest" style={{ color: "#9E9580" }}>
                        LVL {skill.level}
                      </span>
                    </div>
                    <div style={{ position: "relative", height: "16px", background: "#2D2D44", border: "1px solid #0A0A0F" }}>
                      <motion.div
                        initial={{ width: 0 }}
                        whileInView={{ width: `${skill.xp}%` }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.3, delay: i * 0.12 + 0.3, ease: [0.22, 1, 0.36, 1] }}
                        style={{ height: "100%", background: skill.color, position: "absolute", top: 0, left: 0 }}
                      />
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-[9px]" style={{ color: "#9E9580", opacity: 0.5 }}>
                        {skill.xp}% to next level
                      </span>
                      <span className="text-[9px]" style={{ color: skill.color }}>
                        {Array(Math.floor(skill.xp / 10)).fill("▮").join("")}
                        {Array(10 - Math.floor(skill.xp / 10)).fill("▯").join("")}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </Win98Window>
          </Reveal>
        </div>
      </section>

      {/* ───────────────── BOSS MISSIONS ────────────────────── */}
      <section className="py-28 px-6 border-b border-[#2D2D44]">
        <div className="max-w-5xl mx-auto">
          <Reveal>
            <div className="text-[10px] tracking-[0.4em] uppercase mb-3" style={{ color: "#8B2020", opacity: 0.8 }}>
              // Boss Missions
            </div>
            <h2 className="text-3xl md:text-4xl font-black uppercase mb-14" style={{ color: "#E8E0D0" }}>
              The Hardest Goals<br />
              <span style={{ color: "#8B2020" }}>Deserve a Name.</span>
            </h2>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {[
              { name: "Launch First Side Project", xp: "2500 XP", skill: "Programming", status: "IN PROGRESS", progress: 62 },
              { name: "Run a Half Marathon", xp: "2000 XP", skill: "Physical Training", status: "PLANNED", progress: 20 },
              { name: "Read 24 Books This Year", xp: "1800 XP", skill: "Deep Work", status: "IN PROGRESS", progress: 45 },
            ].map((boss, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -4, boxShadow: "0 0 40px #8B202025" }}
                  className="border border-red-900/40 p-5"
                  style={{ background: "#1A1A2E" }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Skull className="w-4 h-4" style={{ color: "#8B2020" }} />
                    <span className="text-[9px] tracking-[0.3em] uppercase" style={{ color: "#8B2020" }}>Boss Mission</span>
                  </div>
                  <h3 className="text-sm font-bold mb-1 leading-snug" style={{ color: "#E8E0D0" }}>{boss.name}</h3>
                  <div className="text-[10px] mb-4" style={{ color: "#9E9580" }}>
                    {boss.skill} — {boss.xp}
                  </div>
                  <div style={{ height: "4px", background: "#2D2D44", marginBottom: "8px" }}>
                    <motion.div
                      initial={{ width: 0 }}
                      whileInView={{ width: `${boss.progress}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: i * 0.1 + 0.3 }}
                      style={{ height: "100%", background: "#8B2020" }}
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-[9px]" style={{ color: "#9E9580", opacity: 0.5 }}>{boss.progress}% complete</span>
                    <span
                      className="text-[9px] tracking-widest px-2 py-0.5"
                      style={{
                        color: boss.status === "IN PROGRESS" ? "#3D7A5C" : "#4A6FA5",
                        border: `1px solid ${boss.status === "IN PROGRESS" ? "#3D7A5C40" : "#4A6FA540"}`,
                      }}
                    >
                      {boss.status}
                    </span>
                  </div>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ───────────────── FINAL CTA (98.css dialog) ────────── */}
      <section className="py-44 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at center, #D4892A08 0%, transparent 70%)" }}
        />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <Reveal>
            <div className="text-[9px] tracking-[0.5em] uppercase mb-6" style={{ color: "#F5A623", opacity: 0.45 }}>
              // Begin Protocol
            </div>
            <h2 className="text-4xl md:text-6xl font-black uppercase leading-tight mb-6" style={{ color: "#E8E0D0" }}>
              Ready to<br />
              <span style={{ color: "#F5A623", textShadow: "0 0 50px #F5A62345" }}>Start the Grind?</span>
            </h2>
            <p className="text-sm leading-relaxed mb-12" style={{ color: "#9E9580" }}>
              No tutorial. No onboarding wizard.
              <br />
              Sign in, set your first skill, create your first Boss Mission, and the system begins.
            </p>

            <Win98Window title="grdystem — confirm_entry.exe">
              <div className="text-center py-4">
                <Cpu className="w-8 h-8 mx-auto mb-3" style={{ color: "#9E9580" }} />
                <p className="text-xs mb-6" style={{ color: "#9E9580" }}>
                  Warning: Progress cannot be undone.<br />
                  The system remembers everything.
                </p>
                <Link href="/login">
                  <motion.button
                    whileHover={{ scale: 1.04, boxShadow: "0 0 60px #D4892A50" }}
                    whileTap={{ scale: 0.96 }}
                    className="inline-flex items-center gap-3 font-black text-sm tracking-[0.25em] uppercase px-12 py-4 transition-colors duration-200"
                    style={{ background: "#D4892A", color: "#0A0A0F", boxShadow: "0 0 40px #D4892A22", fontFamily: "inherit" }}
                  >
                    Enter GRDYSTEM
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </Link>
              </div>
            </Win98Window>
          </Reveal>
        </div>
      </section>

      {/* ───────────────── FOOTER ───────────────────────────── */}
      <footer className="border-t border-[#2D2D44] py-10 px-6" style={{ background: "#1A1A2E40" }}>
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#F5A623", opacity: 0.6 }} />
            <span className="text-xs tracking-[0.35em] font-black uppercase" style={{ color: "#9E9580" }}>GRDYSTEM</span>
          </div>
          <p className="text-[10px] tracking-widest uppercase" style={{ color: "#9E9580", opacity: 0.35 }}>
            Real Skills. Real Progress. No Shortcuts.
          </p>
          <p className="text-[10px] tracking-widest" style={{ color: "#9E9580", opacity: 0.25 }}>
            © {new Date().getFullYear()} GRDYSTEM
          </p>
        </div>
      </footer>

    </main>
  )
}