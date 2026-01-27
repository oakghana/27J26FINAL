import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// GET /api/leave - Get leave requests (own requests for staff, all for managers)
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get("status")
    const userId = searchParams.get("user_id")

    let query = supabase
      .from("leave_requests")
      .select(`
        *,
        user:user_profiles(first_name, last_name, employee_id, department_id, departments(name)),
        approved_by_profile:user_profiles!approved_by(first_name, last_name),
        rejected_by_profile:user_profiles!rejected_by(first_name, last_name)
      `)
      .order("created_at", { ascending: false })

    // Filter by status if provided
    if (status) {
      query = query.eq("status", status)
    }

    // Filter by user if provided (for managers) or restrict to own requests (for staff)
    if (profile.role === "admin" || profile.role === "department_head" || profile.role === "regional_manager") {
      if (userId) {
        query = query.eq("user_id", userId)
      }
      // Managers can see all requests
    } else {
      // Staff can only see their own requests
      query = query.eq("user_id", user.id)
    }

    const { data: leaveRequests, error } = await query

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json({ error: "Failed to fetch leave requests" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: leaveRequests
    })

  } catch (error) {
    console.error("Leave API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/leave - Create a new leave request
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { start_date, end_date, reason } = body

    // Validate required fields
    if (!start_date || !end_date) {
      return NextResponse.json({ error: "Start date and end date are required" }, { status: 400 })
    }

    // Validate date range
    const startDate = new Date(start_date)
    const endDate = new Date(end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (startDate < today) {
      return NextResponse.json({ error: "Start date cannot be in the past" }, { status: 400 })
    }

    if (endDate < startDate) {
      return NextResponse.json({ error: "End date must be after start date" }, { status: 400 })
    }

    // Check for overlapping approved leave requests
    const { data: existingLeaves, error: checkError } = await supabase
      .from("leave_requests")
      .select("id, start_date, end_date, status")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .or(`and(start_date,lte.${end_date},end_date,gte.${start_date})`)

    if (checkError) {
      console.error("Error checking existing leaves:", checkError)
      return NextResponse.json({ error: "Failed to validate leave request" }, { status: 500 })
    }

    if (existingLeaves && existingLeaves.length > 0) {
      return NextResponse.json({
        error: "You already have an approved leave request that overlaps with these dates"
      }, { status: 400 })
    }

    // Create the leave request with auto-approval
    const { data: leaveRequest, error: insertError } = await supabase
      .from("leave_requests")
      .insert({
        user_id: user.id,
        start_date,
        end_date,
        reason: reason || null,
        status: "approved", // Auto-approve as per requirements
        approved_by: user.id, // Self-approved
        approved_at: new Date().toISOString()
      })
      .select(`
        *,
        user:user_profiles(first_name, last_name, employee_id, department_id, departments(name))
      `)
      .single()

    if (insertError) {
      console.error("Error creating leave request:", insertError)
      return NextResponse.json({ error: "Failed to create leave request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: leaveRequest,
      message: "Leave request submitted and approved automatically"
    })

  } catch (error) {
    console.error("Leave API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}