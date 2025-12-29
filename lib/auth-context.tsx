"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react"
import type { ForumsUser } from "./types"
import forumsApi, { setAccessToken, getAccessToken } from "./forums-api"

interface AuthContextType {
  user: ForumsUser | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (loginId: string, password: string) => Promise<void>
  register: (email: string, username: string, password: string, displayName?: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ForumsUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    const token = getAccessToken()
    if (!token) {
      setUser(null)
      setIsLoading(false)
      return
    }

    try {
      const userData = await forumsApi.auth.me({ suppressErrorLogging: true })
      setUser(userData)
    } catch {
      setAccessToken(null)
      setUser(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshUser()
  }, [refreshUser])

  const login = async (loginId: string, password: string) => {
    const result = await forumsApi.auth.login({ login: loginId, password })
    setUser(result.user)
  }

  const register = async (email: string, username: string, password: string, displayName?: string) => {
    // First register
    await forumsApi.auth.register({
      email,
      username,
      password,
      displayName,
    })
    // Then login with the new credentials
    const result = await forumsApi.auth.login({ login: email, password })
    setUser(result.user)
  }

  const logout = async () => {
    try {
      await forumsApi.auth.logout()
    } finally {
      setUser(null)
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
