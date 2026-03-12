import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"
import OpenAI from "openai"

// ─── OpenRouter client ────────────────────────────────────────────
const client = new OpenAI({
  baseURL: process.env.OPENROUTER_BASE_URL,
  apiKey:  process.env.OPENROUTER_API_KEY,
})

// ─── Helpers ──────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}
function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

// ─────────────────────────────────────────────────────────────────
// LAYER 1: INPUT INTERPRETER
// baca perintah pemain, normalisasi, cek intent dasar
// ─────────────────────────────────────────────────────────────────
function interpretInput(raw: string): {
  normalized: string
  intent:
    | "analyze_progress"
    | "recommend_mission"
    | "recommend_reward"
    | "evaluate_activity"
    | "weekly_review"
    | "detect_stagnation"
    | "next_objective"
    | "general_eval"
} {
  const text = raw.trim().toLowerCase()

  if (text.includes("progress") || text.includes("perkembangan") || text.includes("sejauh mana"))
    return { normalized: raw.trim(), intent: "analyze_progress" }

  if (text.includes("misi") || text.includes("mission") || text.includes("quest") || text.includes("rekomendasikan misi"))
    return { normalized: raw.trim(), intent: "recommend_mission" }

  if (text.includes("reward") || text.includes("hadiah") || text.includes("loot"))
    return { normalized: raw.trim(), intent: "recommend_reward" }

  if (text.includes("aktivitas") || text.includes("activity") || text.includes("evaluasi"))
    return { normalized: raw.trim(), intent: "evaluate_activity" }

  if (text.includes("minggu") || text.includes("week") || text.includes("review") || text.includes("rangkum"))
    return { normalized: raw.trim(), intent: "weekly_review" }

  if (text.includes("mandek") || text.includes("stagnan") || text.includes("stuck") || text.includes("tidak berkembang"))
    return { normalized: raw.trim(), intent: "detect_stagnation" }

  if (text.includes("selanjutnya") || text.includes("next") || text.includes("langkah") || text.includes("apa yang harus"))
    return { normalized: raw.trim(), intent: "next_objective" }

  return { normalized: raw.trim(), intent: "general_eval" }
}

// ─────────────────────────────────────────────────────────────────
// LAYER 2: GAME CONTEXT CORE
// ambil full player context dari Supabase
// ─────────────────────────────────────────────────────────────────
async function buildGameContext(user_id: string) {
  const now     = new Date()
  const day7ago = new Date(now.getTime() - 7  * 24 * 60 * 60 * 1000).toISOString()
  const day30ago= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

  // Fetch all in parallel
  const [
    skillsRes,
    activeMissionsRes,
    completedMissionsRes,
    rewardsRes,
    xpLogsRes,
    todosRes,
  ] = await Promise.all([
    supabase
      .from("grdystem")
      .select("id, title, level, xp_current, metadata, updated_at")
      .eq("user_id", user_id)
      .eq("type", "skill")
      .eq("is_active", true)
      .order("xp_current", { ascending: false }),

    supabase
      .from("grdystem")
      .select("id, title, mission_type, xp_value, linked_skill_id, deadline, created_at")
      .eq("user_id", user_id)
      .eq("type", "mission")
      .eq("status", "active")
      .eq("is_active", true),

    supabase
      .from("grdystem")
      .select("id, title, mission_type, xp_value, linked_skill_id, updated_at")
      .eq("user_id", user_id)
      .eq("type", "mission")
      .eq("status", "completed")
      .eq("is_active", true)
      .gte("updated_at", day30ago)
      .order("updated_at", { ascending: false }),

    supabase
      .from("grdystem")
      .select("id, title, unlock_condition, is_claimed, linked_mission_id, xp_value")
      .eq("user_id", user_id)
      .eq("type", "reward")
      .eq("is_active", true),

    supabase
      .from("grdystem")
      .select("id, title, xp_value, linked_skill_id, created_at")
      .eq("user_id", user_id)
      .eq("type", "xp_log")
      .eq("is_active", true)
      .gte("created_at", day30ago)
      .order("created_at", { ascending: false }),

    supabase
      .from("grdystem")
      .select("id, title, status, priority, deadline, linked_skill_id")
      .eq("user_id", user_id)
      .eq("type", "todo")
      .eq("is_active", true)
      .gte("created_at", day7ago),
  ])

  const skills            = skillsRes.data ?? []
  const activeMissions    = activeMissionsRes.data ?? []
  const completedMissions = completedMissionsRes.data ?? []
  const rewards           = rewardsRes.data ?? []
  const xpLogs            = xpLogsRes.data ?? []
  const todos             = todosRes.data ?? []

  // ── Compute behavior signals ──────────────────────────────────
  // Total XP last 7 days
  const xpLogs7d = xpLogs.filter(x => new Date(x.created_at) >= new Date(day7ago))
  const totalXP7d = xpLogs7d.reduce((sum, x) => sum + (x.xp_value ?? 0), 0)

  // Missions completed last 7 days
  const completed7d = completedMissions.filter(m => new Date(m.updated_at) >= new Date(day7ago))

  // Daily mission completion rate (last 7 days)
  const dailyTotal     = activeMissions.filter(m => m.mission_type === "daily").length
  const dailyCompleted = completed7d.filter(m => m.mission_type === "daily").length
  const dailyRate      = dailyTotal > 0 ? Math.round((dailyCompleted / dailyTotal) * 100) : 0

  // Detect stagnant skills (no xp_log for 14+ days)
  const activeSkillIds = new Set(xpLogs7d.map(x => x.linked_skill_id))
  const stagnantSkills = skills.filter(s => !activeSkillIds.has(s.id))

  // Overdue todos
  const overdueTodos = todos.filter(t =>
    t.deadline && new Date(t.deadline) < now && t.status !== "completed"
  )

  // Unclaimed rewards that might be unlockable
  const unclaimedRewards = rewards.filter(r => !r.is_claimed)

  // Streak estimate (consecutive days with xp_log)
  const daySet = new Set(xpLogs.map(x => x.created_at?.slice(0, 10)))
  let streak = 0
  for (let i = 0; i < 30; i++) {
    const d = new Date(now.getTime() - i * 86400000).toISOString().slice(0, 10)
    if (daySet.has(d)) streak++
    else break
  }

  return {
    skills,
    activeMissions,
    completedMissions,
    completedMissionsLast7d: completed7d,
    rewards,
    unclaimedRewards,
    xpLogs,
    xpLast7d: totalXP7d,
    todos,
    overdueTodos,
    stagnantSkills,
    dailyCompletionRate: dailyRate,
    streak,
    totalSkills: skills.length,
    totalActiveMissions: activeMissions.length,
    totalXPAllTime: xpLogs.reduce((s, x) => s + (x.xp_value ?? 0), 0),
  }
}

