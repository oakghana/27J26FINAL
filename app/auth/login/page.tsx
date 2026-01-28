'use client'

import React from "react"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('test@qccgh.com')
  const [password, setPassword] = useState('password')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(signInError.message)
        return
      }

      router.push('/dashboard')
    } catch (err) {
      setError('An unexpected error occurred')
      console.log('[v0] Login error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1a1f26] to-[#0f1218] flex items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md bg-[#252d36] border-[#3d4a5a] shadow-2xl">
        <div className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#00ff00] to-[#00cc00] flex items-center justify-center">
              <span className="text-2xl font-bold text-[#1a1f26]">QCC</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-center text-3xl font-bold mb-2 text-[#00ff00]">
            QCC ELECTRONIC ATTENDANCE
          </h1>
          <p className="text-center text-sm text-[#a0aab5] mb-8">
            Sign in with your Staff Number, Email or OTP
          </p>

          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-[#3d4a5a]">
            <button className="pb-3 px-4 text-sm font-medium text-[#00ff00] border-b-2 border-[#00ff00]">
              Staff Login
            </button>
            <button className="pb-3 px-4 text-sm font-medium text-[#a0aab5] hover:text-[#f5f5f5]">
              OTP Login
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-900/20 border border-red-500/50 rounded-lg flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-[#f5f5f5] mb-2">
                Staff Number or Email Address
              </label>
              <Input
                type="email"
                placeholder="ohemelappiah@qccgh.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5] placeholder-[#7a8a9a]"
                disabled={isLoading}
              />
              <p className="text-xs text-[#a0aab5] mt-2">
                Enter your 7-digit staff number (e.g., 1234567) or corporate email address
              </p>
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-[#f5f5f5] mb-2">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#3d4a5a] border-[#4a5868] text-[#f5f5f5] placeholder-[#7a8a9a]"
                disabled={isLoading}
              />
            </div>

            {/* Sign In Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-[#00ff00] hover:bg-[#00e600] text-[#1a1f26] font-semibold text-base rounded-lg mt-8"
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          {/* Sign Up Link */}
          <p className="text-center text-sm text-[#a0aab5] mt-6">
            Don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-[#00ff00] hover:text-[#00e600] font-medium"
            >
              Sign up
            </button>
          </p>

          {/* Footer */}
          <div className="mt-12 pt-8 border-t border-[#3d4a5a] text-center text-xs text-[#7a8a9a]">
            <p className="font-medium text-[#a0aab5]">Quality Control Company Limited</p>
            <p>Intranet Portal - Powered by IT Department</p>
            <p className="mt-1">V.2.1.23.26</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
