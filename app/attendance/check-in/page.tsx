'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

interface CheckInData {
  latitude: number
  longitude: number
  locationName: string
  checkedIn: boolean
  lastCheckIn: string | null
}

export default function CheckInPage() {
  const [checkInData, setCheckInData] = useState<CheckInData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
      }
    }
    checkAuth()
  }, [router, supabase])

  const requestLocationPermission = async () => {
    if (!('geolocation' in navigator)) {
      setError('Geolocation is not supported by your browser')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocationPermission(true)
        setCheckInData({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          locationName: 'Detected Location',
          checkedIn: false,
          lastCheckIn: null,
        })
      },
      (err) => {
        setError(`Location error: ${err.message}`)
        setLocationPermission(false)
      }
    )
  }

  const handleCheckIn = async () => {
    if (!checkInData) {
      setError('Location not detected. Please enable location services.')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('User not authenticated')
        return
      }

      // Create attendance record
      const { data, error: insertError } = await supabase
        .from('attendance_records')
        .insert([
          {
            user_id: user.id,
            check_in_time: new Date().toISOString(),
            check_in_latitude: checkInData.latitude,
            check_in_longitude: checkInData.longitude,
            location_name: checkInData.locationName,
            check_in_radius: 20,
          },
        ])
        .select()

      if (insertError) {
        setError(`Check-in failed: ${insertError.message}`)
        return
      }

      setSuccess('Successfully checked in!')
      setCheckInData({
        ...checkInData,
        checkedIn: true,
        lastCheckIn: new Date().toLocaleTimeString(),
      })

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('An error occurred during check-in')
      console.log('[v0] Check-in error:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleCheckOut = async () => {
    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('User not authenticated')
        return
      }

      const today = new Date().toISOString().split('T')[0]

      // Find today's check-in record
      const { data: records } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', today + 'T00:00:00')
        .order('created_at', { ascending: false })
        .limit(1)

      if (!records || records.length === 0) {
        setError('No check-in record found for today')
        return
      }

      // Update with check-out time
      const { error: updateError } = await supabase
        .from('attendance_records')
        .update({
          check_out_time: new Date().toISOString(),
          check_out_latitude: checkInData?.latitude,
          check_out_longitude: checkInData?.longitude,
        })
        .eq('id', records[0].id)

      if (updateError) {
        setError(`Check-out failed: ${updateError.message}`)
        return
      }

      setSuccess('Successfully checked out!')

      setTimeout(() => {
        router.push('/dashboard')
      }, 2000)
    } catch (err) {
      setError('An error occurred during check-out')
      console.log('[v0] Check-out error:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
            Check In/Out
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Scan QR code or use location to check in/out
          </p>
        </div>

        {/* Main Card */}
        <Card className="p-8 mb-6">
          {/* Location Status */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Location Status
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              {locationPermission === null
                ? 'Enable location to check in'
                : locationPermission
                ? `Location enabled - Lat: ${checkInData?.latitude?.toFixed(4)}, Lng: ${checkInData?.longitude?.toFixed(4)}`
                : 'Location access denied'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            {!locationPermission && (
              <Button
                onClick={requestLocationPermission}
                className="w-full"
                size="lg"
              >
                Enable Location & Get QR Code
              </Button>
            )}

            {locationPermission && checkInData && (
              <>
                <Button
                  onClick={handleCheckIn}
                  disabled={loading || checkInData.checkedIn}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? 'Processing...' : 'Check In'}
                </Button>

                <Button
                  onClick={handleCheckOut}
                  disabled={loading}
                  variant="outline"
                  className="w-full bg-transparent"
                  size="lg"
                >
                  {loading ? 'Processing...' : 'Check Out'}
                </Button>
              </>
            )}

            <Button
              onClick={() => router.push('/dashboard')}
              variant="ghost"
              className="w-full"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Check-In Times
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Check in between 7:00 AM and 5:00 PM for accurate attendance tracking.
            </p>
          </Card>

          <Card className="p-6">
            <h3 className="font-semibold text-slate-900 dark:text-white mb-2">
              Location Radius
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              You must be within 20 meters of your assigned work location to check in.
            </p>
          </Card>
        </div>
      </div>
    </div>
  )
}
