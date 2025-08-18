'use client'

import * as React from 'react'
import { Bell, Check, CheckCheck, Trash2, Clock, Bot, User, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { useNotificationsStore } from '@/store/notifications'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const getNotificationIcon = (type: string, aiGenerated?: boolean) => {
  if (aiGenerated) return <Bot className="h-4 w-4 text-blue-600" />
  
  switch (type) {
    case 'appointment':
    case 'ai_booking':
      return <Calendar className="h-4 w-4 text-green-600" />
    case 'reminder':
      return <Clock className="h-4 w-4 text-orange-600" />
    case 'system':
      return <Bell className="h-4 w-4 text-gray-600" />
    case 'urgent':
      return <Bell className="h-4 w-4 text-red-600" />
    default:
      return <Bell className="h-4 w-4 text-gray-600" />
  }
}

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'text-red-600 bg-red-50 border-red-200'
    case 'high': return 'text-orange-600 bg-orange-50 border-orange-200'
    case 'medium': return 'text-blue-600 bg-blue-50 border-blue-200'
    case 'low': return 'text-gray-600 bg-gray-50 border-gray-200'
    default: return 'text-gray-600 bg-gray-50 border-gray-200'
  }
}

export function NotificationsDropdown() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll
  } = useNotificationsStore()

  const handleMarkAsRead = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    markAsRead(id)
  }

  const handleRemoveNotification = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeNotification(id)
  }

  const formatTimeAgo = (date: Date) => {
    try {
      return formatDistanceToNow(date, { 
        addSuffix: true, 
        locale: ptBR 
      })
    } catch {
      return 'há alguns minutos'
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent align="end" className="w-96 max-h-96 overflow-y-auto">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span className="font-semibold">Notificações</span>
          {unreadCount > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">
                {unreadCount} nova{unreadCount !== 1 ? 's' : ''}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-6 px-2 text-xs hover:bg-green-100"
              >
                <CheckCheck className="h-3 w-3 mr-1" />
                Ler todas
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        
        <DropdownMenuSeparator />

        {notifications.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>Nenhuma notificação</p>
            <p className="text-xs">Você está em dia!</p>
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {notifications.slice(0, 10).map((notification) => (
              <div
                key={notification.id}
                className={`
                  relative p-3 rounded-lg border transition-all duration-200 hover:shadow-md cursor-pointer
                  ${!notification.read 
                    ? 'bg-blue-50/50 border-blue-200 shadow-sm' 
                    : 'bg-gray-50/30 border-gray-200'
                  }
                  ${getPriorityColor(notification.priority)}
                `}
                onClick={() => !notification.read && markAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-0.5">
                    {getNotificationIcon(notification.type, notification.metadata?.aiGenerated)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">
                        {notification.title}
                      </p>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-600 mb-2 line-clamp-2">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span>{formatTimeAgo(notification.timestamp)}</span>
                      
                      {/* AI Badge */}
                      {notification.metadata?.aiGenerated && (
                        <Badge variant="outline" className="text-xs px-1 py-0 bg-blue-50 text-blue-700 border-blue-300">
                          <Bot className="h-2 w-2 mr-1" />
                          IA
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-green-100"
                        onClick={(e) => handleMarkAsRead(e, notification.id)}
                        title="Marcar como lida"
                      >
                        <Check className="h-3 w-3 text-green-600" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-red-100"
                      onClick={(e) => handleRemoveNotification(e, notification.id)}
                      title="Remover notificação"
                    >
                      <Trash2 className="h-3 w-3 text-red-600" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {notifications.length > 10 && (
              <div className="text-center py-2 text-xs text-muted-foreground border-t">
                +{notifications.length - 10} notificações mais antigas
              </div>
            )}
          </div>
        )}

        {notifications.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <div className="p-2 flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAll}
                className="text-xs text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar todas
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}