import { createClient } from "@/lib/supabase/server"
import { type NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user has admin or department_head role
    const { data: profile } = await supabase.from("user_profiles").select("role").eq("id", user.id).single()

    if (!profile || !["admin", "department_head", "regional_manager"].includes(profile.role)) {
      return NextResponse.json({ error: "Admin or Department Head access required" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start_date")
    const endDate = searchParams.get("end_date")
    const locationId = searchParams.get("location_id")
    const departmentId = searchParams.get("department_id")

    // Build attendance query
    let attendanceQuery = supabase.from("attendance_records").select(`
        *,
        user_profiles (
          first_name,
          last_name,
          employee_id,
          departments (name),
          regions (name)
        ),
        qcc_locations (name, address)
      `)

    // Apply filters
    if (startDate) {
      attendanceQuery = attendanceQuery.gte("check_in_time", startDate)
    }
    if (endDate) {
      attendanceQuery = attendanceQuery.lte("check_in_time", endDate)
    }
    if (locationId) {
      attendanceQuery = attendanceQuery.eq("location_id", locationId)
    }

    // Get attendance data first
    const { data: rawAttendanceData, error: attendanceError } = await attendanceQuery

    if (attendanceError) {
      console.error("Error fetching attendance data:", attendanceError)
      return NextResponse.json({ error: "Failed to fetch attendance data" }, { status: 500 })
    }

    // Filter out attendance records for users who were on approved leave during the check-in date
    const attendanceData = []
    for (const record of rawAttendanceData || []) {
      const checkInDate = new Date(record.check_in_time).toISOString().split('T')[0]

      // Check if user was on leave on this date
      const { data: leaveCheck } = await supabase
        .rpc('is_user_on_leave', {
          user_uuid: record.user_id,
          check_timestamp: `${checkInDate}T12:00:00` // Use noon to check the date
        })

      // Only include record if user was not on leave
      if (!leaveCheck) {
        attendanceData.push(record)
      }
    }

    // Get summary statistics
    const { data: totalUsers } = await supabase.from("user_profiles").select("id", { count: "exact", head: true })

    const { data: activeUsers } = await supabase
      .from("user_profiles")
      .select("id", { count: "exact", head: true })
      .eq("is_active", true)

    // Calculate attendance statistics
    const totalRecords = attendanceData?.length || 0
    const uniqueUsers = new Set(attendanceData?.map((record) => record.user_id)).size
    const avgCheckInTime =
      attendanceData?.length > 0
        ? attendanceData.reduce((sum, record) => {
            const time = new Date(record.check_in_time).getHours() * 60 + new Date(record.check_in_time).getMinutes()
            return sum + time
          }, 0) / attendanceData.length
        : 0

    return NextResponse.json({
      data: attendanceData,
      summary: {
        totalUsers: totalUsers?.length || 0,
        activeUsers: activeUsers?.length || 0,
        totalRecords,
        uniqueUsers,
        avgCheckInTime:
          Math.floor(avgCheckInTime / 60) + ":" + String(Math.floor(avgCheckInTime % 60)).padStart(2, "0"),
      },
    })
  } catch (error) {
    console.error("Reports API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
