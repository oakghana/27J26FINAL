'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'

interface UserProfile {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string
  role: string
  phone: string
  assigned_location: string
}

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        if (fetchError) {
          console.log('[v0] Fetch error:', fetchError)
          setProfile({
            id: user.id,
            first_name: user.user_metadata?.first_name || '',
            last_name: user.user_metadata?.last_name || '',
            email: user.email || '',
            department: 'N/A',
            role: 'staff',
            phone: '',
            assigned_location: 'N/A',
          })
        } else {
          setProfile(data)
        }
      } catch (err) {
        console.log('[v0] Error:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchProfile()
  }, [router, supabase])

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setUpdating(true)

    try {
      if (!profile) return

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          phone: profile.phone,
        })
        .eq('id', profile.id)

      if (updateError) {
        setError(`Update failed: ${updateError.message}`)
        return
      }

      setSuccess('Profile updated successfully!')
    } catch (err) {
      setError('An error occurred while updating your profile')
      console.log('[v0] Update error:', err)
    } finally {
      setUpdating(false)
    }
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess('')

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters')
      return
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (error) {
        setPasswordError(`Password change failed: ${error.message}`)
        return
      }

      setPasswordSuccess('Password changed successfully!')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError('An error occurred while changing your password')
      console.log('[v0] Password change error:', err)
    }
  }

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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Profile Settings
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Manage your account information
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back
          </Button>
        </div>

        {/* Profile Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Personal Information
          </h2>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {success}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  First Name
                </label>
                <Input
                  value={profile?.first_name || ''}
                  onChange={(e) => setProfile(profile ? { ...profile, first_name: e.target.value } : null)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Last Name
                </label>
                <Input
                  value={profile?.last_name || ''}
                  onChange={(e) => setProfile(profile ? { ...profile, last_name: e.target.value } : null)}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Email
              </label>
              <Input value={profile?.email || ''} disabled />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Phone
              </label>
              <Input
                type="tel"
                value={profile?.phone || ''}
                onChange={(e) => setProfile(profile ? { ...profile, phone: e.target.value } : null)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Department
                </label>
                <Input value={profile?.department || ''} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Role
                </label>
                <Input value={profile?.role || ''} disabled />
              </div>
            </div>

            <Button type="submit" disabled={updating}>
              {updating ? 'Saving...' : 'Save Changes'}
            </Button>
          </form>
        </Card>

        {/* Change Password */}
        <Card className="p-6 mb-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Change Password
          </h2>

          {passwordError && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{passwordError}</AlertDescription>
            </Alert>
          )}

          {passwordSuccess && (
            <Alert className="mb-4 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900">
              <AlertDescription className="text-green-800 dark:text-green-200">
                {passwordSuccess}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                New Password
              </label>
              <Input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                Confirm Password
              </label>
              <Input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm your new password"
                required
              />
            </div>

            <Button type="submit">
              Change Password
            </Button>
          </form>
        </Card>

        {/* Logout */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Session
          </h2>
          <Button onClick={handleLogout} variant="destructive">
            Logout
          </Button>
        </Card>
      </div>
    </div>
  )
}
