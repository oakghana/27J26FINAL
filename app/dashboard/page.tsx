import { DashboardLayout } from "@/components/dashboard/dashboard-layout"
import { StatsCard } from "@/components/dashboard/stats-card"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { createClient } from "@/lib/supabase/server"
import { Clock, Calendar, Users, TrendingUp, UserCheck, AlertCircle, Activity, User } from "lucide-react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { MobileAppDownload } from "@/components/ui/mobile-app-download"
import { StaffWarningModal } from "@/components/notifications/staff-warning-modal"
import { GPSStatusBanner } from "@/components/attendance/gps-status-banner"
import { WeeklySummaryModal } from "@/components/attendance/weekly-summary-modal"
import { RegionalManagerDashboard } from "@/components/admin/regional-manager-dashboard"
import { AdminLocationsOverview } from "@/components/admin/admin-locations-overview"

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile with error handling
  const { data: profile, error: profileError } = await supabase
    .from("user_profiles")
    .select(`
      *,
      departments (
        name,
        code
      )
    `)
    .eq("id", user.id)
    .maybeSingle() // Use maybeSingle instead of single to handle missing records

  // If no profile exists, show a message to contact admin
  if (!profile && !profileError) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Card className="w-full max-w-lg shadow-lg border-0 bg-gradient-to-br from-card to-card/50">
            <CardHeader className="text-center pb-6">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="text-2xl font-heading font-bold text-primary">Profile Setup Required</CardTitle>
              <CardDescription className="text-base">
                Your account needs to be set up by an administrator.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
                <p className="text-sm font-medium text-muted-foreground">Account Details</p>
                <p className="text-sm font-mono bg-background/50 px-3 py-2 rounded border">User ID: {user.id}</p>
                <p className="text-sm font-mono bg-background/50 px-3 py-2 rounded border">
                  Email: {user.email?.split("@")[0]}
                </p>
              </div>
              <p className="text-sm leading-relaxed">
                Please contact your IT administrator to complete your profile setup and gain access to the attendance
                system.
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    )
  }

  let pendingApprovals = 0
  if (profile?.role === "admin") {
    const { count } = await supabase
      .from("user_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_active", false)

    pendingApprovals = count || 0
  }

  // Check if user is currently on approved leave
  const { data: leaveCheck, error: leaveError } = await supabase
    .rpc('is_user_on_leave', { user_uuid: user.id })

  let currentLeave = null
  if (leaveCheck) {
    const { data: activeLeave } = await supabase
      .from("leave_requests")
      .select("start_date, end_date, reason")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .gte("end_date", new Date().toISOString().split("T")[0])
      .lte("start_date", new Date().toISOString().split("T")[0])
      .order("start_date", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (activeLeave) {
      currentLeave = {
        startDate: format(new Date(activeLeave.start_date), "MMM d, yyyy"),
        endDate: format(new Date(activeLeave.end_date), "MMM d, yyyy"),
        reason: activeLeave.reason
      }
    }
  }

  // Get today's attendance with error handling
  const today = new Date().toISOString().split("T")[0]
  const { data: todayAttendance, error: attendanceError } = await supabase
    .from("attendance_records")
    .select("*")
    .eq("user_id", user.id)
    .gte("check_in_time", `${today}T00:00:00`)
    .lt("check_in_time", `${today}T23:59:59`)
    .maybeSingle()

  // Get this month's attendance count with error handling
  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
  const { count: monthlyAttendance, error: monthlyError } = await supabase
    .from("attendance_records")
    .select("*", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("check_in_time", startOfMonth)

  // Get total locations with error handling
  const { count: totalLocations, error: locationsError } = await supabase
    .from("geofence_locations")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)

  // Fetch all locations for admin view
  const { data: allLocations } = await supabase
    .from("geofence_locations")
    .select("*")
    .eq("is_active", true)
    .order("name")

  // Calculate current day of month for attendance rate (computed on server)
  const currentDayOfMonth = new Date().getDate()

  return (
    <DashboardLayout>
      <WeeklySummaryModal />
      <StaffWarningModal />

      <div className="space-y-8">
        <GPSStatusBanner />

        {currentLeave && (
          <Alert className="border-orange-200 bg-orange-50/50 shadow-sm">
            <Calendar className="h-5 w-5 text-orange-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="text-orange-800 font-semibold text-base">On Leave</span>
                <span className="text-orange-700 ml-2">
                  {currentLeave.startDate} - {currentLeave.endDate}
                  {currentLeave.reason && ` • ${currentLeave.reason}`}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-orange-300 text-orange-700 hover:bg-orange-100"
                asChild
              >
                <Link href="/dashboard/profile">
                  View Details
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        {/* Leave Notification for Staff */}
        {!currentLeave && profile?.role === "staff" && (
          <Alert className="border-blue-200 bg-blue-50/50 shadow-sm">
            <User className="h-5 w-5 text-blue-600" />
            <AlertDescription className="flex items-center justify-between">
              <div>
                <span className="text-blue-800 font-semibold text-base">Leave Management</span>
                <span className="text-blue-700 ml-2">
                  Don't forget to submit your leave requests when needed
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="ml-4 border-blue-300 text-blue-700 hover:bg-blue-100"
                asChild
              >
                <Link href="/dashboard/leave">
                  <User className="h-4 w-4 mr-2" />
                  Manage Leave
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">Dashboard</h1>
          <p className="text-lg text-muted-foreground font-medium">
            Welcome back,{" "}
            <span className="text-primary font-semibold">{profile?.first_name || user.email?.split("@")[0]}</span>{" "}
            {profile?.last_name || ""}
          </p>
        </div>

        {profile?.role === "admin" && pendingApprovals > 0 && (
          <Alert className="border-primary/20 bg-primary/5 shadow-sm">
            <AlertCircle className="h-5 w-5 text-primary" />
            <AlertDescription className="flex items-center justify-between">
              <span className="text-primary font-semibold text-base">
                {pendingApprovals} user{pendingApprovals > 1 ? "s" : ""} awaiting approval
              </span>
              <Button asChild size="sm" className="ml-4 shadow-sm hover:shadow-md transition-shadow">
                <Link href="/dashboard/user-approvals">
                  <UserCheck className="h-4 w-4 mr-2" />
                  Review Now
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <StatsCard
            title="Today's Status"
            value={currentLeave ? "On Leave" : (todayAttendance ? "Checked In" : "Not Checked In")}
            description={
              currentLeave
                ? `Leave until ${currentLeave.endDate}`
                : todayAttendance
                ? `At ${format(new Date(todayAttendance.check_in_time), "h:mm a")}`
                : "Click to check in"
            }
            icon={currentLeave ? Calendar : Clock}
            variant={currentLeave ? "warning" : (todayAttendance ? "success" : "default")}
          />

          <StatsCard
            title="This Month"
            value={monthlyAttendance || 0}
            description="Days attended"
            icon={Calendar}
            trend={{ value: 5, isPositive: true }}
          />

          <StatsCard
            title="Department"
            value={profile?.departments?.code || "N/A"}
            description={profile?.departments?.name || "No department assigned"}
            icon={Users}
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <QuickActions
              isOnLeave={!!currentLeave}
              leavePeriod={currentLeave ? {
                startDate: currentLeave.startDate,
                endDate: currentLeave.endDate
              } : undefined}
            />
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-3">
            <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-heading font-semibold flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Recent Activity
                </CardTitle>
                <CardDescription className="text-base">Your latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {todayAttendance ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                      <div className="w-3 h-3 bg-primary rounded-full animate-pulse"></div>
                      <div className="flex-1">
                        <p className="font-semibold text-foreground">Checked in today</p>
                        <p className="text-sm text-muted-foreground font-medium">
                          {format(new Date(todayAttendance.check_in_time), "MMM d, yyyy h:mm a")}
                        </p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-muted/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Clock className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-lg font-medium text-muted-foreground">No attendance recorded today</p>
                    <p className="text-sm text-muted-foreground mt-2">Use the quick actions to check in</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
          <CardHeader className="pb-6">
            <CardTitle className="text-xl font-heading font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Performance Overview
            </CardTitle>
            <CardDescription className="text-base">Your attendance statistics and trends</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-3">
              <div className="text-center p-6 bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl border border-primary/10">
                <div className="text-3xl font-heading font-bold text-primary mb-2">{monthlyAttendance || 0}</div>
                <div className="text-sm font-medium text-muted-foreground">Days This Month</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-chart-2/5 to-chart-2/10 rounded-xl border border-chart-2/10">
                <div className="text-3xl font-heading font-bold text-chart-2 mb-2">
                  {monthlyAttendance ? Math.round((monthlyAttendance / currentDayOfMonth) * 100) : 0}%
                </div>
                <div className="text-sm font-medium text-muted-foreground">Attendance Rate</div>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-chart-3/5 to-chart-3/10 rounded-xl border border-chart-3/10">
                <div className="text-lg font-heading font-bold text-chart-3 mb-2">
                  {profile?.role === "admin"
                    ? "Administrator"
                    : profile?.role === "department_head"
                      ? "Department Head"
                      : profile?.role === "regional_manager"
                        ? "Regional Manager"
                        : profile?.role === "it-admin"
                          ? "IT Administrator"
                          : profile?.role?.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) || "Staff"}
                </div>
                <div className="text-sm font-medium text-muted-foreground">Role</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Admin Locations Overview */}
        {profile?.role === "admin" && allLocations && allLocations.length > 0 && (
          <AdminLocationsOverview locations={allLocations} />
        )}

        {/* Regional Manager Dashboard */}
        {profile?.role === "regional_manager" && (
          <RegionalManagerDashboard userProfile={profile} />
        )}
      </div>
      <MobileAppDownload variant="dashboard" />
    </DashboardLayout>
  )
}
