import { Head, router, useForm, usePage } from '@inertiajs/react';
import { UserPlus } from 'lucide-react';
import type { FormEvent } from 'react';
import { useConfirm } from '@/components/confirm-provider';
import type { ConfirmOptions } from '@/components/confirm-provider';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { selectClass } from '@/lib/asset-ui';
import { fmtDate } from '@/lib/photostat';
import { destroy, index, store, update } from '@/routes/users';

type Person = {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    role: 'admin' | 'user';
    status: 'active' | 'pending' | 'rejected';
    google: boolean;
    created_at: string | null;
    last_login_at: string | null;
};

const STATUS_BADGE = {
    active: <Badge className="bg-green-700 text-white">Approved</Badge>,
    pending: <Badge className="bg-amber-400 text-black">Waiting</Badge>,
    rejected: <Badge variant="destructive">Blocked</Badge>,
};

export default function People({ users }: { users: Person[] }) {
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;
    const confirm = useConfirm();
    const pending = users.filter((u) => u.status === 'pending');
    const others = users.filter((u) => u.status !== 'pending');

    const change = async (u: Person, data: Partial<Pick<Person, 'role' | 'status'>>, ask?: ConfirmOptions) => {
        if (ask && !(await confirm(ask))) {
            return;
        }
        router.put(update.url(u.id), data, { preserveScroll: true });
    };

    const remove = async (u: Person) => {
        const ok = await confirm({
            title: `Remove ${u.name}?`,
            description: 'Their account is deleted. Photostat records they made are kept, with their name.',
            action: 'Remove',
            destructive: true,
        });
        if (ok) {
            router.delete(destroy.url(u.id), { preserveScroll: true });
        }
    };

    const actions = (u: Person, size: 'sm' | 'xs') => (
        <div className="flex flex-wrap gap-1">
            {u.status === 'active' ? (
                <>
                    <Button size={size} variant="outline" onClick={() =>
                        change(u, { role: u.role === 'admin' ? 'user' : 'admin' }, u.role === 'admin'
                            ? { title: `Make ${u.name} a normal user?`, description: 'They can still record prints but lose access to assets and admin pages.', action: 'Make user' }
                            : { title: `Make ${u.name} an admin?`, description: 'Admins manage assets, photostat machines and people.', action: 'Make admin' })}>
                        {u.role === 'admin' ? 'Make user' : 'Make admin'}
                    </Button>
                    <Button size={size} variant="outline" onClick={() =>
                        change(u, { status: 'rejected' }, { title: `Block ${u.name}?`, description: 'They are signed out at once and can no longer sign in.', action: 'Block', destructive: true })}>
                        Block
                    </Button>
                </>
            ) : (
                <Button size={size} variant="outline" onClick={() => change(u, { status: 'active' })}>
                    Approve
                </Button>
            )}
            <Button size={size} variant="ghost" className="text-destructive" onClick={() => remove(u)}>
                Remove
            </Button>
        </div>
    );

    return (
        <>
            <Head title="People" />
            <div className="max-w-5xl space-y-6 p-4">
                <div>
                    <h1 className="text-xl font-semibold">People</h1>
                    <p className="text-sm text-muted-foreground">Everyone signs in with Google. New people wait here until an admin approves them.</p>
                </div>

                <section className="rounded-xl border bg-card p-4">
                    <h2 className="font-semibold">Waiting for approval</h2>
                    {pending.length === 0 ? (
                        <p className="mt-2 text-sm text-muted-foreground">No one is waiting.</p>
                    ) : (
                        <ul className="mt-2 divide-y">
                            {pending.map((u) => (
                                <li key={u.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                                    <PersonCell u={u} />
                                    <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto">
                                        <Button size="sm" onClick={() => change(u, { status: 'active', role: 'user' })}>Approve</Button>
                                        <Button size="sm" variant="outline" onClick={() =>
                                            change(u, { status: 'active', role: 'admin' }, { title: `Approve ${u.name} as an admin?`, description: 'Admins manage assets, photostat machines and people.', action: 'Approve as admin' })}>
                                            As admin
                                        </Button>
                                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => change(u, { status: 'rejected' })}>
                                            Reject
                                        </Button>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    )}
                </section>

                <PreApprove />

                <section className="rounded-xl border bg-card p-4">
                    <h2 className="mb-2 font-semibold">Accounts</h2>
                    <ul className="divide-y md:hidden">
                        {others.map((u) => (
                            <li key={u.id} className="space-y-2 py-3">
                                <div className="flex items-start justify-between gap-2">
                                    <PersonCell u={u} self={u.id === auth.user.id} />
                                    {STATUS_BADGE[u.status]}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                    {u.role === 'admin' ? 'Admin' : 'User'} · Last sign-in {u.last_login_at ? fmtDate(u.last_login_at) : 'never'}
                                </div>
                                {u.id !== auth.user.id && actions(u, 'sm')}
                            </li>
                        ))}
                    </ul>
                    <table className="hidden w-full text-sm md:table">
                        <thead className="text-left text-muted-foreground">
                            <tr className="border-b">
                                <th className="py-2 pr-3 font-medium">Name</th>
                                <th className="py-2 pr-3 font-medium">Role</th>
                                <th className="py-2 pr-3 font-medium">Status</th>
                                <th className="py-2 pr-3 font-medium">Last sign-in</th>
                                <th className="py-2 text-right font-medium">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {others.map((u) => (
                                <tr key={u.id} className="border-b last:border-0">
                                    <td className="py-2 pr-3"><PersonCell u={u} self={u.id === auth.user.id} /></td>
                                    <td className="py-2 pr-3">{u.role === 'admin' ? 'Admin' : 'User'}</td>
                                    <td className="py-2 pr-3">{STATUS_BADGE[u.status]}</td>
                                    <td className="py-2 pr-3 text-muted-foreground">{u.last_login_at ? fmtDate(u.last_login_at) : 'Never'}</td>
                                    <td className="py-2">
                                        <div className="flex justify-end">{u.id !== auth.user.id && actions(u, 'xs')}</div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </section>
            </div>
        </>
    );
}

function PersonCell({ u, self }: { u: Person; self?: boolean }) {
    return (
        <div className="flex min-w-0 items-center gap-3">
            {u.avatar ? (
                <img src={u.avatar} alt="" referrerPolicy="no-referrer" className="size-8 rounded-full" />
            ) : (
                <div className="grid size-8 place-items-center rounded-full bg-secondary text-sm font-medium">{u.name[0]}</div>
            )}
            <div className="min-w-0">
                <div className="truncate font-medium">
                    {u.name} {self && <span className="text-muted-foreground">(you)</span>}
                </div>
                <div className="truncate text-xs text-muted-foreground">{u.email}</div>
            </div>
        </div>
    );
}

function PreApprove() {
    const form = useForm({ name: '', email: '', role: 'user' });
    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(store.url(), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 font-semibold"><UserPlus className="size-4" /> Pre-approve someone</h2>
            <p className="text-sm text-muted-foreground">Add a Google email so the person gets straight in on their first sign-in.</p>
            <form onSubmit={submit} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto] sm:items-end">
                <div className="grid gap-2">
                    <Label htmlFor="pa-name">Name</Label>
                    <Input id="pa-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} required />
                    <InputError message={form.errors.name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="pa-email">Google email</Label>
                    <Input id="pa-email" type="email" value={form.data.email} onChange={(e) => form.setData('email', e.target.value)} required />
                    <InputError message={form.errors.email} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="pa-role">Role</Label>
                    <select id="pa-role" className={selectClass} value={form.data.role} onChange={(e) => form.setData('role', e.target.value)}>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
                <Button type="submit" disabled={form.processing} className="w-full sm:w-auto">Add</Button>
            </form>
        </section>
    );
}

People.layout = { breadcrumbs: [{ title: 'People', href: index() }] };
