import { Head, Link, useForm, usePage } from '@inertiajs/react';
import { History, MapPin } from 'lucide-react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Meter, RecordsList } from '@/components/photostat/parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { digits, fmtNum } from '@/lib/photostat';
import type { Machine, PhotostatRecord } from '@/lib/photostat';
import { index, mine } from '@/routes/photostat';
import { store } from '@/routes/photostat/records';

export default function PhotostatMachine({ machine, recent }: { machine: Machine; recent: PhotostatRecord[] }) {
    const { auth } = usePage<{ auth: { user: { id: number } } }>().props;
    const form = useForm({ bw: '', color: '', purpose: '' });
    const bw = Number(form.data.bw || 0);
    const color = Number(form.data.color || 0);

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({ ...d, bw, color }));
        form.post(store.url(machine.id), { preserveScroll: true, onSuccess: () => form.reset() });
    };

    return (
        <>
            <Head title={machine.name} />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">{machine.name}</h1>
                        {machine.location && (
                            <p className="flex items-center gap-1 text-sm text-muted-foreground">
                                <MapPin className="size-3.5" /> {machine.location}
                            </p>
                        )}
                    </div>
                    <Button variant="outline" asChild>
                        <Link href={mine()}>
                            <History /> My records
                        </Link>
                    </Button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                    <form onSubmit={submit} className="grid content-start gap-4 rounded-xl border bg-card p-4">
                        <div>
                            <h2 className="font-semibold">Record your prints</h2>
                            <p className="text-sm text-muted-foreground">Pages printed or copied on this machine.</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <Meter kind="bw" value={machine.bw_counter} />
                            <Meter kind="color" value={machine.color_counter} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="grid gap-2">
                                <Label htmlFor="bw">Black &amp; white</Label>
                                <Input id="bw" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" value={form.data.bw}
                                    onChange={(e) => form.setData('bw', digits(e.target.value, 6))} className="h-12 text-xl tabular-nums" />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="color">Colour</Label>
                                <Input id="color" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" value={form.data.color}
                                    onChange={(e) => form.setData('color', digits(e.target.value, 6))} className="h-12 text-xl tabular-nums" />
                            </div>
                        </div>
                        <InputError message={form.errors.bw ?? form.errors.color} />
                        <div className="grid gap-2">
                            <Label htmlFor="purpose">
                                Purpose <span className="font-normal text-muted-foreground">(optional)</span>
                            </Label>
                            <Input id="purpose" maxLength={200} placeholder="e.g. Meeting papers" value={form.data.purpose}
                                onChange={(e) => form.setData('purpose', e.target.value)} />
                        </div>
                        {bw + color > 0 && (
                            <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                                Count after saving: B&amp;W <b className="text-foreground tabular-nums">{fmtNum(machine.bw_counter + bw)}</b>, colour{' '}
                                <b className="text-foreground tabular-nums">{fmtNum(machine.color_counter + color)}</b>
                            </p>
                        )}
                        <Button type="submit" size="lg" className="h-12 text-base" disabled={form.processing || bw + color === 0}>
                            {form.processing ? 'Saving…' : 'Save record'}
                        </Button>
                    </form>

                    <div className="rounded-xl border bg-card p-4">
                        <h2 className="mb-3 font-semibold">Latest on this machine</h2>
                        <RecordsList records={recent} meId={auth.user.id} />
                    </div>
                </div>
            </div>
        </>
    );
}

PhotostatMachine.layout = { breadcrumbs: [{ title: 'Photostat', href: index() }] };
