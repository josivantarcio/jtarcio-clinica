'use client'

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { 
  Calendar, 
  Users, 
  MessageCircle, 
  BarChart3, 
  Settings,
  Stethoscope,
  Clock,
  FileText,
  Shield,
  Home
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/auth"

interface NavItem {
  title: string
  href: string
  icon: React.ElementType
  roles?: string[]
  badge?: string
}

const navigationItems: NavItem[] = [
  {
    title: "Início",
    href: "/dashboard",
    icon: Home,
    roles: ["PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST"]
  },
  {
    title: "Consultas",
    href: "/appointments",
    icon: Calendar,
    roles: ["PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST"]
  },
  {
    title: "Chat IA",
    href: "/chat",
    icon: MessageCircle,
    roles: ["PATIENT", "RECEPTIONIST"]
  },
  {
    title: "Pacientes",
    href: "/patients",
    icon: Users,
    roles: ["DOCTOR", "ADMIN", "RECEPTIONIST"]
  },
  {
    title: "Médicos",
    href: "/doctors",
    icon: Stethoscope,
    roles: ["ADMIN", "RECEPTIONIST"]
  },
  {
    title: "Agenda",
    href: "/schedule",
    icon: Clock,
    roles: ["DOCTOR", "ADMIN", "RECEPTIONIST"]
  },
  {
    title: "Relatórios",
    href: "/reports",
    icon: FileText,
    roles: ["DOCTOR", "ADMIN"]
  },
  {
    title: "Analytics",
    href: "/analytics",
    icon: BarChart3,
    roles: ["ADMIN"]
  },
  {
    title: "Administração",
    href: "/admin",
    icon: Shield,
    roles: ["ADMIN"]
  },
  {
    title: "Configurações",
    href: "/settings",
    icon: Settings,
    roles: ["PATIENT", "DOCTOR", "ADMIN", "RECEPTIONIST"]
  }
]

interface SidebarProps {
  className?: string
  isOpen?: boolean
  onClose?: () => void
}

export function Sidebar({ className, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname()
  const { user } = useAuthStore()

  // Filter navigation items based on user role
  const visibleItems = navigationItems.filter(item => 
    !item.roles || !user?.role || item.roles.includes(user.role)
  )

  return (
    <div className={cn(
      "flex h-full w-64 flex-col bg-card border-r",
      className
    )}>
      {/* Sidebar Header */}
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
            <span className="text-sm font-bold text-primary-foreground">EO</span>
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">EO Clínica</span>
            <span className="text-xs text-muted-foreground">
              {user?.role === 'PATIENT' && 'Portal do Paciente'}
              {user?.role === 'DOCTOR' && 'Portal Médico'}
              {user?.role === 'ADMIN' && 'Administração'}
              {user?.role === 'RECEPTIONIST' && 'Recepção'}
            </span>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive = pathname === item.href || 
            (item.href !== '/dashboard' && pathname.startsWith(item.href))
          
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
            >
              <Button
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  isActive && "bg-secondary text-secondary-foreground"
                )}
              >
                <item.icon className="mr-2 h-4 w-4" />
                {item.title}
                {item.badge && (
                  <span className="ml-auto rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </Button>
            </Link>
          )
        })}
      </nav>

      {/* User Info */}
      {user && (
        <div className="border-t p-4">
          <div className="flex items-center space-x-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
              <span className="text-sm font-medium">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {user.email}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}