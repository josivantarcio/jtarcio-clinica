'use client'

import * as React from "react"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { useAuthStore } from "@/store/auth"
import { cn } from "@/lib/utils"

interface AppLayoutProps {
  children: React.ReactNode
  className?: string
  showSidebar?: boolean
}

export function AppLayout({ children, className, showSidebar = true }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false)
  const { user } = useAuthStore()

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
          <div className="hidden md:block">
            <Sidebar />
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