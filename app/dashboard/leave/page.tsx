"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Calendar, Clock, User, CheckCircle, XCircle, Plus, CalendarDays, AlertCircle } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useToast } from "@/hooks/use-toast"
import type { UserProfile } from "@/types/user"

interface LeaveRequest {
  id: string
  user_id: string
  start_date: string
  end_date: string
  reason?: string
  status: 'pending' | 'approved' | 'rejected'
  approved_by?: string
  approved_at?: string
  created_at: string
  user_profiles?: {
    first_name: string
    last_name: string
    email: string
    role: string
    departments?: {
      name: string
    }
  }
}

export default function LeaveManagementPage() {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    start_date: '',
    end_date: '',
    reason: ''
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)

      // Get current user profile
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select(`
          *,
          departments (
            name,
            code
          )
        `)
        .eq('id', user.id)
        .single()

      setUserProfile(profile)

      // Load leave requests based on role
      let query = supabase
        .from('leave_requests')
        .select(`
          *,
          user_profiles (
            first_name,
            last_name,
            email,
            role,
            departments (
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (profile.role === 'user' || profile.role === 'staff') {
        // Regular users see only their own requests
        query = query.eq('user_id', user.id)
      }
      // Managers and admins see all requests

      const { data: requests, error } = await query

      if (error) throw error
      setLeaveRequests(requests || [])

    } catch (error) {
      console.error('Error loading leave data:', error)
      toast({
        title: "Error",
        description: "Failed to load leave requests",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.start_date || !formData.end_date) {
      toast({
        title: "Validation Error",
        description: "Please select both start and end dates",
        variant: "destructive"
      })
      return
    }

    const startDate = new Date(formData.start_date)
    const endDate = new Date(formData.end_date)

    if (startDate > endDate) {
      toast({
        title: "Validation Error",
        description: "End date must be after start date",
        variant: "destructive"
      })
      return
    }

    try {
      setIsSubmitting(true)

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: user.id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          reason: formData.reason || null,
          status: 'approved' // Auto-approve as per requirements
        })

      if (error) throw error

      toast({
        title: "Success",
        description: "Leave request submitted and approved automatically",
      })

      // Reset form and reload data
      setFormData({ start_date: '', end_date: '', reason: '' })
      setShowForm(false)
      loadData()

    } catch (error) {
      console.error('Error submitting leave request:', error)
      toast({
        title: "Error",
        description: "Failed to submit leave request",
        variant: "destructive"
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleApproveReject = async (requestId: string, action: 'approve' | 'reject') => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { error } = await supabase
        .from('leave_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          approved_by: user.id,
          approved_at: new Date().toISOString()
        })
        .eq('id', requestId)

      if (error) throw error

      toast({
        title: "Success",
        description: `Leave request ${action === 'approve' ? 'approved' : 'rejected'}`,
      })

      loadData()

    } catch (error) {
      console.error('Error updating leave request:', error)
      toast({
        title: "Error",
        description: `Failed to ${action} leave request`,
        variant: "destructive"
      })
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>
      default:
        return <Badge className="bg-yellow-100 text-yellow-800"><Clock className="w-3 h-3 mr-1" />Pending</Badge>
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading leave requests...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Leave Management</h1>
          <p className="text-muted-foreground">
            Manage approved leave requests and attendance blocking
          </p>
        </div>
        {(userProfile?.role === 'user' || userProfile?.role === 'staff') && (
          <Button onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 mr-2" />
            Request Leave
          </Button>
        )}
      </div>

      {/* Leave Request Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Submit Leave Request</CardTitle>
            <CardDescription>
              Leave requests are automatically approved and take effect immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmitLeaveRequest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Start Date</Label>
                  <Input
                    id="start_date"
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, start_date: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">End Date</Label>
                  <Input
                    id="end_date"
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, end_date: e.target.value }))}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="Please provide a reason for your leave request..."
                  value={formData.reason}
                  onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Submitting..." : "Submit Request"}
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Leave Requests List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5" />
            Leave Requests
          </CardTitle>
          <CardDescription>
            {leaveRequests.length === 0
              ? "No leave requests found"
              : `${leaveRequests.length} leave request${leaveRequests.length !== 1 ? 's' : ''} found`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {leaveRequests.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No leave requests found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {leaveRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium">
                          {request.user_profiles?.first_name} {request.user_profiles?.last_name}
                        </span>
                        <Badge variant="outline">{request.user_profiles?.role}</Badge>
                        {request.user_profiles?.departments?.name && (
                          <Badge variant="secondary">{request.user_profiles.departments.name}</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatDate(request.start_date)} - {formatDate(request.end_date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Submitted {formatDate(request.created_at)}
                        </div>
                      </div>
                      {request.reason && (
                        <p className="text-sm text-muted-foreground">
                          <strong>Reason:</strong> {request.reason}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(request.status)}
                      {(userProfile?.role === 'admin' || userProfile?.role === 'regional_manager' || userProfile?.role === 'hod') &&
                       request.status === 'pending' && (
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveReject(request.id, 'approve')}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApproveReject(request.id, 'reject')}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Alert */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          <strong>Leave Policy:</strong> Leave requests are automatically approved and take effect immediately.
          During approved leave periods, users cannot check-in or check-out, and their attendance records are excluded from reports.
        </AlertDescription>
      </Alert>
    </div>
  )
}