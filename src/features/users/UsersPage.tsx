'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Trash2, Shield, Eye, EyeOff, RefreshCw, ChevronRight } from 'lucide-react'
import { PageHeader, StatCard, StatusBadge, EmptyState } from '@/components/system'
import { DataTable, CodeCell, type Column } from '@/components/system/data-table'
import { MasterTabShell } from '@/components/system/master-tab-shell'
import { CreateDialog } from '@/components/system/create-dialog'
import { ViewDialog, type ViewField } from '@/components/system/view-dialog'
import { RowActions } from '@/components/system/row-actions'
import { Field } from '@/components/system/forms'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api/client'
import { useDebounce } from '@/lib/hooks/use-debounce'
import { inputClass } from '@/lib/styles'
import { toast } from 'sonner'
import { num, date, dateTime } from '@/lib/format'

// ═══════════════════════════════════════════════════════════════
//  UsersPage — User Management with RBAC role assignment
// ═══════════════════════════════════════════════════════════════

interface User {
  id: string
  email: string
  name: string
  role: string
  avatar: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

interface Role {
  id: string
  name: string
  label: string
  description: string | null
  isSystem: boolean
  permissions: { id: string; module: string; action: string }[]
}

const EMPTY_FORM = {
  name: '',
  email: '',
  role: 'staff',
  password: '',
}

export function UsersPage() {
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [editItem, setEditItem] = useState<User | null>(null)
  const [viewItem, setViewItem] = useState<User | null>(null)
  const [deleteItem, setDeleteItem] = useState<User | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPassword, setShowPassword] = useState(false)
  const debouncedSearch = useDebounce(search, 250)
  const qc = useQueryClient()

  const { data: users, isLoading, isError, refetch } = useQuery({
    queryKey: ['users', debouncedSearch],
    queryFn: () => api.get<User[]>('/api/users'),
  })