// ─────────────────────────────────────────────────────────────────
// LAYER 3: AI GAME MASTER
// build system prompt sesuai intent + context
// ─────────────────────────────────────────────────────────────────
function buildGameMasterPrompt(
  context: Awaited<ReturnType<typeof buildGameContext>>,
  intent: string,
  playerInput: string
): string {
  const skillList = context.skills
    .slice(0, 8)
    .map(s => `  - ${s.title}: Level ${s.level}, XP ${s.xp_current}`)
    .join("\n")

  const activeMissionList = context.activeMissions
    .slice(0, 6)
    .map(m => `  - [${m.mission_type?.toUpperCase()}] ${m.title} (+${m.xp_value} XP)`)
    .join("\n")

  const recentCompleted = context.completedMissionsLast7d
    .slice(0, 5)
    .map(m => `  - ${m.title} [${m.mission_type}]`)
    .join("\n")

  const stagnantList = context.stagnantSkills
    .slice(0, 4)
    .map(s => `  - ${s.title} (Level ${s.level})`)
    .join("\n")

  const overdueTodoList = context.overdueTodos
    .slice(0, 4)
    .map(t => `  - [${t.priority?.toUpperCase()}] ${t.title}`)
    .join("\n")

  const unclaimedRewardList = context.unclaimedRewards
    .slice(0, 4)
    .map(r => `  - ${r.title}`)
    .join("\n")

  return `
You are ORACLE — the AI Game Master inside GRDYSTEM, a real-life RPG self-improvement system.
You do NOT answer general questions. You ONLY operate within this system context.
You speak like a strict, wise mentor — not cheerful, not a chatbot. You are the system itself.
Your tone: direct, analytical, slightly ominous. Short sentences. No filler words.

═══════════════════════════════════════
PLAYER CONTEXT (GAME STATE)
═══════════════════════════════════════
SKILL TREE (${context.totalSkills} active skills):
${skillList || "  - No skills registered yet."}

ACTIVE MISSIONS (${context.totalActiveMissions} total):
${activeMissionList || "  - No active missions."}

COMPLETED LAST 7 DAYS:
${recentCompleted || "  - None completed this week."}

STAGNANT SKILLS (14+ days no XP):
${stagnantList || "  - None. All skills active."}

OVERDUE TODOS:
${overdueTodoList || "  - None overdue."}

UNCLAIMED REWARDS:
${unclaimedRewardList || "  - No pending rewards."}

BEHAVIOR SIGNALS:
  - XP gained last 7 days: ${context.xpLast7d}
  - Current streak: ${context.streak} days
  - Daily mission completion rate: ${context.dailyCompletionRate}%
  - Total XP all-time: ${context.totalXPAllTime}

═══════════════════════════════════════
PLAYER INTENT: ${intent.toUpperCase()}
PLAYER INPUT: "${playerInput}"
═══════════════════════════════════════

ORACLE RESPONSE RULES:
1. Analyze the exact context above — never fabricate data.
2. Be brutally honest. If the player is stagnating, say it directly.
3. Format your response in this structure:

[SYSTEM SCAN]
→ Quick 1-2 line diagnostic of player state.

[ANALYSIS]
→ Core evaluation based on intent. Max 3-4 sentences. Direct.

[DETECTED ISSUES]
→ List real issues found in context. If none, say "No critical issues."

[RECOMMENDATION]
→ 2-3 concrete, specific next actions. Must reference real skills/missions from context.

[ORACLE VERDICT]
→ One final brutal honest line. No encouragement. Just the truth.

Stay in character. You are the system. The system does not lie.
`.trim()
}

