import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { RegionalManagerDashboard } from "@/components/admin/regional-manager-dashboard"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

export default async function RegionalManagerPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("* , departments(name, code)")
    .eq("id", user.id)
    .single()

  if (!profile || profile.role !== "regional_manager") {
    redirect("/dashboard")
  }

  return (
    <DashboardLayout>
      <RegionalManagerDashboard userProfile={profile} />
    </DashboardLayout>
  )
}