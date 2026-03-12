import { NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase"

// ─── Types ────────────────────────────────────────────────────────
type RecordType = "skill" | "mission" | "reward" | "todo" | "xp_log"
type Status = "active" | "completed" | "locked" | "abandoned"
type Priority = "low" | "medium" | "high" | "critical"
type MissionType = "daily" | "weekly" | "boss"

// ─── Helpers ──────────────────────────────────────────────────────
function ok(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

function err(message: string, status = 400) {
  return NextResponse.json({ success: false, error: message }, { status })
}

function requireFields(body: Record<string, unknown>, fields: string[]) {
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      return `Field '${f}' is required`
    }
  }
  return null
}

// ─────────────────────────────────────────────────────────────────
// GET  /api/system?type=...&user_id=...&[filters]
// ─────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type      = searchParams.get("type") as RecordType | null
  const user_id   = searchParams.get("user_id")
  const id        = searchParams.get("id")
  const filter    = searchParams.get("filter")   // daily | weekly | boss
  const skill_id  = searchParams.get("skill_id")
  const status    = searchParams.get("status")
  const limit     = Number(searchParams.get("limit") || 50)
  const offset    = Number(searchParams.get("offset") || 0)

  if (!user_id && !id) return err("user_id or id is required", 400)

  // ── Fetch single row by id ──────────────────────────────────────
  if (id) {
    const { data, error } = await supabase
      .from("grdystem")
      .select("*")
      .eq("id", id)
      .single()

    if (error) return err(error.message, 404)
    return ok(data)
  }

  // ── Fetch by type ───────────────────────────────────────────────
  if (!type) return err("type is required", 400)

  let query = supabase
    .from("grdystem")
    .select("*")
    .eq("user_id", user_id!)
    .eq("type", type)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  // Optional filters
  if (filter)   query = query.eq("mission_type", filter)
  if (skill_id) query = query.eq("linked_skill_id", skill_id)
  if (status)   query = query.eq("status", status)

  const { data, error } = await query
  if (error) return err(error.message, 500)
  return ok(data)
}

