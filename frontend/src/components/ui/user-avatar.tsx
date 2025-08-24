'use client'

import { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { User } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UserAvatarProps {
  src?: string | null
  name?: string | null
  className?: string
  fallbackClassName?: string
  size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
  sm: 'h-8 w-8',
  md: 'h-10 w-10', 
  lg: 'h-12 w-12'
}

/**
 * Robust user avatar component that handles image loading errors gracefully
 * Falls back to initials or icon when image fails to load
 */
export function UserAvatar({ 
  src, 
  name, 
  className, 
  fallbackClassName,
  size = 'md' 
}: UserAvatarProps) {
  const [imageError, setImageError] = useState(false)

  // Generate initials from name
  const getInitials = (name: string | null | undefined): string => {
    if (!name) return 'U'
    
    const parts = name.trim().split(' ').filter(Boolean)
    if (parts.length === 0) return 'U'
    if (parts.length === 1) return parts[0][0].toUpperCase()
    
    // First + Last name initials
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  // Check if src is a valid and safe URL or path
  const isValidImageSrc = (src: string | null | undefined): boolean => {
    if (!src || typeof src !== 'string' || src.trim() === '') return false
    
    // Only allow external URLs (http/https) or data URLs
    // Avoid local uploads that might not exist
    return (
      src.startsWith('https://') || 
      src.startsWith('http://') || 
      src.startsWith('data:image/')
    )
  }

  const showImage = isValidImageSrc(src) && !imageError

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {showImage && (
        <AvatarImage 
          src={src!} 
          alt={`Avatar de ${name || 'Usuário'}`}
          onError={() => setImageError(true)}
        />
      )}
      <AvatarFallback className={cn('font-semibold', fallbackClassName)}>
        {name ? getInitials(name) : <User className="h-4 w-4" />}
      </AvatarFallback>
    </Avatar>
  )
}