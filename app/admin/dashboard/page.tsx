'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Spinner } from '@/components/ui/spinner'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

interface StaffMember {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string
  role: string
}

interface AttendanceData {
  id: string
  user_id: string
  check_in_time: string
  check_out_time: string | null
  location_name: string
}

export default function AdminDashboard() {
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [attendanceData, setAttendanceData] = useState<AttendanceData[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string>('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const { data: { user: authUser } } = await supabase.auth.getUser()

        if (!authUser) {
          router.push('/auth/login')
          return
        }

        // Check user role
        const { data: profileData } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single()

        if (profileData?.role !== 'admin' && profileData?.role !== 'department_head') {
          router.push('/dashboard')
          return
        }

        setUserRole(profileData?.role || '')

        // Fetch staff members
        const { data: staffData } = await supabase
          .from('profiles')
          .select('*')
          .limit(20)

        setStaffMembers(staffData || [])

        // Fetch today's attendance
        const today = new Date().toISOString().split('T')[0]
        const { data: attData } = await supabase
          .from('attendance_records')
          .select('*')
          .gte('created_at', today + 'T00:00:00')
          .order('created_at', { ascending: false })
          .limit(50)

        setAttendanceData(attData || [])
      } catch (err) {
        console.log('[v0] Admin fetch error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchAdminData()
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Admin Dashboard
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2 capitalize">
              Role: {userRole}
            </p>
          </div>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </div>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Total Staff</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{staffMembers.length}</p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Checked In Today</p>
            <p className="text-3xl font-bold text-green-600 dark:text-green-400">
              {attendanceData.filter(a => a.check_in_time && new Date(a.check_in_time).toDateString() === new Date().toDateString()).length}
            </p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">On Leave</p>
            <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">0</p>
          </Card>
          <Card className="p-6">
            <p className="text-slate-600 dark:text-slate-400 text-sm">Warnings Issued</p>
            <p className="text-3xl font-bold text-red-600 dark:text-red-400">0</p>
          </Card>
        </div>

        {/* Staff Table */}
        <Card className="mb-8">
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Staff Members
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staffMembers.slice(0, 10).map((staff) => (
                    <TableRow key={staff.id}>
                      <TableCell className="font-medium">
                        {staff.first_name} {staff.last_name}
                      </TableCell>
                      <TableCell>{staff.email}</TableCell>
                      <TableCell>{staff.department}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full bg-blue-100 dark:bg-blue-900/30 px-3 py-1 text-sm font-medium text-blue-800 dark:text-blue-200 capitalize">
                          {staff.role}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>

        {/* Attendance Log */}
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-4">
              Today's Attendance Log
            </h2>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User ID</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Check-In/Out</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendanceData.slice(0, 10).map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>
                        {new Date(record.check_in_time).toLocaleTimeString()}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {record.user_id.substring(0, 8)}...
                      </TableCell>
                      <TableCell>{record.location_name || 'N/A'}</TableCell>
                      <TableCell>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          record.check_out_time
                            ? 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200'
                            : 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
                        }`}>
                          {record.check_out_time ? 'Checked Out' : 'Checked In'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
