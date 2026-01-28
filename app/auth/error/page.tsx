import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 dark:from-slate-950 dark:to-slate-900 px-4">
      <Card className="w-full max-w-md">
        <div className="p-8">
          <div className="mb-6 text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              Authentication Error
            </h1>
          </div>

          <p className="text-center text-slate-600 dark:text-slate-400 mb-6">
            Something went wrong with your authentication. Please try logging in again.
          </p>

          <Link href="/auth/login" className="block">
            <Button className="w-full">
              Return to Login
            </Button>
          </Link>

          <div className="mt-4 text-center">
            <Link href="/" className="text-blue-600 hover:underline text-sm dark:text-blue-400">
              Back to Home
            </Link>
          </div>
        </div>
      </Card>
    </div>
  )
}
