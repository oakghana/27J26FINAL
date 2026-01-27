import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

// PUT /api/leave/[id] - Approve or reject a leave request
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has permission to approve/reject
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    if (!profile || !["admin", "department_head", "regional_manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 })
    }

    const leaveId = params.id
    const body = await request.json()
    const { action, rejection_reason } = body

    if (!["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Invalid action. Must be 'approve' or 'reject'" }, { status: 400 })
    }

    if (action === "reject" && !rejection_reason) {
      return NextResponse.json({ error: "Rejection reason is required" }, { status: 400 })
    }

    // Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("*")
      .eq("id", leaveId)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    if (leaveRequest.status !== "pending") {
      return NextResponse.json({ error: "Leave request has already been processed" }, { status: 400 })
    }

    // Update the leave request
    const updateData: any = {
      status: action === "approve" ? "approved" : "rejected",
      updated_at: new Date().toISOString()
    }

    if (action === "approve") {
      updateData.approved_by = user.id
      updateData.approved_at = new Date().toISOString()
    } else {
      updateData.rejected_by = user.id
      updateData.rejected_at = new Date().toISOString()
      updateData.rejection_reason = rejection_reason
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from("leave_requests")
      .update(updateData)
      .eq("id", leaveId)
      .select(`
        *,
        user:user_profiles(first_name, last_name, employee_id, department_id, departments(name)),
        approved_by_profile:user_profiles!approved_by(first_name, last_name),
        rejected_by_profile:user_profiles!rejected_by(first_name, last_name)
      `)
      .single()

    if (updateError) {
      console.error("Error updating leave request:", updateError)
      return NextResponse.json({ error: "Failed to update leave request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedRequest,
      message: `Leave request ${action === "approve" ? "approved" : "rejected"} successfully`
    })

  } catch (error) {
    console.error("Leave management API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/leave/[id] - Delete a leave request (only by the requester if pending)
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const leaveId = params.id

    // Get the leave request
    const { data: leaveRequest, error: fetchError } = await supabase
      .from("leave_requests")
      .select("user_id, status")
      .eq("id", leaveId)
      .single()

    if (fetchError || !leaveRequest) {
      return NextResponse.json({ error: "Leave request not found" }, { status: 404 })
    }

    // Check permissions
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single()

    const isOwner = leaveRequest.user_id === user.id
    const isManager = profile && ["admin", "department_head", "regional_manager"].includes(profile.role)
    const canDelete = (isOwner && leaveRequest.status === "pending") || isManager

    if (!canDelete) {
      return NextResponse.json({ error: "Insufficient permissions to delete this leave request" }, { status: 403 })
    }

    // Delete the leave request
    const { error: deleteError } = await supabase
      .from("leave_requests")
      .delete()
      .eq("id", leaveId)

    if (deleteError) {
      console.error("Error deleting leave request:", deleteError)
      return NextResponse.json({ error: "Failed to delete leave request" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: "Leave request deleted successfully"
    })

  } catch (error) {
    console.error("Leave deletion API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}