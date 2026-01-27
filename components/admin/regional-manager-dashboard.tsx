"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  MapPin,
  Users,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  UserCheck,
  UserX
} from "lucide-react"
import { calculateDistance } from "@/lib/location-utils"
import { useHydrated } from "@/hooks/use-hydrated"
  const isHydrated = useHydrated()

interface RegionalManagerDashboardProps {
  userProfile: {
    id: string
    assigned_region_id: string
    role: string
  }
}

interface LocationStats {
  location: GeofenceLocation
  totalUsers: number
  checkedInToday: number
  notCheckedInToday: number
  assignedToday: number
  absentOverdue: number
  users: Array<{
    id: string
    first_name: string
    last_name: string
    employee_id: string
    profile_image_url?: string
    last_checkin?: string
    status: 'checked_in' | 'not_checked_in' | 'absent'
  }>
  distance: number // Distance from regional manager's location
}

export function RegionalManagerDashboard({ userProfile }: RegionalManagerDashboardProps) {
  const [managerLocation, setManagerLocation] = useState<{latitude: number, longitude: number} | null>(null)

  useEffect(() => {
    loadRegionalData()
  }, [])

  const loadRegionalData = async () => {
    try {
      setIsLoading(true)

      // Get manager's current location
      if (typeof navigator !== 'undefined' && navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 300000 // 5 minutes
            })
          })
          setManagerLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          })
        } catch (locationError) {
          console.warn("[v0] Could not get manager location:", locationError)
          // Continue without location - distances will be calculated as 0
        }
      }

      // Get all locations in the regional manager's region
      const { data: locations, error: locationsError } = await supabase
        .from("geofence_locations")
        .select(`
          *,
          districts (
            region_id
          )
        `)
        .eq("is_active", true)
        .eq("districts.region_id", userProfile.assigned_region_id)

      if (locationsError) throw locationsError

      // Get today's date for attendance queries
      const today = new Date().toISOString().split('T')[0]
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]

      // For each location, get user stats
      const statsPromises = locations.map(async (location) => {
        // Get all users assigned to this location
        const { data: assignedUsers, error: usersError } = await supabase
          .from("user_profiles")
          .select("id, first_name, last_name, employee_id, profile_image_url")
          .eq("assigned_location_id", location.id)
          .eq("is_active", true)

        if (usersError) throw usersError

        // Get today's attendance records for these users
        const userIds = assignedUsers.map(u => u.id)
        const { data: todayAttendance, error: attendanceError } = await supabase
          .from("attendance_records")
          .select("user_id, check_in_time, check_out_time")
          .in("user_id", userIds)
          .gte("check_in_time", `${today}T00:00:00`)
          .lt("check_in_time", `${tomorrow}T00:00:00`)

        if (attendanceError) throw attendanceError

        // Calculate stats
        const checkedInUsers = new Set(todayAttendance.map(a => a.user_id))
        const checkedInToday = checkedInUsers.size
        const notCheckedInToday = assignedUsers.length - checkedInToday

        // For demo purposes, we'll assume all assigned users are assigned for today
        // In a real implementation, you'd check schedules
        const assignedToday = assignedUsers.length

        // Calculate absent/overdue (users who haven't checked in by expected time)
        const currentHour = new Date().getHours()
        const expectedCheckInHour = 9 // 9 AM
        const absentOverdue = currentHour >= expectedCheckInHour ? notCheckedInToday : 0

        // Get user details with attendance status
        const usersWithStatus = assignedUsers.map(user => {
          const userAttendance = todayAttendance.find(a => a.user_id === user.id)
          return {
            ...user,
            last_checkin: userAttendance?.check_in_time,
            status: checkedInUsers.has(user.id) ? 'checked_in' as const : 'not_checked_in' as const
          }
        })

        // Calculate distance from regional manager's location
        const distance = managerLocation
          ? calculateDistance(managerLocation.latitude, managerLocation.longitude, location.latitude, location.longitude) / 1000 // Convert to km
          : 0 // Default to 0 if location not available

        return {
          location,
          totalUsers: assignedUsers.length,
          checkedInToday,
          notCheckedInToday,
          assignedToday,
          absentOverdue,
          users: usersWithStatus,
          distance
        }
      })

      const stats = await Promise.all(statsPromises)
      setLocationStats(stats)
      setLastUpdated(new Date())

    } catch (error) {
      console.error("[v0] Failed to load regional data:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const refreshData = () => {
    loadRegionalData()
  }

  if (isLoading) {
    return (
      <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-muted-foreground">Loading regional dashboard...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const totalLocations = locationStats.length
  const totalUsers = locationStats.reduce((sum, stat) => sum + stat.totalUsers, 0)
  const totalCheckedIn = locationStats.reduce((sum, stat) => sum + stat.checkedInToday, 0)
  const totalAbsent = locationStats.reduce((sum, stat) => sum + stat.absentOverdue, 0)

  return (
    <div className="space-y-6">
      {/* Regional Overview Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm border-0 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-800 rounded-xl">
                <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">{totalLocations}</p>
                <p className="text-sm text-blue-700 dark:text-blue-300">Active Locations</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-green-100 dark:bg-green-800 rounded-xl">
                <Users className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-green-900 dark:text-green-100">{totalUsers}</p>
                <p className="text-sm text-green-700 dark:text-green-300">Total Staff</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950 dark:to-emerald-900">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-800 rounded-xl">
                <CheckCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-900 dark:text-emerald-100">{totalCheckedIn}</p>
                <p className="text-sm text-emerald-700 dark:text-emerald-300">Checked In Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-0 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900">
          <CardContent className="p-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-red-100 dark:bg-red-800 rounded-xl">
                <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-900 dark:text-red-100">{totalAbsent}</p>
                <p className="text-sm text-red-700 dark:text-red-300">Absent/Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Details */}
      <Card className="shadow-sm border-0 bg-gradient-to-br from-card to-card/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-heading font-semibold flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Location Monitoring
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Real-time attendance overview across all locations in your region
            </p>
          </div>
          <Button onClick={refreshData} variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {locationStats.map((stat) => (
              <div key={stat.location.id} className="border rounded-lg p-6 bg-gradient-to-r from-background to-muted/20">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{stat.location.name}</h3>
                      <p className="text-sm text-muted-foreground">{stat.location.address}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {stat.distance.toFixed(1)} km away
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex gap-2 mb-2">
                      <Badge variant="secondary" className="gap-1">
                        <UserCheck className="h-3 w-3" />
                        {stat.checkedInToday} Checked In
                      </Badge>
                      <Badge variant={stat.absentOverdue > 0 ? "destructive" : "outline"} className="gap-1">
                        <UserX className="h-3 w-3" />
                        {stat.absentOverdue} Absent
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {stat.totalUsers} total staff
                    </p>
                  </div>
                </div>

                {/* User List */}
                <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                  {stat.users.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-3 bg-background/50 rounded-lg border">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user.profile_image_url} />
                        <AvatarFallback className="text-xs">
                          {user.first_name[0]}{user.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.first_name} {user.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">{user.employee_id}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {user.status === 'checked_in' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                        {user.last_checkin && (
                          <span className="text-xs text-muted-foreground">
                            {isHydrated ? new Date(user.last_checkin).toLocaleTimeString("en-US") : "—"}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {locationStats.length === 0 && (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground">No locations found in your region</p>
              <p className="text-sm text-muted-foreground mt-2">
                Contact your administrator to assign locations to your region
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground text-center">
        Last updated: {isHydrated ? lastUpdated.toLocaleString("en-US") : "—"}
      </div>
    </div>
  )
}