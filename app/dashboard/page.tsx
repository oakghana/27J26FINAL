'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/sidebar'
import { MapPin, AlertCircle, TrendingUp, Users, Clock } from 'lucide-react'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [attendanceData, setAttendanceData] = useState<any>(null)
  const [stats, setStats] = useState({
    attendanceStatus: 'Not Checked In',
    daysAttended: 15,
    department: 'Loading...',
  })

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser()
        if (!currentUser) {
          router.push('/auth/login')
          return
        }
        setUser(currentUser)

        // Fetch user profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', currentUser.id)
          .single()

        if (profile) {
          setStats((prev) => ({
            ...prev,
            department: profile.department || 'Not assigned',
          }))
        }

        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0]
        const { data: attendance } = await supabase
          .from('attendance_records')
          .select('*')
          .eq('user_id', currentUser.id)
          .gte('created_at', today + 'T00:00:00')
          .order('created_at', { ascending: false })
          .limit(1)

        if (attendance && attendance.length > 0) {
          const record = attendance[0]
          setAttendanceData(record)
          setStats((prev) => ({
            ...prev,
            attendanceStatus: record.check_out_time ? 'Checked Out' : 'Checked In',
          }))
        }
      } catch (error) {
        console.log('[v0] Error loading user data:', error)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase, router])

  if (loading) {
    return (
      <div className="flex h-screen bg-[#1a1f26]">
        <Sidebar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[#a0aab5]">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-[#1a1f26]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 bg-[#252d36] border-b border-[#3d4a5a] px-8 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-2xl font-bold text-[#00ff00]">Dashboard</h1>
            <p className="text-sm text-[#a0aab5]">Welcome back, {user?.user_metadata?.first_name || 'User'}</p>
          </div>
          <button className="text-[#a0aab5] hover:text-[#f5f5f5]">⊙</button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* GPS Location Alert */}
          <div className="mb-6 p-4 bg-[#ff9800]/10 border border-[#ff9800]/50 rounded-lg flex gap-3 items-start">
            <AlertCircle className="h-5 w-5 text-[#ff9800] flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-[#ff9800] text-sm">GPS Location Required</p>
              <p className="text-xs text-[#a0aab5] mt-1">Your GPS location is not available. Please update your location to enable check-in/check-out.</p>
            </div>
            <Button className="bg-[#ff9800] hover:bg-[#e68900] text-[#1a1f26] font-semibold text-xs h-8 px-4">
              Update GPS Location
            </Button>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            {/* Today's Status */}
            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#a0aab5] text-xs font-semibold uppercase mb-1">TODAY'S STATUS</p>
                </div>
                <Clock className="w-6 h-6 text-[#a0aab5]" />
              </div>
              <p className="text-3xl font-bold text-[#f5f5f5] mb-2">{stats.attendanceStatus}</p>
              <p className="text-xs text-[#a0aab5]">Click to check in</p>
            </Card>

            {/* This Month */}
            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#a0aab5] text-xs font-semibold uppercase mb-1">THIS MONTH</p>
                </div>
                <TrendingUp className="w-6 h-6 text-[#a0aab5]" />
              </div>
              <p className="text-3xl font-bold text-[#00ff00] mb-2">{stats.daysAttended}</p>
              <p className="text-xs text-[#a0aab5]">Days attended</p>
              <p className="text-xs text-[#00ff00] mt-2">↑ 5% from last month</p>
            </Card>

            {/* Department */}
            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-[#a0aab5] text-xs font-semibold uppercase mb-1">DEPARTMENT</p>
                </div>
                <Users className="w-6 h-6 text-[#a0aab5]" />
              </div>
              <p className="text-xl font-bold text-[#f5f5f5] mb-2">{stats.department}</p>
              <p className="text-xs text-[#a0aab5]">{stats.department}</p>
            </Card>
          </div>

          {/* Main Sections */}
          <div className="grid grid-cols-2 gap-6">
            {/* Quick Actions */}
            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#00ff00]/20 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#00ff00]" />
                </div>
                <h3 className="text-lg font-bold text-[#f5f5f5]">Quick Actions</h3>
              </div>
              <p className="text-sm text-[#a0aab5] mb-4">Common tasks and shortcuts for daily operations</p>
              <div className="space-y-2">
                <Button 
                  onClick={() => router.push('/attendance/check-in')}
                  className="w-full bg-[#3d4a5a] hover:bg-[#4a5868] text-[#f5f5f5] font-medium h-10 justify-start"
                >
                  <Clock className="w-4 h-4 mr-2" />
                  Record your daily attendance with location verification
                </Button>
                <Button 
                  onClick={() => router.push('/leave/management')}
                  className="w-full bg-[#3d4a5a] hover:bg-[#4a5868] text-[#f5f5f5] font-medium h-10 justify-start"
                >
                  <MapPin className="w-4 h-4 mr-2" />
                  Quick attendance for events and special activities
                </Button>
              </div>
            </Card>

            {/* Recent Activity */}
            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-[#00ff00]/20 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#00ff00]" />
                </div>
                <h3 className="text-lg font-bold text-[#f5f5f5]">Recent Activity</h3>
              </div>
              <p className="text-sm text-[#a0aab5] mb-4">Your latest attendance records</p>
              <div className="flex items-center justify-center h-24">
                <div className="text-center">
                  <Clock className="w-12 h-12 text-[#a0aab5] opacity-50 mx-auto mb-2" />
                  <p className="text-[#a0aab5] text-sm">No attendance recorded today</p>
                </div>
              </div>
              <p className="text-xs text-[#a0aab5] text-center mt-2">Use the quick actions to check in</p>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