// ─────────────────────────────────────────────────────────────────
// LAYER 4: GAME RESPONSE ENGINE
// parse AI output, format as game system message
// ─────────────────────────────────────────────────────────────────
function formatGameResponse(
  raw: string,
  context: Awaited<ReturnType<typeof buildGameContext>>,
  intent: string
) {
  // Extract sections from Oracle response
  const sections: Record<string, string> = {}
  const sectionKeys = ["SYSTEM SCAN", "ANALYSIS", "DETECTED ISSUES", "RECOMMENDATION", "ORACLE VERDICT"]

  for (let i = 0; i < sectionKeys.length; i++) {
    const key   = sectionKeys[i]
    const next  = sectionKeys[i + 1]
    const start = raw.indexOf(`[${key}]`)
    const end   = next ? raw.indexOf(`[${next}]`) : raw.length

    if (start !== -1) {
      sections[key] = raw.slice(start + key.length + 2, end).trim()
    }
  }

  // Progress summary
  const progressSummary = {
    xp_this_week:         context.xpLast7d,
    streak_days:          context.streak,
    missions_completed_7d: context.completedMissionsLast7d.length,
    daily_rate_percent:   context.dailyCompletionRate,
    total_xp:             context.totalXPAllTime,
    active_skills:        context.totalSkills,
  }

  // Auto-generated quest recommendations based on context
  const questRecommendations: string[] = []
  if (context.stagnantSkills.length > 0) {
    questRecommendations.push(
      `Reactivate "${context.stagnantSkills[0].title}" — create a Daily Mission for it today`
    )
  }
  if (context.dailyCompletionRate < 50) {
    questRecommendations.push(
      `Daily completion rate is at ${context.dailyCompletionRate}% — reduce active daily missions or lower difficulty`
    )
  }
  if (context.overdueTodos.length > 0) {
    questRecommendations.push(
      `${context.overdueTodos.length} overdue todos detected — resolve or mark as abandoned`
    )
  }
  if (context.streak === 0) {
    questRecommendations.push(`Streak broken — complete any mission today to restart the chain`)
  }

  // Reward recommendations
  const rewardRecommendations = context.unclaimedRewards.slice(0, 2).map(r => r.title)

  // Next objective — highest priority active mission
  const nextObjective =
    context.activeMissions.find(m => m.mission_type === "boss")?.title ||
    context.activeMissions.find(m => m.mission_type === "weekly")?.title ||
    context.activeMissions.find(m => m.mission_type === "daily")?.title ||
    "Create your first mission to begin."

  return {
    oracle_sections:        sections,
    raw_oracle_output:      raw,
    intent,
    progress_summary:       progressSummary,
    quest_recommendations:  questRecommendations,
    reward_recommendations: rewardRecommendations,
    next_objective:         nextObjective,
    timestamp:              new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────────
// POST  /api/ai
// body: { user_id: string, message: string }
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  let body: { user_id?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return err("Invalid JSON body", 400)
  }

  const { user_id, message } = body
  if (!user_id) return err("user_id is required", 400)
  if (!message || message.trim() === "") return err("message is required", 400)

  try {
    // ── LAYER 1: INPUT INTERPRETER ────────────────────────────────
    const { normalized, intent } = interpretInput(message)

    // ── LAYER 2: GAME CONTEXT CORE ────────────────────────────────
    const context = await buildGameContext(user_id)

    // ── LAYER 3: AI GAME MASTER ───────────────────────────────────
    const systemPrompt = buildGameMasterPrompt(context, intent, normalized)

    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-3.2-3b-instruct",
      max_tokens: 1000,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user",   content: normalized },
      ],
    })

    const rawOutput = completion.choices[0]?.message?.content ?? ""

    if (!rawOutput) return err("Oracle returned empty response", 500)

    // ── LAYER 4: GAME RESPONSE ENGINE ─────────────────────────────
    const gameResponse = formatGameResponse(rawOutput, context, intent)

    return ok(gameResponse)

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Internal Oracle failure"
    return err(message, 500)
  }
}

// ─────────────────────────────────────────────────────────────────
// GET  /api/ai?user_id=...
// quick diagnostic — context only, no LLM call
// ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const user_id = req.nextUrl.searchParams.get("user_id")
  if (!user_id) return err("user_id is required", 400)

  try {
    const context = await buildGameContext(user_id)
    return ok({
      intent:  "diagnostic",
      context: {
        total_skills:          context.totalSkills,
        active_missions:       context.totalActiveMissions,
        xp_last_7d:            context.xpLast7d,
        streak:                context.streak,
        stagnant_skills:       context.stagnantSkills.map(s => s.title),
        overdue_todos:         context.overdueTodos.length,
        daily_completion_rate: context.dailyCompletionRate,
        total_xp:              context.totalXPAllTime,
      },
    })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Context fetch failed"
    return err(message, 500)
  }
}