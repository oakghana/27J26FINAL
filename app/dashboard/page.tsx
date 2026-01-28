'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string
  role: string
}

export default function Dashboard() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [attendance, setAttendance] = useState<any>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        // Fetch user profile from database
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (error) {
          console.log('[v0] Profile fetch error:', error)
          // User exists but profile might not be created yet
          setUser({
            id: authUser.id,
            first_name: authUser.user_metadata?.first_name || 'User',
            last_name: authUser.user_metadata?.last_name || '',
            email: authUser.email || '',
            department: 'N/A',
            role: 'staff'
          })
        } else {
          setUser(profileData)
        }

        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0]
        const { data: attendanceData } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', authUser.id)
          .gte('created_at', today + 'T00:00:00')
          .order('created_at', { ascending: false })
          .limit(1)

        if (attendanceData && attendanceData.length > 0) {
          setAttendance(attendanceData[0])
        }
      } catch (err) {
        console.log('[v0] Fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [router, supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Welcome, {user?.first_name} {user?.last_name}
            </p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* User Info Card */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Profile Information
            </h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-500 dark:text-slate-400">Email</p>
                <p className="text-slate-900 dark:text-white font-medium">{user?.email}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Department</p>
                <p className="text-slate-900 dark:text-white font-medium">{user?.department}</p>
              </div>
              <div>
                <p className="text-slate-500 dark:text-slate-400">Role</p>
                <p className="text-slate-900 dark:text-white font-medium capitalize">{user?.role}</p>
              </div>
            </div>
          </Card>

          {/* Attendance Status */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Today's Attendance
            </h2>
            {attendance ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-slate-500 dark:text-slate-400">Check-in Time</p>
                  <p className="text-slate-900 dark:text-white font-medium">
                    {new Date(attendance.check_in_time).toLocaleTimeString()}
                  </p>
                </div>
                <div className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 px-3 py-2 rounded text-sm">
                  ✓ Checked In
                </div>
              </div>
            ) : (
              <div className="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded text-sm">
                Not checked in yet
              </div>
            )}
          </Card>

          {/* Quick Actions */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Quick Actions
            </h2>
            <div className="space-y-2">
              <Button 
                onClick={() => router.push('/attendance/check-in')}
                className="w-full" 
                variant="outline"
              >
                Check In/Out
              </Button>
              <Button 
                onClick={() => router.push('/leave/management')}
                className="w-full" 
                variant="outline"
              >
                Request Leave
              </Button>
              <Button 
                onClick={() => router.push('/profile')}
                className="w-full" 
                variant="outline"
              >
                My Profile
              </Button>
              {user?.role === 'admin' || user?.role === 'department_head' ? (
                <Button 
                  onClick={() => router.push('/admin/dashboard')}
                  className="w-full" 
                  variant="outline"
                >
                  Admin Panel
                </Button>
              ) : null}
            </div>
          </Card>
        </div>

        {/* Additional Sections */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Leave Balance */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Leave Balance
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">Annual Leave</span>
                  <span className="font-semibold text-slate-900 dark:text-white">21 days</span>
                </div>
                <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-blue-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-slate-600 dark:text-slate-400">Sick Leave</span>
                  <span className="font-semibold text-slate-900 dark:text-white">14 days</span>
                </div>
                <div className="bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                  <div className="bg-green-500 h-2 rounded-full" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Recent Notifications
            </h2>
            <div className="space-y-3 text-sm">
              <div className="flex gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <span className="text-blue-600 dark:text-blue-400">ℹ</span>
                <p className="text-slate-700 dark:text-slate-300">System is running normally</p>
              </div>
              <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded">
                <span className="text-slate-500 dark:text-slate-400">●</span>
                <p className="text-slate-700 dark:text-slate-300">No pending approvals</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
