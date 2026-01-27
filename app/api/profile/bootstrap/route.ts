import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: existingProfile, error: existingError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle()

    if (existingError) {
      return NextResponse.json({ error: "Failed to check profile" }, { status: 500 })
    }

    if (existingProfile) {
      return NextResponse.json({ success: true, message: "Profile already exists" })
    }

    const firstName = (user.user_metadata as any)?.first_name || user.email?.split("@")[0] || "User"
    const lastName = (user.user_metadata as any)?.last_name || ""
    const employeeId = (user.user_metadata as any)?.employee_id || null
    const position = (user.user_metadata as any)?.position || null
    const phone = (user.user_metadata as any)?.phone || null
    const departmentId = (user.user_metadata as any)?.department_id || null

    const { error: insertError } = await supabase.from("user_profiles").insert({
      id: user.id,
      first_name: firstName,
      last_name: lastName,
      email: user.email,
      phone: phone,
      employee_id: employeeId,
      position: position,
      department_id: departmentId,
      role: "staff",
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })

    if (insertError) {
      return NextResponse.json({ error: "Failed to create profile" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
