'use client'

import { useState } from 'react'
import { User as UserIcon, Lock, Bell, Palette, Shield } from 'lucide-react'
import { PageHeader } from '@/components/system'
import { Field } from '@/components/system/forms'
import { inputClass } from '@/lib/styles'
import { useAuth } from '@/lib/auth/session'
import { useTheme } from 'next-themes'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { ChevronRight } from 'lucide-react'

// ═══════════════════════════════════════════════════════════════
//  SettingsPage — profile settings, password, preferences
// ═══════════════════════════════════════════════════════════════

export function SettingsPage() {
  const { user } = useAuth()
  const { theme, setTheme } = useTheme()
  const [activeTab, setActiveTab] = useState('profile')

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  async function saveProfile() {
    try {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email }),
      })
      if (res.ok) {
        toast.success('Profile updated', { description: 'Your changes have been saved.' })
      } else {
        toast.error('Failed to update profile')
      }
    } catch (e: any) {
      toast.error('Failed', { description: e.message })
    }
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error('Password too short', { description: 'Minimum 6 characters required.' })
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match')
      return
    }
    try {
      const res = await fetch(`/api/users/${user!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: newPassword }),
      })
      if (res.ok) {
        toast.success('Password changed')
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('')
      } else {
        toast.error('Failed to change password')
      }
    } catch (e: any) {
      toast.error('Failed', { description: e.message })
    }
  }

  const TABS = [
    { key: 'profile', label: 'Profile', icon: UserIcon },
    { key: 'security', label: 'Security', icon: Lock },
    { key: 'appearance', label: 'Appearance', icon: Palette },
    { key: 'notifications', label: 'Notifications', icon: Bell },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-3xl mx-auto">
      <PageHeader
        title="Profile Settings"
        description="Manage your account, security and preferences."
        icon={Shield}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Settings</span>
          </>
        }
      />

      {/* Tab selector */}
      <div className="flex gap-2 border-b pb-px overflow-x-auto">
        {TABS.map((t) => {
          const Icon = t.icon
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={cn(
                'inline-flex items-center gap-1.5 h-9 px-3 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                activeTab === t.key ? 'bg-primary text-primary-foreground' : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          )
        })}
      </div>

      {/* Profile tab */}
      {activeTab === 'profile' && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Account Information</h3>
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="grid place-items-center h-16 w-16 rounded-full bg-primary text-primary-foreground font-bold text-xl shrink-0">
                {user?.name?.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
                <span className="inline-block mt-1 text-[10px] font-medium uppercase px-2 py-0.5 rounded-full bg-primary/10 text-primary capitalize">{user?.role}</span>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Full Name">
                <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} />
              </Field>
              <Field label="Email">
                <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} />
              </Field>
            </div>
            <button onClick={saveProfile} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      )}

      {/* Security tab */}
      {activeTab === 'security' && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Change Password</h3>
            <div className="space-y-3">
              <Field label="Current Password">
                <input type="password" className={inputClass} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="New Password">
                <input type="password" className={inputClass} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" />
              </Field>
              <Field label="Confirm New Password">
                <input type="password" className={inputClass} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" />
              </Field>
            </div>
            <button onClick={changePassword} className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              Change Password
            </button>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <h3 className="font-semibold text-base mb-2">Role & Permissions</h3>
            <p className="text-sm text-muted-foreground">Your role: <span className="font-medium text-foreground capitalize">{user?.role}</span></p>
            <p className="text-xs text-muted-foreground mt-1">Contact your administrator to change your role or permissions.</p>
          </div>
        </div>
      )}

      {/* Appearance tab */}
      {activeTab === 'appearance' && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Theme</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={cn(
                  'rounded-lg border p-4 text-left transition-all',
                  theme === 'light' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
                )}
              >
                <div className="h-20 rounded-md bg-white border mb-2 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary" />
                </div>
                <p className="text-sm font-medium">Light</p>
                <p className="text-xs text-muted-foreground">White background, dark text</p>
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={cn(
                  'rounded-lg border p-4 text-left transition-all',
                  theme === 'dark' ? 'border-primary ring-2 ring-primary/20' : 'border-border hover:border-primary/50',
                )}
              >
                <div className="h-20 rounded-md bg-zinc-900 border mb-2 flex items-center justify-center">
                  <div className="h-8 w-8 rounded-full bg-primary" />
                </div>
                <p className="text-sm font-medium">Dark</p>
                <p className="text-xs text-muted-foreground">Dark background, light text</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notifications tab */}
      {activeTab === 'notifications' && (
        <div className="space-y-4 animate-fade-in">
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <h3 className="font-semibold text-base">Notification Preferences</h3>
            <div className="space-y-3">
              {[
                { label: 'Low-stock alerts', desc: 'Get notified when items fall below reorder level' },
                { label: 'PO delivery reminders', desc: 'Remind when purchase orders are due for receipt' },
                { label: 'Dispatch updates', desc: 'Get notified on dispatch status changes' },
                { label: 'POD confirmations', desc: 'Get notified when deliveries are confirmed' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => toast.info('Coming soon', { description: 'Notification preferences will be configurable.' })}
                    className="h-6 w-11 rounded-full bg-primary relative shrink-0 transition-colors"
                  >
                    <span className="absolute top-0.5 right-0.5 h-5 w-5 rounded-full bg-white transition-transform" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
