'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Spinner } from '@/components/ui/spinner'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          router.push('/dashboard')
        } else {
          router.push('/auth/login')
        }
      } catch (error) {
        console.log('[v0] Auth check error:', error)
        router.push('/auth/login')
      } finally {
        setIsChecking(false)
      }
    }

    checkAuth()
  }, [router, supabase])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#1a1f26]">
        <Spinner />
      </div>
    )
  }

  return null
}
