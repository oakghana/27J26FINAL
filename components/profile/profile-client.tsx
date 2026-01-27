"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { User, Mail, Phone, MapPin, Building, Save, Camera, Lock, Key, Calendar, Eye, EyeOff } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { SecureInput } from "@/components/ui/secure-input"
import { validatePassword } from "@/lib/security"

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  employee_id: string
  position: string
  phone_number?: string
  role: string
  is_active: boolean
  profile_image_url?: string
  departments?: {
    id: string
    name: string
    code: string
  }
  districts?: {
    id: string
    name: string
  }
}

interface AttendanceSummary {
  totalDays: number
  totalHours: number
  averageHours: number
  thisMonthDays: number
  thisMonthHours: number
  presentDays: number
  lateDays: number
}

export function ProfileClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isBootstrapping, setIsBootstrapping] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null)

  const [editForm, setEditForm] = useState({
    first_name: "",
    last_name: "",
  })

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchAttendanceSummary()
  }, [])

  const fetchProfile = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        const { data: profileData, error } = await supabase
          .from("user_profiles")
          .select(`
            *,
            departments (
              id,
              name,
              code
            ),
            districts (
              id,
              name
            )
          `)
          .eq("id", user.id)
          .maybeSingle()

        if (error) throw error

        if (profileData) {
          setProfile(profileData)
          setEditForm({
            first_name: profileData.first_name || "",
            last_name: profileData.last_name || "",
          })
        } else {
          setProfile(null)
        }
      }
    } catch (error) {
      setError("Failed to load profile")
    } finally {
      setLoading(false)
    }
  }

  const handleBootstrapProfile = async () => {
    setIsBootstrapping(true)
    setError(null)
    try {
      const response = await fetch("/api/profile/bootstrap", { method: "POST" })
      const result = await response.json()
      if (!response.ok) {
        throw new Error(result?.error || "Failed to create profile")
      }
      setSuccess("Profile created successfully. Reloading...")
      await fetchProfile()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create profile")
    } finally {
      setIsBootstrapping(false)
    }
  }

  const fetchAttendanceSummary = async () => {
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const startOfYear = new Date(now.getFullYear(), 0, 1)

      // Fetch all-time attendance summary
      const { data: allTimeData, error: allTimeError } = await supabase
        .from("attendance_records")
        .select("work_hours, status, check_in_time")
        .eq("user_id", user.id)
        .gte("check_in_time", startOfYear.toISOString())

      if (allTimeError) throw allTimeError

      // Fetch this month's attendance
      const { data: monthData, error: monthError } = await supabase
        .from("attendance_records")
        .select("work_hours, status")
        .eq("user_id", user.id)
        .gte("check_in_time", startOfMonth.toISOString())

      if (monthError) throw monthError

      const totalDays = allTimeData?.length || 0
      const totalHours = allTimeData?.reduce((sum, record) => sum + (record.work_hours || 0), 0) || 0
      const averageHours = totalDays > 0 ? totalHours / totalDays : 0

      const thisMonthDays = monthData?.length || 0
      const thisMonthHours = monthData?.reduce((sum, record) => sum + (record.work_hours || 0), 0) || 0

      const presentDays = allTimeData?.filter((record) => record.status === "present").length || 0
      const lateDays = allTimeData?.filter((record) => record.status === "late").length || 0

      setAttendanceSummary({
        totalDays,
        totalHours,
        averageHours,
        thisMonthDays,
        thisMonthHours,
        presentDays,
        lateDays,
      })
    } catch (error) {
      console.error("Failed to fetch attendance summary:", error)
    }
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: editForm.first_name,
          last_name: editForm.last_name,
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id)

      if (error) throw error

      setSuccess("Profile updated successfully")
      setIsEditing(false)
      fetchProfile() // Refresh profile data
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError("Failed to update profile")
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New passwords do not match")
      return
    }

    const passwordValidation = validatePassword(passwordForm.newPassword)
    if (!passwordValidation.isValid) {
      setError(`Password requirements not met: ${passwordValidation.errors.join(", ")}`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || "Failed to update password")
      }

      setSuccess("Password updated successfully")
      setShowPasswordChange(false)
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setShowCurrentPassword(false)
      setShowNewPassword(false)
      setShowConfirmPassword(false)
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to update password")
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading profile...</div>
  }

  if (!profile) {
    return (
      <div className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <Card>
          <CardHeader>
            <CardTitle>Profile Setup Required</CardTitle>
            <CardDescription>
              Your profile record is missing. Click below to create it and continue.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <Button onClick={handleBootstrapProfile} disabled={isBootstrapping}>
              {isBootstrapping ? "Creating Profile..." : "Create Profile"}
            </Button>
            <p className="text-xs text-muted-foreground">
              If this keeps failing, contact your administrator.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const userInitials = `${profile.first_name?.[0] || "?"}${profile.last_name?.[0] || ""}`.trim() || "?"

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-primary">Profile Settings</h1>
        <p className="text-muted-foreground mt-2">
          Manage your personal information, account details, and attendance history
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert>
          <AlertDescription>{success}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Your QCC account details and contact information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={profile.profile_image_url || "/placeholder.svg"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">{userInitials}</AvatarFallback>
              </Avatar>
              <div>
                <Button variant="outline" size="sm">
                  <Camera className="mr-2 h-4 w-4" />
                  Change Photo
                </Button>
                <p className="text-sm text-muted-foreground mt-2">Upload a professional photo for your profile</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                {isEditing ? (
                  <SecureInput
                    id="firstName"
                    value={editForm.first_name}
                    onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })}
                    maxLength={50}
                    allowedChars={/^[a-zA-Z\s]*$/}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded-md">{profile.first_name}</div>
                )}
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                {isEditing ? (
                  <SecureInput
                    id="lastName"
                    value={editForm.last_name}
                    onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })}
                    maxLength={50}
                    allowedChars={/^[a-zA-Z\s]*$/}
                  />
                ) : (
                  <div className="p-2 bg-muted rounded-md">{profile.last_name}</div>
                )}
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  {profile.email}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Email cannot be changed</p>
              </div>
              <div>
                <Label htmlFor="employeeId">Employee ID</Label>
                <div className="p-2 bg-muted rounded-md">{profile.employee_id || "—"}</div>
                <p className="text-sm text-muted-foreground mt-1">Employee ID cannot be changed</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="position">Position</Label>
                <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                  {profile.position || "—"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Only admin can change position</p>
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  {profile.phone_number || "Not provided"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">Only admin can change phone number</p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Department</Label>
                <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                  <Building className="h-4 w-4 text-muted-foreground" />
                  {profile.departments?.name || "No department assigned"}
                </div>
              </div>
              <div>
                <Label>Location</Label>
                <div className="p-2 bg-muted rounded-md flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  {profile.districts?.name || "No location assigned"}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label>Role</Label>
                <div className="p-2">
                  <Badge variant={profile.role === "admin" ? "default" : "secondary"}>
                    {(profile.role || "staff").replace("_", " ").toUpperCase()}
                  </Badge>
                </div>
              </div>
              <div>
                <Label>Account Status</Label>
                <div className="p-2">
                  <Badge variant={profile.is_active ? "default" : "destructive"}>
                    {profile.is_active ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              {isEditing ? (
                <>
                  <Button onClick={handleSave} disabled={saving}>
                    <Save className="mr-2 h-4 w-4" />
                    {saving ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Password
            </CardTitle>
            <CardDescription>Change your account password</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={() => setShowPasswordChange(!showPasswordChange)}>
              <Key className="mr-2 h-4 w-4" />
              {showPasswordChange ? "Hide Password Form" : "Change Password"}
            </Button>

            {showPasswordChange && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
                <div>
                  <Label htmlFor="currentPassword">Current Password</Label>
                  <div className="relative">
                    <SecureInput
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                      placeholder="Enter current password"
                      sanitize={false}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label htmlFor="newPassword">New Password</Label>
                  <div className="relative">
                    <SecureInput
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Enter new password"
                      sanitize={false}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Password must be at least 8 characters with uppercase, lowercase, number, and special character
                  </p>
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <SecureInput
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Confirm new password"
                      sanitize={false}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handlePasswordChange} disabled={saving}>
                    {saving ? "Updating..." : "Update Password"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowPasswordChange(false)
                      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
                      setShowCurrentPassword(false)
                      setShowNewPassword(false)
                      setShowConfirmPassword(false)
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance Overview
          </CardTitle>
          <CardDescription>Your attendance statistics this year</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceSummary ? (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{attendanceSummary.totalDays}</div>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{Math.round(attendanceSummary.totalHours)}</div>
                <p className="text-xs text-muted-foreground">Total Hours</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{attendanceSummary.thisMonthDays}</div>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{attendanceSummary.averageHours.toFixed(1)}</div>
                <p className="text-xs text-muted-foreground">Avg Hours/Day</p>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Loading attendance summary...</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
