'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import Sidebar from '@/components/sidebar'
import { MapPin, Edit2, Trash2, QrCode, Plus, X } from 'lucide-react'

export default function LocationManagementPage() {
  const router = useRouter()
  const supabase = createClient()
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    radius: '50',
    checkinStart: '07:00',
    checkoutEnd: '17:00',
    description: ''
  })

  useEffect(() => {
    loadLocations()
  }, [])

  const loadLocations = async () => {
    try {
      const { data } = await supabase
        .from('geofence_locations')
        .select('*')
        .order('name')
      
      if (data) setLocations(data)
    } catch (error) {
      console.log('[v0] Error loading locations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddLocation = async () => {
    try {
      const { error } = await supabase
        .from('geofence_locations')
        .insert([{
          name: formData.name,
          address: formData.address,
          latitude: parseFloat(formData.latitude),
          longitude: parseFloat(formData.longitude),
          radius: parseInt(formData.radius),
          check_in_start: formData.checkinStart,
          check_out_end: formData.checkoutEnd,
          description: formData.description,
          is_active: true
        }])

      if (!error) {
        setShowModal(false)
        setFormData({
          name: '',
          address: '',
          latitude: '',
          longitude: '',
          radius: '50',
          checkinStart: '07:00',
          checkoutEnd: '17:00',
          description: ''
        })
        loadLocations()
      }
    } catch (error) {
      console.log('[v0] Error adding location:', error)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#1a1f26]">
      <Sidebar />

      <main className="flex-1 overflow-auto">
        {/* Top Bar */}
        <div className="sticky top-0 bg-[#252d36] border-b border-[#3d4a5a] px-8 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-2xl font-bold text-[#00ff00]">Location Management</h1>
            <p className="text-sm text-[#a0aab5]">Manage geofence locations and QR codes • Online</p>
          </div>
          <Button 
            onClick={() => setShowModal(true)}
            className="bg-[#00ff00] hover:bg-[#00e600] text-[#1a1f26] font-semibold"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Location
          </Button>
        </div>

        {/* Content */}
        <div className="p-8">
          {loading ? (
            <p className="text-[#a0aab5]">Loading locations...</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {locations.map((location) => (
                <Card key={location.id} className="bg-[#252d36] border-[#3d4a5a] p-6 hover:border-[#00ff00]/50 transition">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-bold text-[#f5f5f5]">{location.name}</h3>
                      <p className="text-sm text-[#a0aab5]">{location.address}</p>
                    </div>
                    <span className={`px-2 py-1 text-xs font-bold rounded ${location.is_active ? 'bg-[#00ff00]/20 text-[#00ff00]' : 'bg-[#ff6b6b]/20 text-[#ff6b6b]'}`}>
                      {location.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#a0aab5]">Lat:</span>
                      <span className="text-[#f5f5f5]">{location.latitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a0aab5]">Lng:</span>
                      <span className="text-[#f5f5f5]">{location.longitude}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#a0aab5]">Radius:</span>
                      <span className="text-[#f5f5f5]">{location.radius}m</span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 border-[#3d4a5a] text-[#a0aab5] bg-transparent">
                      <QrCode className="w-4 h-4 mr-2" />
                      QR Code
                    </Button>
                    <Button variant="outline" size="sm" className="border-[#3d4a5a] text-[#a0aab5] bg-transparent">
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="border-[#3d4a5a] text-red-400 bg-transparent">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="bg-[#252d36] border-[#3d4a5a] w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-[#f5f5f5]">Add New Location</h2>
                  <button onClick={() => setShowModal(false)} className="text-[#a0aab5] hover:text-[#f5f5f5]">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <p className="text-sm text-[#a0aab5] mb-6">Create a new geofence location for attendance tracking</p>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Location Name *</label>
                    <Input
                      placeholder="e.g., Main Campus"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Address *</label>
                    <Input
                      placeholder="Full address"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Latitude *</label>
                      <Input
                        placeholder="25.2854"
                        value={formData.latitude}
                        onChange={(e) => setFormData({...formData, latitude: e.target.value})}
                        className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Longitude *</label>
                      <Input
                        placeholder="51.5310"
                        value={formData.longitude}
                        onChange={(e) => setFormData({...formData, longitude: e.target.value})}
                        className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-[#f5f5f5] mb-2">Radius (meters) *</label>
                    <Input
                      placeholder="50"
                      value={formData.radius}
                      onChange={(e) => setFormData({...formData, radius: e.target.value})}
                      className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                    />
                    <p className="text-xs text-[#a0aab5] mt-1">Recommended: 50m for standard attendance tracking, 10-30m for specific rooms</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-[#f5f5f5] mb-3">Working Hours Configuration</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-[#a0aab5] mb-2">Check-in Start Time</label>
                        <Input
                          type="time"
                          value={formData.checkinStart}
                          onChange={(e) => setFormData({...formData, checkinStart: e.target.value})}
                          className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[#a0aab5] mb-2">Check-out End Time</label>
                        <Input
                          type="time"
                          value={formData.checkoutEnd}
                          onChange={(e) => setFormData({...formData, checkoutEnd: e.target.value})}
                          className="bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5]"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button onClick={handleAddLocation} className="flex-1 bg-[#00ff00] hover:bg-[#00e600] text-[#1a1f26] font-semibold">
                      Add Location
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