// ─────────────────────────────────────────────────────────────────
// POST  /api/system?type=...
// ─────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const type = searchParams.get("type") as RecordType | null
  if (!type) return err("type is required", 400)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return err("Invalid JSON body", 400)
  }

  const missingUser = requireFields(body, ["user_id"])
  if (missingUser) return err(missingUser, 400)

  const now = new Date().toISOString()

  // ── skill ───────────────────────────────────────────────────────
  if (type === "skill") {
    const missing = requireFields(body, ["title"])
    if (missing) return err(missing, 400)

    const { data, error } = await supabase
      .from("grdystem")
      .insert({
        user_id:     body.user_id,
        type:        "skill",
        title:       body.title,
        description: body.description ?? null,
        status:      "active",
        xp_current:  0,
        level:       1,
        is_active:   true,
        is_claimed:  false,
        metadata:    body.metadata ?? { nodes: [] },
        created_at:  now,
        updated_at:  now,
      })
      .select()
      .single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  // ── mission ─────────────────────────────────────────────────────
  if (type === "mission") {
    const missing = requireFields(body, ["title", "mission_type"])
    if (missing) return err(missing, 400)

    const validMissionTypes: MissionType[] = ["daily", "weekly", "boss"]
    if (!validMissionTypes.includes(body.mission_type as MissionType)) {
      return err("mission_type must be daily | weekly | boss", 400)
    }

    const { data, error } = await supabase
      .from("grdystem")
      .insert({
        user_id:          body.user_id,
        type:             "mission",
        title:            body.title,
        description:      body.description ?? null,
        status:           "active",
        mission_type:     body.mission_type,
        xp_value:         body.xp_value ?? 50,
        linked_skill_id:  body.linked_skill_id ?? null,
        deadline:         body.deadline ?? null,
        is_active:        true,
        is_claimed:       false,
        metadata:         body.metadata ?? {},
        created_at:       now,
        updated_at:       now,
      })
      .select()
      .single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  // ── reward ──────────────────────────────────────────────────────
  if (type === "reward") {
    const missing = requireFields(body, ["title"])
    if (missing) return err(missing, 400)

    const { data, error } = await supabase
      .from("grdystem")
      .insert({
        user_id:            body.user_id,
        type:               "reward",
        title:              body.title,
        description:        body.description ?? null,
        status:             "locked",
        xp_value:           body.xp_value ?? 0,
        linked_skill_id:    body.linked_skill_id ?? null,
        linked_mission_id:  body.linked_mission_id ?? null,
        unlock_condition:   body.unlock_condition ?? null,
        is_claimed:         false,
        is_active:          true,
        metadata:           body.metadata ?? {},
        created_at:         now,
        updated_at:         now,
      })
      .select()
      .single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  // ── todo ────────────────────────────────────────────────────────
  if (type === "todo") {
    const missing = requireFields(body, ["title"])
    if (missing) return err(missing, 400)

    const validPriorities: Priority[] = ["low", "medium", "high", "critical"]
    const priority = (body.priority ?? "medium") as Priority
    if (!validPriorities.includes(priority)) {
      return err("priority must be low | medium | high | critical", 400)
    }

    const { data, error } = await supabase
      .from("grdystem")
      .insert({
        user_id:         body.user_id,
        type:            "todo",
        title:           body.title,
        description:     body.description ?? null,
        status:          "active",
        priority:        priority,
        deadline:        body.deadline ?? null,
        linked_skill_id: body.linked_skill_id ?? null,
        is_active:       true,
        is_claimed:      false,
        metadata:        body.metadata ?? {},
        created_at:      now,
        updated_at:      now,
      })
      .select()
      .single()

    if (error) return err(error.message, 500)
    return ok(data, 201)
  }

  // ── xp_log ──────────────────────────────────────────────────────
  if (type === "xp_log") {
    const missing = requireFields(body, ["title", "xp_value", "linked_skill_id"])
    if (missing) return err(missing, 400)

    const { data, error } = await supabase
      .from("grdystem")
      .insert({
        user_id:         body.user_id,
        type:            "xp_log",
        title:           body.title,
        xp_value:        body.xp_value,
        linked_skill_id: body.linked_skill_id,
        is_active:       true,
        is_claimed:      false,
        metadata:        body.metadata ?? {},
        created_at:      now,
        updated_at:      now,
      })
      .select()
      .single()

    if (error) return err(error.message, 500)

    // Auto update skill xp_current + level
    await updateSkillXP(body.linked_skill_id as string, body.xp_value as number)

    return ok(data, 201)
  }

  return err(`Unknown type: ${type}`, 400)
}

// ─────────────────────────────────────────────────────────────────
// PUT  /api/system?id=...
// ─────────────────────────────────────────────────────────────────
export async function PUT(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id = searchParams.get("id")
  if (!id) return err("id is required", 400)

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return err("Invalid JSON body", 400)
  }

  // Strip fields that should never be updated directly
  const { id: _id, user_id: _uid, type: _type, created_at: _ca, ...updateFields } = body

  const payload = {
    ...updateFields,
    updated_at: new Date().toISOString(),
  }

  const { data, error } = await supabase
    .from("grdystem")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) return err(error.message, 500)

  // ── If mission completed → auto log XP to linked skill ─────────
  if (
    payload.status === "completed" &&
    data.type === "mission" &&
    data.linked_skill_id &&
    data.xp_value
  ) {
    await supabase.from("grdystem").insert({
      user_id:         data.user_id,
      type:            "xp_log",
      title:           `Mission completed: ${data.title}`,
      xp_value:        data.xp_value,
      linked_skill_id: data.linked_skill_id,
      is_active:       true,
      is_claimed:      false,
      metadata:        { source: "mission", mission_id: data.id },
      created_at:      new Date().toISOString(),
      updated_at:      new Date().toISOString(),
    })
    await updateSkillXP(data.linked_skill_id, data.xp_value)
  }

  return ok(data)
}

// ─────────────────────────────────────────────────────────────────
// DELETE  /api/system?id=...   (soft delete → is_active = false)
// ─────────────────────────────────────────────────────────────────
export async function DELETE(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const id   = searchParams.get("id")
  const hard = searchParams.get("hard") === "true"

  if (!id) return err("id is required", 400)

  if (hard) {
    const { error } = await supabase
      .from("grdystem")
      .delete()
      .eq("id", id)

    if (error) return err(error.message, 500)
    return ok({ id, deleted: true })
  }

  // Soft delete
  const { data, error } = await supabase
    .from("grdystem")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single()

  if (error) return err(error.message, 500)
  return ok({ id, deleted: true, soft: true })
}

// ─────────────────────────────────────────────────────────────────
// Internal: update skill xp_current + recalculate level
// level formula: floor(xp_current / 100) + 1 (max 99)
// ─────────────────────────────────────────────────────────────────
async function updateSkillXP(skill_id: string, xp_gained: number) {
  const { data: skill } = await supabase
    .from("grdystem")
    .select("xp_current, level")
    .eq("id", skill_id)
    .eq("type", "skill")
    .single()

  if (!skill) return

  const newXP    = (skill.xp_current ?? 0) + xp_gained
  const newLevel = Math.min(Math.floor(newXP / 100) + 1, 99)

  await supabase
    .from("grdystem")
    .update({
      xp_current: newXP,
      level:      newLevel,
      updated_at: new Date().toISOString(),
    })
    .eq("id", skill_id)
}