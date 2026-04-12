import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Session, User } from '@supabase/supabase-js'

const AuthContext = createContext<{ user: User | null; session: Session | null }>({ user: null, session: null })

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null)
    const [user, setUser] = useState<User | null>(null)

    useEffect(() => {
    // Lắng nghe trạng thái đăng nhập
    supabase.auth.getSession().then(({ data: { session } }) => {
        setSession(session)
        setUser(session?.user ?? null)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session)
        setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
    }, [])

    return (
    <AuthContext.Provider value={{ session, user }}>
        {children}
    </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)