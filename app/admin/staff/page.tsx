'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Sidebar from '@/components/sidebar'
import { Users, Plus, Search, X, MapPin } from 'lucide-react'

export default function StaffManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [staff, setStaff] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedLocation, setSelectedLocation] = useState('')
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    staffNumber: '',
    department: '',
    locationId: ''
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const { data: staffData } = await supabase
        .from('profiles')
        .select('*')
        .order('first_name')
      
      const { data: locationsData } = await supabase
        .from('geofence_locations')
        .select('*')
        .eq('is_active', true)
      
      if (staffData) setStaff(staffData)
      if (locationsData) setLocations(locationsData)
    } catch (error) {
      console.log('[v0] Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddStaff = async () => {
    if (!formData.locationId) {
      alert('Please select a location')
      return
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .insert([{
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone: formData.phone,
          staff_number: formData.staffNumber,
          department: formData.department,
          geofence_location_id: formData.locationId,
          role: 'staff'
        }])

      if (!error) {
        setShowModal(false)
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          staffNumber: '',
          department: '',
          locationId: ''
        })
        loadData()
      }
    } catch (error) {
      console.log('[v0] Error adding staff:', error)
    }
  }

  const filteredStaff = staff.filter(s =>
    s.first_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.last_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="flex min-h-screen bg-[#1a1f26]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 bg-[#252d36] border-b border-[#3d4a5a] px-8 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-2xl font-bold text-[#00ff00]">Staff Management</h1>
            <p className="text-sm text-[#a0aab5]">Manage QCC staff members, roles and permissions</p>
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-[#00ff00] hover:bg-[#00e600] text-[#1a1f26] font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Staff
          </Button>
        </div>

        {/* Content */}
        <div className="p-8">
          {/* Search Bar */}
          <div className="mb-6 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-[#a0aab5]" />
              <Input
                placeholder="Search by name, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-[#252d36] border-[#3d4a5a] text-[#f5f5f5]"
              />
            </div>
          </div>

          {/* Staff Table */}
          {loading ? (
            <p className="text-[#a0aab5]">Loading staff...</p>
          ) : (
            <Card className="bg-[#252d36] border-[#3d4a5a] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#3d4a5a]">
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#a0aab5]">Name</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#a0aab5]">Staff Number</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#a0aab5]">Email</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#a0aab5]">Department</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#a0aab5]">Assigned Location</th>
                      <th className="text-left px-6 py-4 text-sm font-semibold text-[#a0aab5]">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStaff.map((member) => (
                      <tr key={member.id} className="border-b border-[#3d4a5a] hover:bg-[#2a3340] transition">
                        <td className="px-6 py-4 text-[#f5f5f5] font-medium">{member.first_name} {member.last_name}</td>
                        <td className="px-6 py-4 text-[#a0aab5]">{member.staff_number || 'N/A'}</td>
                        <td className="px-6 py-4 text-[#a0aab5]">{member.email}</td>
                        <td className="px-6 py-4 text-[#a0aab5]">{member.department}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-1 text-[#a0aab5]">
                            <MapPin className="w-4 h-4" />
                            {locations.find(l => l.id === member.geofence_location_id)?.name || 'Not assigned'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 text-xs font-bold rounded bg-[#00ff00]/20 text-[#00ff00]">
                            Active
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </div>

        {/* Add Staff Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#252d36] border-[#3d4a5a] w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#f5f5f5]">Add New Staff Member</h2>
                  <button onClick={() => setShowModal(false)} className="text-[#a0aab5] hover:text-[#f5f5f5]">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">First Name *</label>
                      <Input
                        placeholder="First name"
                        value={formData.firstName}
                        onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                        className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Last Name *</label>
                      <Input
                        placeholder="Last name"
                        value={formData.lastName}
                        onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                        className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Email *</label>
                    <Input
                      type="email"
                      placeholder="user@qccgh.com"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Staff Number</label>
                    <Input
                      placeholder="e.g., 1234567"
                      value={formData.staffNumber}
                      onChange={(e) => setFormData({...formData, staffNumber: e.target.value})}
                      className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Department</label>
                    <Input
                      placeholder="e.g., IT, HR"
                      value={formData.department}
                      onChange={(e) => setFormData({...formData, department: e.target.value})}
                      className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Assigned Location * <span className="text-[#ff9800] text-xs">(Required)</span></label>
                    <select
                      value={formData.locationId}
                      onChange={(e) => setFormData({...formData, locationId: e.target.value})}
                      className="w-full bg-[#3d4a5a] border border-[#4a5868] text-[#f5f5f5] rounded px-3 py-2"
                    >
                      <option value="">Select Location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.id}>{loc.name}</option>
                      ))}
                    </select>
                    <p className="text-xs text-[#a0aab5] mt-1">Each staff member must be assigned to their actual work location for accurate attendance tracking</p>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleAddStaff} className="flex-1 bg-[#00ff00] hover:bg-[#00e600] text-[#1a1f26] font-semibold">
                      Add Staff
                    </Button>
                    <Button onClick={() => setShowModal(false)} variant="outline" className="flex-1 border-[#3d4a5a] text-[#a0aab5]">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}
