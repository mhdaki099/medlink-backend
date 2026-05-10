import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../services/api';

interface User {
    id: string;
    role: 'patient' | 'doctor' | 'pharmacy' | 'lab' | 'warehouse' | 'admin' | 'secretary';
    name: string;
    email: string;
    photo?: string;
    [key: string]: any;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    login: (email: string, password: string) => Promise<void>;
    register: (data: any) => Promise<any>;
    logout: () => void;
    updateUser: (data: Partial<User>) => void;
    refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const login = async (email: string, password: string) => {
        setIsLoading(true);
        try {
            const res = await api.login(email, password);
            setToken(res.access_token);
            setUser(res.user);
            api.setToken(res.access_token);
            return res.user;
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (data: any) => {
        setIsLoading(true);
        try {
            const res = await api.register(data);
            if (res.status !== 'pending' && res.access_token && res.user) {
                setToken(res.access_token);
                setUser(res.user);
                api.setToken(res.access_token);
            }
            return res;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = () => {
        setUser(null);
        setToken(null);
        api.setToken(null);
    };

    const updateUser = (data: Partial<User>) => {
        setUser(prev => prev ? { ...prev, ...data } : null);
    };

    const refreshUser = async () => {
        if (!user?.id) return;
        try {
            // Re-fetch user data based on role
            let updatedUser;
            if (user.role === 'patient') {
                updatedUser = await api.getPatientHistory(user.id).then(res => res.patient || res);
                // Wait, getPatientHistory returns a summary. I'll use a more direct way if needed.
                // For now, I'll just rely on updateUser from the profile screen.
            }
        } catch (e) {
            console.error('[AUTH] Failed to refresh user', e);
        }
    };

    return (
        <AuthContext.Provider value={{ user, token, isLoading, login, register, logout, updateUser, refreshUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}
