'use client'

import React from "react"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Spinner } from '@/components/ui/spinner'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

interface LeaveRequest {
  id: string
  user_id: string
  leave_type: string
  start_date: string
  end_date: string
  reason: string
  status: string
  created_at: string
}

export default function LeaveManagementPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [formData, setFormData] = useState({
    leaveType: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  })
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const fetchLeaveRequests = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          router.push('/auth/login')
          return
        }

        const { data, error: fetchError } = await supabase
          .from('leave_requests')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })

        if (fetchError) {
          console.log('[v0] Fetch error:', fetchError)
        } else {
          setLeaveRequests(data || [])
        }
      } catch (err) {
        console.log('[v0] Error fetching leave requests:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLeaveRequests()
  }, [router, supabase])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSubmitting(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        setError('User not authenticated')
        return
      }

      if (!formData.startDate || !formData.endDate) {
        setError('Please fill in all required fields')
        return
      }

      const { data, error: insertError } = await supabase
        .from('leave_requests')
        .insert([
          {
            user_id: user.id,
            leave_type: formData.leaveType,
            start_date: formData.startDate,
            end_date: formData.endDate,
            reason: formData.reason,
            status: 'pending',
          },
        ])
        .select()

      if (insertError) {
        setError(`Failed to submit leave request: ${insertError.message}`)
        return
      }

      setSuccess('Leave request submitted successfully!')
      setFormData({ leaveType: 'annual', startDate: '', endDate: '', reason: '' })
      setShowForm(false)

      // Refresh the list
      const { data: updatedData } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setLeaveRequests(updatedData || [])
    } catch (err) {
      setError('An error occurred while submitting the leave request')
      console.log('[v0] Submit error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200'
      case 'rejected':
        return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200'
      case 'pending':
        return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200'
      default:
        return 'bg-slate-100 dark:bg-slate-900/30 text-slate-800 dark:text-slate-200'
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-slate-950 dark:to-slate-900 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Leave Management
            </h1>
            <p className="text-slate-600 dark:text-slate-400 mt-2">
              Request and track your leave
            </p>
          </div>
          <Button onClick={() => router.push('/dashboard')} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {/* Alerts */}
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

        {/* New Request Form */}
        {showForm && (
          <Card className="p-6 mb-8">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
              Submit Leave Request
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Leave Type
                  </label>
                  <Select value={formData.leaveType} onValueChange={(value) => setFormData({ ...formData, leaveType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="personal">Personal Leave</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Start Date
                  </label>
                  <Input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                    End Date
                  </label>
                  <Input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
                  Reason (Optional)
                </label>
                <Textarea
                  placeholder="Provide a reason for your leave request"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="flex gap-3">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </Button>
                <Button type="button" onClick={() => setShowForm(false)} variant="outline">
                  Cancel
                </Button>
              </div>
            </form>
          </Card>
        )}

        {!showForm && (
          <Button onClick={() => setShowForm(true)} className="mb-8">
            Request Leave
          </Button>
        )}

        {/* Leave Requests List */}
        <Card className="p-6">
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white mb-4">
            Your Leave Requests
          </h2>

          {leaveRequests.length === 0 ? (
            <p className="text-slate-600 dark:text-slate-400 text-center py-8">
              No leave requests yet
            </p>
          ) : (
            <div className="space-y-3">
              {leaveRequests.map((request) => (
                <div key={request.id} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-white capitalize">
                        {request.leave_type} Leave
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400">
                        {new Date(request.start_date).toLocaleDateString()} to{' '}
                        {new Date(request.end_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-medium capitalize ${getStatusColor(request.status)}`}>
                      {request.status}
                    </span>
                  </div>
                  {request.reason && (
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">
                      Reason: {request.reason}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
