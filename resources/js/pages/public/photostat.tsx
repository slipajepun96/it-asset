import { Head, useForm } from '@inertiajs/react';
import { CheckCircle2, MapPin, Printer } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import AppLogo from '@/components/app-logo';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { digits, fmtNum } from '@/lib/photostat';
import { store } from '@/routes/photostat/qr';

type Props = {
    token: string;
    machine: { name: string; location: string } | null;
    signedInAs: string | null;
    saved: { user_name: string; machine_name: string; bw: number; color: number } | null;
};

const NAME_KEY = 'photostat.name';

function rememberedName() {
    try {
        return localStorage.getItem(NAME_KEY) ?? '';
    } catch {
        return '';
    }
}

/** Opened from a machine's QR poster: record prints with just a name, no sign-in. */
export default function PublicPhotostat({ token, machine, signedInAs, saved }: Props) {
    const form = useForm({ name: rememberedName(), bw: '', color: '', purpose: '' });
    const [showSaved, setShowSaved] = useState(true);
    const bw = Number(form.data.bw || 0);
    const color = Number(form.data.color || 0);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, bw, color }));
        form.post(store.url(token), {
            preserveScroll: true,
            onSuccess: () => {
                if (!signedInAs) {
                    try {
                        localStorage.setItem(NAME_KEY, form.data.name.trim());
                    } catch {
                        // Not remembered in private browsing.
                    }
                }
                form.reset('bw', 'color', 'purpose');
                setShowSaved(true);
            },
        });
    };

    return (
        <>
            <Head title={machine ? `Record prints: ${machine.name}` : 'QR code not valid'} />
            <div className="min-h-svh bg-background">
                <header className="border-b px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
                    <div className="mx-auto flex max-w-md items-center gap-2">
                        <AppLogo />
                    </div>
                </header>

                <main className="mx-auto max-w-md space-y-4 p-3 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
                    {!machine ? (
                        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
                            This QR code is no longer valid. Ask the admin for a new poster.
                        </div>
                    ) : saved && showSaved ? (
                        <div className="grid justify-items-center gap-3 rounded-xl border bg-card p-6 text-center">
                            <CheckCircle2 className="size-12 text-green-700 dark:text-lime-400" />
                            <div>
                                <div className="text-lg font-semibold">Saved, thank you!</div>
                                <p className="text-sm text-muted-foreground">
                                    {saved.user_name} · {saved.machine_name}
                                </p>
                            </div>
                            <div className="flex gap-6 text-sm">
                                <span>
                                    <span className="text-muted-foreground">B&amp;W</span> <b className="text-lg tabular-nums">{fmtNum(saved.bw)}</b>
                                </span>
                                <span>
                                    <span className="text-muted-foreground">Colour</span> <b className="text-lg tabular-nums">{fmtNum(saved.color)}</b>
                                </span>
                            </div>
                            <Button variant="outline" className="mt-2 w-full" onClick={() => setShowSaved(false)}>
                                Record another
                            </Button>
                        </div>
                    ) : (
                        <form onSubmit={submit} className="grid gap-4 rounded-xl border bg-card p-4">
                            <div>
                                <h1 className="flex items-center gap-2 text-lg font-semibold">
                                    <Printer className="size-5 text-green-700 dark:text-lime-400" /> {machine.name}
                                </h1>
                                {machine.location && (
                                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                        <MapPin className="size-3.5" /> {machine.location}
                                    </p>
                                )}
                                <p className="text-sm text-muted-foreground">Record how many pages you printed or copied.</p>
                            </div>

                            {signedInAs ? (
                                <p className="rounded-md bg-muted px-3 py-2 text-sm">
                                    Recording as <b>{signedInAs}</b>
                                </p>
                            ) : (
                                <div className="grid gap-2">
                                    <Label htmlFor="name">Your name</Label>
                                    <Input id="name" autoComplete="name" autoCapitalize="words" maxLength={100} className="h-11"
                                        value={form.data.name} onChange={(e) => form.setData('name', e.target.value)} />
                                    <InputError message={form.errors.name} />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3">
                                <div className="grid gap-2">
                                    <Label htmlFor="bw">Black &amp; white</Label>
                                    <Input id="bw" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" className="h-12 text-xl tabular-nums"
                                        value={form.data.bw} onChange={(e) => form.setData('bw', digits(e.target.value, 6))} />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="color">Colour</Label>
                                    <Input id="color" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" className="h-12 text-xl tabular-nums"
                                        value={form.data.color} onChange={(e) => form.setData('color', digits(e.target.value, 6))} />
                                </div>
                            </div>
                            <InputError message={form.errors.bw ?? form.errors.color} />

                            <div className="grid gap-2">
                                <Label htmlFor="purpose">
                                    Purpose <span className="font-normal text-muted-foreground">(optional)</span>
                                </Label>
                                <Input id="purpose" maxLength={200} placeholder="e.g. Meeting papers"
                                    value={form.data.purpose} onChange={(e) => form.setData('purpose', e.target.value)} />
                            </div>

                            <Button type="submit" size="lg" className="h-12 text-base" disabled={form.processing || bw + color === 0}>
                                {form.processing ? 'Saving…' : 'Save record'}
                            </Button>
                        </form>
                    )}
                </main>
            </div>
        </>
    );
}
