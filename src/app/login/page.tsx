"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, ArrowLeft, User, Zap, Chrome } from "lucide-react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { signInWithGoogle } from "@/lib/firebase"
import "98.css"

// ─── Cookie helper ────────────────────────────────────────────────
function setSessionCookie() {
  document.cookie = "grdystem_session=1; path=/; max-age=86400; SameSite=Lax"
}

// ─── Particles ────────────────────────────────────────────────────
function Particles() {
  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.4,
    duration: Math.random() * 18 + 12,
    delay: Math.random() * 10,
    opacity: Math.random() * 0.3 + 0.06,
  }))
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full bg-amber-400"
          style={{ left: `${p.x}%`, top: `${p.y}%`, width: p.size, height: p.size, opacity: p.opacity }}
          animate={{ y: [0, -36, 0], opacity: [p.opacity, p.opacity * 2.5, p.opacity], scale: [1, 1.4, 1] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  )
}

// ─── Grid bg ──────────────────────────────────────────────────────
function GridBg() {
  return (
    <div
      className="absolute inset-0 opacity-[0.03] pointer-events-none"
      style={{
        backgroundImage:
          "linear-gradient(#4A6FA5 1px, transparent 1px), linear-gradient(90deg, #4A6FA5 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
  )
}

// ─── Scanlines ────────────────────────────────────────────────────
function Scanlines() {
  return (
    <div
      className="absolute inset-0 pointer-events-none z-10 opacity-[0.018]"
      style={{
        backgroundImage:
          "repeating-linear-gradient(0deg, transparent, transparent 2px, #000 2px, #000 4px)",
      }}
    />
  )
}

// ─── Page ─────────────────────────────────────────────────────────
export default function LoginPage() {
  const router = useRouter()
  const [guestName, setGuestName]   = useState("")
  const [guestMode, setGuestMode]   = useState(false)
  const [loadingGoogle, setLoadGoogle] = useState(false)
  const [loadingGuest, setLoadGuest]  = useState(false)
  const [googleError, setGoogleError] = useState("")
  const [guestError, setGuestError]   = useState("")
  const [bootLines, setBootLines]     = useState<string[]>([])
  const [mounted, setMounted]         = useState(false)

  const lines = [
    "Initializing GRDYSTEM...",
    "Loading character modules...",
    "Connecting to mission database...",
    "System ready.",
  ]

  useEffect(() => {
    setMounted(true)
    let i = 0
    const interval = setInterval(() => {
      if (i < lines.length) {
        setBootLines((prev) => [...prev, lines[i]])
        i++
      } else {
        clearInterval(interval)
      }
    }, 480)
    return () => clearInterval(interval)
  }, [])

  // ── Google login ──────────────────────────────────────────────
  async function handleGoogleLogin() {
    setGoogleError("")
    setLoadGoogle(true)
    try {
      await signInWithGoogle()
      setSessionCookie()
      router.push("/dashboard")
    } catch {
      setGoogleError("Login gagal. Coba lagi.")
    } finally {
      setLoadGoogle(false)
    }
  }

  // ── Guest login ───────────────────────────────────────────────
  async function handleGuestLogin() {
    if (!guestName.trim()) {
      setGuestError("Nama petualang wajib diisi.")
      return
    }
    setGuestError("")
    setLoadGuest(true)
    try {
      sessionStorage.setItem("grdystem_guest", guestName.trim())
      setSessionCookie()
      await new Promise((r) => setTimeout(r, 600))
      router.push("/dashboard")
    } catch {
      setGuestError("Terjadi kesalahan. Coba lagi.")
    } finally {
      setLoadGuest(false)
    }
  }

  if (!mounted) return null

  return (
    <main
      className="relative min-h-screen w-full flex flex-col items-center justify-center px-4 overflow-hidden bg-[#0A0A0F]"
      style={{ fontFamily: "'Courier New', monospace" }}
    >
      <Particles />
      <GridBg />
      <Scanlines />

      {/* Radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[560px] h-[560px] rounded-full pointer-events-none"
        style={{ background: "radial-gradient(ellipse, #F5A62306 0%, transparent 68%)" }}
      />

      {/* ── BACK BUTTON ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute top-5 left-5 z-30"
      >
        <Link href="/">
          <motion.button
            whileHover={{ scale: 1.04, boxShadow: "0 0 16px #9E958025" }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-2 text-[11px] tracking-[0.25em] uppercase px-4 py-2 transition-all duration-200"
            style={{ color: "#9E9580", border: "1px solid #2D2D44", background: "#1A1A2E", fontFamily: "inherit" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#E8E0D0"; e.currentTarget.style.borderColor = "#9E958060" }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#9E9580"; e.currentTarget.style.borderColor = "#2D2D44" }}
          >
            <ArrowLeft className="w-3 h-3" />
            Kembali
          </motion.button>
        </Link>
      </motion.div>

      {/* ── BOOT TERMINAL ───────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.6 }}
        className="absolute top-16 left-6 text-left hidden md:block"
      >
        {bootLines.map((line, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
            className="text-[10px] tracking-widest"
            style={{
              color: i === bootLines.length - 1 ? "#3D7A5C" : "#9E9580",
              opacity: i === bootLines.length - 1 ? 0.85 : 0.3,
            }}
          >
            {i === bootLines.length - 1 ? "▸ " : "  "}{line}
          </motion.div>
        ))}
      </motion.div>

      {/* ── MAIN PANEL ──────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 60, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.3, ease: [0.34, 1.36, 0.64, 1] }}
        className="relative z-20 w-full max-w-md"
      >
        {/* 98.css window */}
        <div
          className="window"
          style={{
            background: "#1A1A2E",
            border: "2px solid #2D2D44",
            boxShadow: "0 0 60px #0A0A0F, 0 0 120px #F5A62308",
            fontFamily: "inherit",
          }}
        >
          {/* Title bar */}
          <div
            className="title-bar"
            style={{ background: "linear-gradient(to right, #2D2D44, #1A1A2E)", padding: "5px 8px" }}
          >
            <div className="title-bar-text" style={{ color: "#E8E0D0", fontSize: "11px", letterSpacing: "0.15em" }}>
              grdystem — auth_portal.exe
            </div>
            <div className="title-bar-controls">
              <button aria-label="Minimize" style={{ filter: "invert(0.6)" }} />
              <button aria-label="Maximize" style={{ filter: "invert(0.6)" }} />
              <button aria-label="Close" style={{ filter: "invert(0.6)" }} />
            </div>
          </div>

          {/* Window body */}
          <div className="window-body" style={{ background: "#1A1A2E", padding: "32px 28px 28px", margin: 0 }}>

            {/* ── Header ─────────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.6 }}
              className="text-center mb-8"
            >
              <div className="flex items-center justify-center gap-2 mb-4">
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#F5A623", boxShadow: "0 0 10px #F5A623" }}
                />
                <span className="text-lg tracking-[0.4em] font-black uppercase" style={{ color: "#E8E0D0" }}>
                  GRDYSTEM
                </span>
                <motion.div
                  animate={{ opacity: [1, 0.2, 1] }}
                  transition={{ duration: 2.2, repeat: Infinity, delay: 1.1 }}
                  className="w-2 h-2 rounded-full"
                  style={{ background: "#F5A623", boxShadow: "0 0 10px #F5A623" }}
                />
              </div>
              <p className="text-xs leading-relaxed" style={{ color: "#9E9580" }}>
                Masuk ke sistem untuk mulai menaikkan level kehidupanmu.
                <br />
                Setiap skill, misi, dan pencapaian tercatat di sini.
              </p>
            </motion.div>

            {/* ── Divider ────────────────────────── */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="mb-8"
              style={{ height: "1px", background: "linear-gradient(to right, transparent, #2D2D44, transparent)" }}
            />

            {/* ── Google Login ───────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.75, duration: 0.5 }}
              className="mb-6"
            >
              <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: "#9E9580", opacity: 0.5 }}>
                // Authenticated Access
              </div>

              <motion.button
                onClick={handleGoogleLogin}
                disabled={loadingGoogle}
                whileHover={!loadingGoogle ? { scale: 1.02, boxShadow: "0 0 28px #F5A62330" } : {}}
                whileTap={!loadingGoogle ? { scale: 0.97 } : {}}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 font-bold text-sm tracking-[0.15em] uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: loadingGoogle ? "#2D2D44" : "transparent",
                  border: "1px solid #F5A623",
                  color: "#F5A623",
                  fontFamily: "inherit",
                  boxShadow: "0 0 16px #F5A62315",
                }}
              >
                {loadingGoogle ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-amber-400/30 border-t-amber-400 rounded-full"
                    />
                    Authenticating...
                  </>
                ) : (
                  <>
                    <Chrome className="w-4 h-4" />
                    Masuk dengan Google
                  </>
                )}
              </motion.button>

              {googleError && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-[10px] mt-2 text-center tracking-wide"
                  style={{ color: "#8B2020" }}
                >
                  ⚠ {googleError}
                </motion.p>
              )}
            </motion.div>

            {/* ── Separator ──────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.9, duration: 0.4 }}
              className="flex items-center gap-3 mb-6"
            >
              <div className="flex-1" style={{ height: "1px", background: "#2D2D44" }} />
              <span className="text-[10px] tracking-[0.3em] uppercase" style={{ color: "#9E9580", opacity: 0.4 }}>
                atau
              </span>
              <div className="flex-1" style={{ height: "1px", background: "#2D2D44" }} />
            </motion.div>

            {/* ── Guest Mode ─────────────────────── */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.95, duration: 0.5 }}
            >
              <div className="text-[9px] tracking-[0.4em] uppercase mb-3" style={{ color: "#9E9580", opacity: 0.5 }}>
                // Guest Mode
              </div>

              {!guestMode ? (
                <motion.button
                  onClick={() => setGuestMode(true)}
                  whileHover={{ scale: 1.02, boxShadow: "0 0 20px #D4892A20" }}
                  whileTap={{ scale: 0.97 }}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-5 font-bold text-sm tracking-[0.15em] uppercase transition-all duration-200"
                  style={{
                    background: "transparent",
                    border: "1px solid #D4892A60",
                    color: "#D4892A",
                    fontFamily: "inherit",
                  }}
                >
                  <User className="w-4 h-4" />
                  Coba Sebagai Tamu
                </motion.button>
              ) : (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="space-y-3"
                >
                  <div>
                    <input
                      type="text"
                      value={guestName}
                      onChange={(e) => { setGuestName(e.target.value); setGuestError("") }}
                      onKeyDown={(e) => e.key === "Enter" && handleGuestLogin()}
                      placeholder="Masukkan nama petualangmu..."
                      maxLength={32}
                      autoFocus
                      className="w-full text-sm px-4 py-3 outline-none transition-all duration-200"
                      style={{
                        background: "#12121A",
                        border: `1px solid ${guestError ? "#8B2020" : "#2D2D44"}`,
                        color: "#E8E0D0",
                        fontFamily: "inherit",
                        letterSpacing: "0.05em",
                      }}
                      onFocus={(e) => { e.target.style.borderColor = "#D4892A"; e.target.style.boxShadow = "0 0 12px #D4892A18" }}
                      onBlur={(e) => { e.target.style.borderColor = guestError ? "#8B2020" : "#2D2D44"; e.target.style.boxShadow = "none" }}
                    />
                    {guestError && (
                      <motion.p
                        initial={{ opacity: 0, y: -4 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] mt-1 tracking-wide"
                        style={{ color: "#8B2020" }}
                      >
                        ⚠ {guestError}
                      </motion.p>
                    )}
                  </div>

                  <motion.button
                    onClick={handleGuestLogin}
                    disabled={loadingGuest}
                    whileHover={!loadingGuest ? { scale: 1.02, boxShadow: "0 0 24px #D4892A35" } : {}}
                    whileTap={!loadingGuest ? { scale: 0.97 } : {}}
                    className="w-full flex items-center justify-center gap-3 py-3.5 px-5 font-black text-sm tracking-[0.2em] uppercase transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{
                      background: loadingGuest ? "#2D2D44" : "#D4892A",
                      color: "#0A0A0F",
                      fontFamily: "inherit",
                      boxShadow: "0 0 24px #D4892A20",
                    }}
                  >
                    {loadingGuest ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-4 h-4 border-2 border-[#0A0A0F]/30 border-t-[#0A0A0F] rounded-full"
                        />
                        Entering...
                      </>
                    ) : (
                      <>
                        Masuk sebagai Tamu
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </motion.button>

                  <button
                    onClick={() => { setGuestMode(false); setGuestName(""); setGuestError("") }}
                    className="w-full text-[10px] tracking-[0.3em] uppercase transition-colors duration-200 py-1 hover:opacity-60"
                    style={{ color: "#9E9580", opacity: 0.4, fontFamily: "inherit" }}
                  >
                    Batalkan
                  </button>
                </motion.div>
              )}
            </motion.div>

            {/* ── Divider ────────────────────────── */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 1.1, duration: 0.5 }}
              className="mt-8 mb-5"
              style={{ height: "1px", background: "linear-gradient(to right, transparent, #2D2D44, transparent)" }}
            />

            {/* ── System note ────────────────────── */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="flex items-start gap-2"
            >
              <Zap className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: "#9E9580", opacity: 0.4 }} />
              <p className="text-[10px] leading-relaxed" style={{ color: "#9E9580", opacity: 0.4 }}>
                Login dengan akun Google untuk menyimpan seluruh progres secara permanen.
                Mode tamu tersedia untuk eksplorasi, namun data tidak tersimpan setelah sesi berakhir.
              </p>
            </motion.div>
          </div>
        </div>

        {/* ── Version tag ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4, duration: 0.5 }}
          className="text-center mt-4"
        >
          <span className="text-[9px] tracking-[0.4em] uppercase" style={{ color: "#9E9580", opacity: 0.25 }}>
            GRDYSTEM v1.0.0 — Real Skills. Real Progress.
          </span>
        </motion.div>
      </motion.div>

      {/* ── Corner hints ────────────────────────────────── */}
      <div className="absolute bottom-6 right-6 text-right hidden md:block">
        {["[ESC] — back to surface", "[ENTER] — confirm"].map((hint, i) => (
          <div key={i} className="text-[9px] tracking-[0.25em]" style={{ color: "#9E9580", opacity: 0.18 }}>
            {hint}
          </div>
        ))}
      </div>
    </main>
  )
}