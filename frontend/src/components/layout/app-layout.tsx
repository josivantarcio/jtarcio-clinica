'use client'

import * as React from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"
import { ChevronRight, ChevronLeft } from "lucide-react"

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
  showSidebar?: boolean
}

export function AppLayout({ children, className, showSidebar = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = React.useState(() => {
    // Recuperar estado do localStorage no cliente
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebar-collapsed')
      return saved === 'true'
    }
    return false
  })
  const [showToggle, setShowToggle] = React.useState(false)
  const { user } = useAuthStore()

  // Persistir estado do colapso no localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebar-collapsed', sidebarCollapsed.toString())
    }
  }, [sidebarCollapsed])

  // Auto-close sidebar on mobile when route changes
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(false)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        showSidebar={showSidebar}
      />
      
      <div className="flex h-[calc(100vh-3.5rem)]">
        {/* Desktop Sidebar */}
        {showSidebar && (
          <div className="hidden md:block relative">
            <Sidebar isCollapsed={sidebarCollapsed} />
            
            {/* Sidebar Resize Handle/Toggle */}
            <div 
              className="absolute top-0 right-0 w-2 h-full bg-transparent hover:bg-blue-500/10 cursor-col-resize group transition-all duration-200"
              onMouseEnter={() => setShowToggle(true)}
              onMouseLeave={() => setShowToggle(false)}
            >
              {/* Hover Indicator Line */}
              <div className="absolute right-0 top-0 w-0.5 h-full bg-transparent group-hover:bg-blue-500/30 transition-colors duration-200" />
              
              {/* Toggle Button */}
              <div className={cn(
                "absolute top-1/2 right-0 transform -translate-y-1/2 translate-x-1/2",
                "w-7 h-7 bg-white border-2 border-blue-500/20 rounded-full shadow-lg",
                "flex items-center justify-center cursor-pointer",
                "hover:bg-blue-50 hover:border-blue-500/40 hover:shadow-xl",
                "transition-all duration-300 scale-0 group-hover:scale-100",
                "active:scale-95",
                showToggle && "scale-100"
              )}
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              title={sidebarCollapsed ? "Expandir menu lateral" : "Recolher menu lateral"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-4 h-4 text-blue-600" />
                ) : (
                  <ChevronLeft className="w-4 h-4 text-blue-600" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Mobile Sidebar Overlay */}
        {showSidebar && sidebarOpen && (
          <>
            <div 
              className="fixed inset-0 z-40 bg-black/80 md:hidden" 
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 z-50 md:hidden">
              <Sidebar onClose={() => setSidebarOpen(false)} />
            </div>
          </>
        )}

        {/* Main Content */}
        <main className={cn(
          "flex-1 overflow-auto",
          className
        )}>
          <div className="h-full p-4 md:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}