  const { data: roles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => api.get<Role[]>('/api/roles'),
  })

  const createMutation = useMutation({
    mutationFn: (input: typeof EMPTY_FORM) => api.post<User>('/api/users', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Partial<typeof EMPTY_FORM> }) =>
      api.patch<User>(`/api/users/${id}`, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })

  useEffect(() => {
    if (editItem) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm({
        name: editItem.name,
        email: editItem.email,
        role: editItem.role,
        password: '',
      })
    }
  }, [editItem])

  const filtered = (users || []).filter((u) => {
    if (!debouncedSearch) return true
    const q = debouncedSearch.toLowerCase()
    return u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
  })

  function setField<K extends keyof typeof EMPTY_FORM>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function openCreate() {
    setForm(EMPTY_FORM)
    setCreateOpen(true)
  }

  function openEdit(u: User) {
    setViewItem(null)
    setEditItem(u)
  }

  async function submitCreate() {
    if (!form.name || !form.email) {
      toast.error('Name and email are required')
      return
    }
    try {
      await createMutation.mutateAsync(form)
      toast.success('User created', { description: form.email })
      setCreateOpen(false)
    } catch (e: any) {
      toast.error('Failed to create user', { description: e.message })
    }
  }

  async function submitEdit() {
    if (!editItem) return
    try {
      const updateData: any = { name: form.name, email: form.email, role: form.role }
      if (form.password) updateData.password = form.password
      await updateMutation.mutateAsync({ id: editItem.id, input: updateData })
      toast.success('User updated', { description: form.email })
      setEditItem(null)
    } catch (e: any) {
      toast.error('Failed to update user', { description: e.message })
    }
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await deleteMutation.mutateAsync(deleteItem.id)
      toast.success('User deactivated', { description: deleteItem.email })
      setDeleteItem(null)
    } catch (e: any) {
      toast.error('Failed', { description: e.message })
    }
  }

  function viewFields(u: User): ViewField[] {
    const roleLabel = roles?.find(r => r.name === u.role)?.label || u.role
    const userPerms = roles?.find(r => r.name === u.role)?.permissions || []
    return [
      { label: 'Name', value: u.name },
      { label: 'Email', value: u.email, mono: true },
      { label: 'Role', value: <Badge variant="outline" className="capitalize">{roleLabel}</Badge> },
      { label: 'Status', value: u.active ? <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">Active</Badge> : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge> },
      { label: 'Created', value: date(u.createdAt) },
      { label: 'Last Updated', value: dateTime(u.updatedAt) },
      { label: 'Permissions', value: `${userPerms.length} granted`, mono: true },
    ]
  }

  const stats = {
    total: users?.length || 0,
    active: users?.filter(u => u.active).length || 0,
    admins: users?.filter(u => u.role === 'admin').length || 0,
    roles: roles?.length || 0,
  }

  const columns: Column<User>[] = [
    {
      key: 'name', header: 'Name',
      cell: (u) => (
        <div className="flex items-center gap-2.5">
          <div className="grid place-items-center h-8 w-8 rounded-full bg-primary text-primary-foreground font-semibold text-xs shrink-0">
            {u.name.split(/\s+/).map(p => p[0]).slice(0, 2).join('').toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
        </div>
      ),
      sort: (a, b) => a.name.localeCompare(b.name),
    },
    {
      key: 'role', header: 'Role',
      cell: (u) => {
        const roleLabel = roles?.find(r => r.name === u.role)?.label || u.role
        const tone = u.role === 'admin' ? 'bg-primary/10 text-primary border-primary/20' : u.role === 'manager' ? 'bg-sky-500/10 text-sky-600 border-sky-500/20' : 'bg-muted text-muted-foreground border-border'
        return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${tone}`}>{roleLabel}</span>
      },
      sort: (a, b) => a.role.localeCompare(b.role),
    },
    { key: 'status', header: 'Status', align: 'center', cell: (u) => u.active ? <Badge variant="outline" className="text-emerald-600 border-emerald-500/30 bg-emerald-500/5">Active</Badge> : <Badge variant="outline" className="text-muted-foreground">Inactive</Badge> },
    { key: 'createdAt', header: 'Added', cell: (u) => <span className="text-xs text-muted-foreground">{date(u.createdAt)}</span>, sort: (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() },
    {
      key: 'actions', header: '', align: 'right', noPadding: true,
      cell: (u) => (
        <RowActions
          onView={() => setViewItem(u)}
          onEdit={() => openEdit(u)}
          onDelete={() => setDeleteItem(u)}
        />
      ),
    },
  ]

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1600px] mx-auto">
      <PageHeader
        title="User Management"
        description="Manage warehouse staff, roles and permissions."
        icon={Shield}
        breadcrumb={
          <>
            <span>Whirlpool BD</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">Users</span>
          </>
        }
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New User
          </button>
        }
      />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 stagger">
        <StatCard label="Total Users" value={num(stats.total)} icon={Users} tone="primary" />
        <StatCard label="Active" value={num(stats.active)} icon={Users} tone="success" />
        <StatCard label="Admins" value={num(stats.admins)} icon={Shield} tone="info" />
        <StatCard label="Roles" value={num(stats.roles)} icon={Shield} />
      </div>

      {/* Role summary cards */}
      {roles && roles.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {roles.map((r) => (
            <div key={r.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{r.label}</span>
                {r.isSystem && <Badge variant="outline" className="text-[10px]">System</Badge>}
              </div>
              <p className="text-xs text-muted-foreground mb-2">{r.description || '—'}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] font-mono">{r.permissions.length} perms</Badge>
                <span className="text-xs text-muted-foreground">
                  {users?.filter(u => u.role === r.name).length || 0} users
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <MasterTabShell<User>
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search by name, email or role…"
        onRefresh={() => refetch()}
        isLoading={isLoading}
        isError={isError}
        isEmpty={!isLoading && filtered.length === 0}
        emptyTitle="No users found"
        emptyDescription="Add your first user to get started."
        emptyIcon={Users}
        onRetry={() => refetch()}
      >
        <DataTable
          data={filtered}
          columns={columns}
          rowKey={(u) => u.id}
          initialSortKey="name"
        />
      </MasterTabShell>

      {/* Create dialog */}
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="New User"
        description="Create a new warehouse staff account."
        onSubmit={submitCreate}
        submitLabel={createMutation.isPending ? 'Creating…' : 'Create user'}
        disabled={createMutation.isPending}
        maxWidth="max-w-lg"
      >
        <UserForm form={form} setField={setField} roles={roles || []} showPassword={showPassword} setShowPassword={setShowPassword} />
      </CreateDialog>

      {/* Edit dialog */}
      <CreateDialog
        open={editItem !== null}
        onOpenChange={(o) => !o && setEditItem(null)}
        title="Edit User"
        description={`Editing ${editItem?.email}`}
        onSubmit={submitEdit}
        submitLabel={updateMutation.isPending ? 'Saving…' : 'Save changes'}
        disabled={updateMutation.isPending}
        maxWidth="max-w-lg"
      >
        <UserForm form={form} setField={setField} roles={roles || []} showPassword={showPassword} setShowPassword={setShowPassword} isEdit />
      </CreateDialog>

      {/* View dialog */}
      <ViewDialog
        open={viewItem !== null}
        onOpenChange={(o) => !o && setViewItem(null)}
        title={viewItem?.name || ''}
        subtitle={viewItem?.email}
        fields={viewItem ? viewFields(viewItem) : []}
        onEdit={() => viewItem && openEdit(viewItem)}
        maxWidth="max-w-lg"
        footer={
          viewItem && roles ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Role Permissions ({roles.find(r => r.name === viewItem.role)?.permissions.length || 0})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
                {roles.find(r => r.name === viewItem.role)?.permissions.map((p) => (
                  <span key={p.id} className="inline-flex items-center rounded-md border bg-muted/40 px-2 py-0.5 text-[11px] font-mono">
                    {p.module}.{p.action}
                  </span>
                )) || <span className="text-xs text-muted-foreground">No permissions</span>}
              </div>
            </div>
          ) : undefined
        }
      />

      {/* Delete confirmation */}
      <AlertDialog open={deleteItem !== null} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate user?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate <span className="font-mono font-semibold">{deleteItem?.email}</span> — {deleteItem?.name}.
              They will no longer be able to log in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ─── Reusable user form ─────────────────────────────────────────
function UserForm({
  form, setField, roles, showPassword, setShowPassword, isEdit,
}: {
  form: typeof EMPTY_FORM
  setField: <K extends keyof typeof EMPTY_FORM>(key: K, value: string) => void
  roles: Role[]
  showPassword: boolean
  setShowPassword: (v: boolean) => void
  isEdit?: boolean
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Full Name" required>
        <input className={inputClass} value={form.name} onChange={(e) => setField('name', e.target.value)} placeholder="Rakib Hossain" />
      </Field>
      <Field label="Email" required>
        <input type="email" className={inputClass} value={form.email} onChange={(e) => setField('email', e.target.value)} placeholder="user@whirlpool-bd.com" />
      </Field>
      <Field label="Role" required>
        <select
          className={inputClass}
          value={form.role}
          onChange={(e) => setField('role', e.target.value)}
        >
          {roles.map((r) => (
            <option key={r.id} value={r.name}>{r.label}</option>
          ))}
        </select>
      </Field>
      <Field label={isEdit ? 'New Password (leave blank to keep)' : 'Password'} required={!isEdit}>
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            className={inputClass + ' pr-9'}
            value={form.password}
            onChange={(e) => setField('password', e.target.value)}
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </Field>
    </div>
  )
}
