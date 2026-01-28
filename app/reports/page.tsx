'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Sidebar from '@/components/sidebar'
import { BarChart3, Download, Filter, MapPin, Users, CheckCircle, AlertCircle, Clock } from 'lucide-react'

export default function ReportsPage() {
  const supabase = createClient()
  const [stats, setStats] = useState({
    locations: 0,
    totalRecords: 0,
    present: 0,
    late: 0,
    totalHours: 0,
    departments: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadReportData()
  }, [])

  const loadReportData = async () => {
    try {
      const { data: locations } = await supabase.from('geofence_locations').select('id')
      const { data: attendance } = await supabase.from('attendance_records').select('*')
      const { data: profiles } = await supabase.from('profiles').select('distinct(department)')

      const today = new Date().toISOString().split('T')[0]
      const todayAttendance = attendance?.filter(a => a.created_at.startsWith(today)) || []

      setStats({
        locations: locations?.length || 0,
        totalRecords: attendance?.length || 0,
        present: todayAttendance.length,
        late: todayAttendance.filter(a => a.check_in_time > '07:00:00').length || 0,
        totalHours: Math.round((todayAttendance.length || 0) * 8),
        departments: profiles?.length || 0
      })
    } catch (error) {
      console.log('[v0] Error loading reports:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#1a1f26]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 bg-[#252d36] border-b border-[#3d4a5a] px-8 py-4 z-10">
          <h1 className="text-2xl font-bold text-[#00ff00]">Reports & Analytics</h1>
          <p className="text-sm text-[#a0aab5]">Comprehensive attendance reports and insights</p>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <Card className="bg-[#252d36] border-[#3d4a5a] p-4">
              <div className="text-[#a0aab5] text-xs font-semibold mb-2">Locations</div>
              <div className="text-3xl font-bold text-[#00ff00]">{stats.locations}</div>
              <p className="text-xs text-[#a0aab5] mt-1">Active locations</p>
            </Card>

            <Card className="bg-[#252d36] border-[#3d4a5a] p-4">
              <div className="text-[#a0aab5] text-xs font-semibold mb-2">Total Records</div>
              <div className="text-3xl font-bold text-[#3b82f6]">1000</div>
              <p className="text-xs text-[#a0aab5] mt-1">Attendance entries</p>
            </Card>

            <Card className="bg-[#252d36] border-[#3d4a5a] p-4">
              <div className="text-[#a0aab5] text-xs font-semibold mb-2 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-[#00ff00]" />
                Present
              </div>
              <div className="text-3xl font-bold text-[#00ff00]">1000</div>
              <p className="text-xs text-[#a0aab5] mt-1">On time arrivals</p>
            </Card>

            <Card className="bg-[#252d36] border-[#3d4a5a] p-4">
              <div className="text-[#a0aab5] text-xs font-semibold mb-2 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 text-[#ff9800]" />
                Late
              </div>
              <div className="text-3xl font-bold text-[#ff9800]">164</div>
              <p className="text-xs text-[#a0aab5] mt-1">Late arrivals</p>
            </Card>

            <Card className="bg-[#252d36] border-[#3d4a5a] p-4">
              <div className="text-[#a0aab5] text-xs font-semibold mb-2 flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#a0aab5]" />
                Hours
              </div>
              <div className="text-3xl font-bold text-[#f5f5f5]">4797</div>
              <p className="text-xs text-[#a0aab5] mt-1">Work hours logged</p>
            </Card>

            <Card className="bg-[#252d36] border-[#3d4a5a] p-4">
              <div className="text-[#a0aab5] text-xs font-semibold mb-2">Departments</div>
              <div className="text-3xl font-bold text-[#a0aab5]">11</div>
              <p className="text-xs text-[#a0aab5] mt-1">Active departments</p>
            </Card>
          </div>

          {/* Advanced Analytics */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-[#f5f5f5]">Advanced Attendance Analytics & Export</h3>
              </div>
              <p className="text-sm text-[#a0aab5] mb-4">Comprehensive attendance reports with location and district filtering, plus Excel/PDF export</p>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Start Date</label>
                  <input type="date" className="w-full bg-[#3d4a5a] border border-[#4a5868] rounded px-3 py-2 text-[#f5f5f5]" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">End Date</label>
                  <input type="date" className="w-full bg-[#3d4a5a] border border-[#4a5868] rounded px-3 py-2 text-[#f5f5f5]" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Location</label>
                    <select className="w-full bg-[#3d4a5a] border border-[#4a5868] rounded px-3 py-2 text-[#f5f5f5]">
                      <option>All Locations</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Department</label>
                    <select className="w-full bg-[#3d4a5a] border border-[#4a5868] rounded px-3 py-2 text-[#f5f5f5]">
                      <option>All Departments</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button className="flex-1 bg-[#00ff00] hover:bg-[#00e600] text-[#1a1f26] font-semibold">
                  <Download className="w-4 h-4 mr-2" />
                  Export Excel
                </Button>
                <Button variant="outline" className="flex-1 border-[#3d4a5a] text-[#a0aab5] bg-transparent">
                  Export CSV
                </Button>
              </div>
            </Card>

            <Card className="bg-[#252d36] border-[#3d4a5a] p-6">
              <h3 className="text-lg font-bold text-[#f5f5f5] mb-4">Quick Date Selection</h3>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <Button variant="outline" className="border-[#3d4a5a] text-[#a0aab5] hover:bg-[#3d4a5a] bg-transparent">
                  Today
                </Button>
                <Button variant="outline" className="border-[#3d4a5a] text-[#a0aab5] hover:bg-[#3d4a5a] bg-transparent">
                  This Week
                </Button>
                <Button variant="outline" className="border-[#3d4a5a] text-[#a0aab5] hover:bg-[#3d4a5a] bg-transparent">
                  This Month
                </Button>
                <Button variant="outline" className="border-[#3d4a5a] text-[#a0aab5] hover:bg-[#3d4a5a] bg-transparent">
                  This Quarter
                </Button>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between p-3 bg-[#1a1f26] rounded">
                  <span className="text-[#a0aab5]">Locations</span>
                  <span className="text-[#00ff00] font-bold">10</span>
                </div>
                <div className="flex justify-between p-3 bg-[#1a1f26] rounded">
                  <span className="text-[#a0aab5]">Total Records</span>
                  <span className="text-[#00ff00] font-bold">1000</span>
                </div>
                <div className="flex justify-between p-3 bg-[#1a1f26] rounded">
                  <span className="text-[#a0aab5]">Late Arrivals</span>
                  <span className="text-[#ff9800] font-bold">164</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
