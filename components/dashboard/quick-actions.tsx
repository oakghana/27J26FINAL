"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Clock, Calendar, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"

interface QuickActionsProps {
  isOnLeave?: boolean
  leavePeriod?: {
    startDate: string
    endDate: string
  }
}

export function QuickActions({ isOnLeave = false, leavePeriod }: QuickActionsProps) {
  const actions = [
    {
      title: "Check In/Out",
      description: isOnLeave
        ? `On leave until ${leavePeriod?.endDate || 'unknown'}`
        : "Record your daily attendance with location verification",
      href: "/dashboard/attendance",
      icon: Clock,
      gradient: isOnLeave
        ? "from-gray-50 via-gray-100 to-gray-150"
        : "from-green-50 via-green-100 to-green-150",
      hoverGradient: isOnLeave
        ? "hover:from-gray-100 hover:via-gray-150 hover:to-gray-200"
        : "hover:from-green-100 hover:via-green-150 hover:to-green-200",
      border: isOnLeave
        ? "border-gray-200 hover:border-gray-300"
        : "border-green-200 hover:border-green-300",
      iconBg: isOnLeave
        ? "bg-gradient-to-br from-gray-100 to-gray-200"
        : "bg-gradient-to-br from-green-100 to-green-200",
      iconColor: isOnLeave ? "text-gray-600" : "text-green-600",
      disabled: isOnLeave,
    },
    {
      title: "Leave Notifications",
      description: "View leave requests and approvals in real time",
      href: "/dashboard/leave",
      icon: Calendar,
      gradient: "from-fuchsia-950/10 via-fuchsia-900/10 to-rose-900/10",
      hoverGradient: "hover:from-fuchsia-900/20 hover:via-rose-900/20 hover:to-rose-900/10",
      border: "border-fuchsia-500/40 hover:border-fuchsia-500/70",
      iconBg: "bg-gradient-to-br from-fuchsia-500/20 to-rose-500/20",
      iconColor: "text-fuchsia-600",
      badge: "Live",
      badgeClass: "bg-fuchsia-600 text-white shadow-sm",
    },
  ]

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-0 bg-gradient-to-br from-card via-card/95 to-card/90 backdrop-blur-sm">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-heading font-bold flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 rounded-xl shadow-sm">
            <Zap className="h-5 w-5 text-green-600" />
          </div>
          Quick Actions
        </CardTitle>
        <CardDescription className="text-base font-medium">
          Common tasks and shortcuts for daily operations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.href}
              asChild={!action.disabled}
              disabled={action.disabled}
              className={`h-auto w-full flex items-center gap-6 p-6 bg-gradient-to-r ${action.gradient} ${action.disabled ? '' : action.hoverGradient} border ${action.border} transition-all duration-300 ${action.disabled ? 'cursor-not-allowed opacity-60' : 'hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02]'} touch-manipulation group relative overflow-hidden`}
              variant="outline"
            >
              {action.disabled ? (
                <div className="w-full">
                  <div
                    className={`flex-shrink-0 p-4 ${action.iconBg} rounded-2xl shadow-sm`}
                  >
                    <Icon
                      className={`h-6 w-6 ${action.iconColor}`}
                    />
                  </div>

                  <div className="flex-1 text-left space-y-1">
                    <div className="font-bold text-foreground text-lg flex items-center gap-2">
                      {action.title}
                    </div>
                    <div className="text-sm text-muted-foreground font-medium leading-relaxed">{action.description}</div>
                  </div>
                </div>
              ) : (
                <Link href={action.href}>
                  <div
                    className={`flex-shrink-0 p-4 ${action.iconBg} rounded-2xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110`}
                  >
                    <Icon
                      className={`h-6 w-6 ${action.iconColor} transition-transform duration-300 group-hover:rotate-3`}
                    />
                  </div>

                  <div className="flex-1 text-left space-y-1">
                    <div className="font-bold text-foreground text-lg flex items-center gap-2">
                      {action.title}
                      {action.badge && (
                        <Badge className={action.badgeClass}>{action.badge}</Badge>
                      )}
                      <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1" />
                    </div>
                    <div className="text-sm text-muted-foreground font-medium leading-relaxed">{action.description}</div>
                  </div>

                  <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                </Link>
              )}
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
