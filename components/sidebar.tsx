'use client'

import { useRouter, usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  Home,
  Clock,
  FileText,
  Calendar,
  BarChart3,
  HelpCircle,
  LogOut,
  MapPin,
  QrCode,
  AlertTriangle,
  Settings,
  Users,
  ChevronRight,
} from 'lucide-react'
import { useEffect, useState } from 'react'

export default function Sidebar() {
  const router = useRouter()
  const pathname = usePathname()
  const supabase = createClient()
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [supabase])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (href: string) => pathname === href

  const mainMenuItems = [
    { label: 'Dashboard', icon: Home, href: '/dashboard' },
    { label: 'Attendance', icon: Clock, href: '/attendance/check-in' },
    { label: 'Leave Management', icon: FileText, href: '/leave/management' },
    { label: 'Excuse Duty', icon: FileText, href: '/excuse-duty' },
    { label: 'Schedule', icon: Calendar, href: '/schedule' },
    { label: 'Reports', icon: BarChart3, href: '/reports' },
    { label: 'Help', icon: HelpCircle, href: '/help' },
  ]

  const adminMenuItems = [
    { label: 'Excuse Duty Review', icon: FileText, href: '/admin/excuse-review' },
    { label: 'Locations', icon: MapPin, href: '/admin/locations' },
    { label: 'Staff', icon: Users, href: '/admin/staff' },
    { label: 'QR Events', icon: QrCode, href: '/admin/qr-events' },
    { label: 'Defaulters', icon: AlertTriangle, href: '/admin/defaulters' },
    { label: 'Warnings Archive', icon: AlertTriangle, href: '/admin/warnings' },
  ]

  return (
    <div className="w-48 bg-[#1a1f26] border-r border-[#3d4a5a] flex flex-col h-screen sticky top-0">
      {/* Logo Section */}
      <div className="p-4 border-b border-[#3d4a5a]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00ff00] to-[#00cc00] flex items-center justify-center">
            <span className="text-sm font-bold text-[#1a1f26]">QCC</span>
          </div>
          <div>
            <p className="font-semibold text-[#f5f5f5] text-sm">QCC Attendance</p>
            <p className="text-xs text-[#a0aab5]">Electronic System</p>
          </div>
        </div>
      </div>

      {/* Main Menu */}
      <div className="flex-1 overflow-y-auto py-4 px-2">
        <div className="mb-2">
          <p className="text-xs font-semibold text-[#a0aab5] px-3 mb-3 uppercase">MAIN</p>
          <nav className="space-y-1">
            {mainMenuItems.map((item) => (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive(item.href)
                    ? 'bg-[#00ff00] text-[#1a1f26]'
                    : 'text-[#a0aab5] hover:bg-[#252d36] hover:text-[#f5f5f5]'
                }`}
              >
                <item.icon className="w-4 h-4" />
                <span>{item.label}</span>
                {isActive(item.href) && <ChevronRight className="w-4 h-4 ml-auto" />}
              </button>
            ))}
          </nav>
        </div>

        {/* Admin Menu */}
        {user?.user_metadata?.role === 'admin' && (
          <div className="mt-6 pt-4 border-t border-[#3d4a5a]">
            <div className="flex items-center justify-between px-3 mb-3">
              <p className="text-xs font-semibold text-[#a0aab5] uppercase">ADMINISTRATION</p>
              <span className="text-xs font-bold bg-[#00ff00] text-[#1a1f26] px-2 py-0.5 rounded">Admin</span>
            </div>
            <nav className="space-y-1">
              {adminMenuItems.map((item) => (
                <button
                  key={item.href}
                  onClick={() => router.push(item.href)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    isActive(item.href)
                      ? 'bg-[#00ff00] text-[#1a1f26]'
                      : 'text-[#a0aab5] hover:bg-[#252d36] hover:text-[#f5f5f5]'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.label}</span>
                  {isActive(item.href) && <ChevronRight className="w-4 h-4 ml-auto" />}
                </button>
              ))}
            </nav>
          </div>
        )}
      </div>

      {/* User Profile Section */}
      <div className="p-3 border-t border-[#3d4a5a] space-y-3">
        {user && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div className="w-8 h-8 rounded-full bg-[#00ff00] text-[#1a1f26] flex items-center justify-center text-sm font-bold">
              {user.email?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#f5f5f5] truncate">
                {user.user_metadata?.first_name || user.email?.split('@')[0]}
              </p>
              <p className="text-xs text-[#a0aab5] truncate">{user.user_metadata?.role || 'Staff'}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-[#a0aab5] hover:text-[#f5f5f5] hover:bg-[#252d36] rounded-lg transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  )
}
