import { Head, Link, router, useForm } from '@inertiajs/react';
import { Gauge, Pencil, Plus, QrCode, Undo2 } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useConfirm } from '@/components/confirm-provider';
import InputError from '@/components/input-error';
import { Diff } from '@/components/photostat/parts';
import {
    ResponsiveDialog,
    ResponsiveDialogBody,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
    useIsDrawer,
} from '@/components/responsive-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { selectClass } from '@/lib/asset-ui';
import { digits, fmtDateTime, fmtNum } from '@/lib/photostat';
import type { AdminMachine, MeterReading } from '@/lib/photostat';
import { show as showAsset } from '@/routes/assets';
import { index, qr as newQr, store, update } from '@/routes/photostat/admin/machines';
import { destroy as undoReading, store as storeReading } from '@/routes/photostat/admin/readings';

type AssetOption = { id: string; name: string; asset_number: string | null };
type Props = { machines: AdminMachine[]; readings: MeterReading[]; assets: AssetOption[] };

export default function Machines({ machines, readings, assets }: Props) {
    const [editing, setEditing] = useState<AdminMachine | 'new' | null>(null);
    const [reading, setReading] = useState<AdminMachine | null>(null);
    const qr = useQrPosters();

    return (
        <>
            <Head title="Photostat machine" />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">Photostat machine</h1>
                        <p className="text-sm text-muted-foreground">
                            Counts shown are what the app has counted since the last meter reading.
                        </p>
                    </div>
                    {machines.length === 0 && (
                        <Button className="w-full sm:w-auto" onClick={() => setEditing('new')}>
                            <Plus /> Set up machine
                        </Button>
                    )}
                </div>

                <section className="rounded-xl border bg-card p-4">
                    {machines.length === 0 ? (
                        <p className="py-6 text-center text-sm text-muted-foreground">The machine isn't set up yet.</p>
                    ) : (
                        <>
                            <ul className="-my-2 divide-y md:hidden">
                                {machines.map((m) => (
                                    <li key={m.id} className="flex items-center gap-1">
                                        <button type="button" onClick={() => setEditing(m)}
                                            className={`flex min-w-0 flex-1 items-center gap-3 py-3 text-left ${m.active ? '' : 'opacity-60'}`}>
                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium wrap-break-word">
                                                    {m.name} {!m.active && <Badge variant="secondary">Hidden</Badge>}
                                                </div>
                                                {m.location && <div className="text-xs wrap-break-word text-muted-foreground">{m.location}</div>}
                                                <div className="mt-1 flex gap-4 text-sm tabular-nums">
                                                    <span><span className="text-xs text-muted-foreground">B&amp;W</span> <b className="font-mono">{fmtNum(m.bw_counter)}</b></span>
                                                    <span><span className="text-xs text-muted-foreground">Colour</span> <b className="font-mono">{fmtNum(m.color_counter)}</b></span>
                                                </div>
                                            </div>
                                            <Pencil className="size-4 shrink-0 text-muted-foreground" />
                                        </button>
                                        <Button variant="ghost" size="icon" onClick={() => setReading(m)} aria-label={`Meter reading for ${m.name}`}><Gauge /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => qr.download([m])} disabled={qr.busy} aria-label={`QR poster for ${m.name}`}><QrCode /></Button>
                                    </li>
                                ))}
                            </ul>
                            <table className="hidden w-full text-sm md:table">
                                <thead className="text-left text-muted-foreground">
                                    <tr className="border-b">
                                        <th className="py-2 pr-3 font-medium">Name</th>
                                        <th className="py-2 pr-3 font-medium">Asset</th>
                                        <th className="py-2 pr-3 text-right font-medium">B&amp;W count</th>
                                        <th className="py-2 pr-3 text-right font-medium">Colour count</th>
                                        <th className="py-2 pr-3 font-medium">Updated</th>
                                        <th />
                                    </tr>
                                </thead>
                                <tbody>
                                    {machines.map((m) => (
                                        <tr key={m.id} className={`border-b last:border-0 ${m.active ? '' : 'opacity-60'}`}>
                                            <td className="py-2 pr-3">
                                                <div className="font-medium">{m.name} {!m.active && <Badge variant="secondary">Hidden</Badge>}</div>
                                                {m.location && <div className="text-xs text-muted-foreground">{m.location}</div>}
                                            </td>
                                            <td className="py-2 pr-3">
                                                {m.asset ? (
                                                    <Link href={showAsset(m.asset.id)} className="underline-offset-4 hover:underline">
                                                        {m.asset.asset_number ?? m.asset.name}
                                                    </Link>
                                                ) : (
                                                    <span className="text-muted-foreground">–</span>
                                                )}
                                            </td>
                                            <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtNum(m.bw_counter)}</td>
                                            <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtNum(m.color_counter)}</td>
                                            <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{fmtDateTime(m.updated_at)}</td>
                                            <td className="py-2 text-right whitespace-nowrap">
                                                <Button variant="outline" size="sm" onClick={() => setReading(m)}><Gauge /> Meter reading</Button>
                                                <Button variant="ghost" size="icon-sm" onClick={() => qr.download([m])} disabled={qr.busy} title="QR poster" aria-label={`QR poster for ${m.name}`}><QrCode /></Button>
                                                <Button variant="ghost" size="icon-sm" onClick={() => setEditing(m)} title="Edit" aria-label={`Edit ${m.name}`}><Pencil /></Button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </>
                    )}
                </section>

                {machines.length > 0 && <Readings readings={readings} />}
                {machines.length > 0 && <QrPosterCard qr={qr} machines={machines.filter((m) => m.active)} />}
            </div>

            <ResponsiveDialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
                <ResponsiveDialogContent className="sm:max-w-lg">
                    {editing !== null && (
                        <MachineForm key={editing === 'new' ? 'new' : editing.id} machine={editing === 'new' ? null : editing}
                            assets={assets} machines={machines} onClose={() => setEditing(null)} />
                    )}
                </ResponsiveDialogContent>
            </ResponsiveDialog>

            <ResponsiveDialog open={reading !== null} onOpenChange={(o) => !o && setReading(null)}>
                <ResponsiveDialogContent className="sm:max-w-md">
                    {reading && <ReadingForm key={reading.id} machine={reading} onClose={() => setReading(null)} />}
                </ResponsiveDialogContent>
            </ResponsiveDialog>
        </>
    );
}

function MachineForm({ machine, assets, machines, onClose }: { machine: AdminMachine | null; assets: AssetOption[]; machines: AdminMachine[]; onClose: () => void }) {
    const drawer = useIsDrawer();
    const confirm = useConfirm();
    const form = useForm({
        name: machine?.name ?? '',
        location: machine?.location ?? '',
        asset_id: machine?.asset_id ?? '',
        active: machine?.active ?? true,
        bw_counter: '',
        color_counter: '',
    });
    // An asset can belong to one machine only.
    const takenAssets = new Set(machines.filter((m) => m.id !== machine?.id && m.asset_id).map((m) => m.asset_id));

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.transform((d) => ({
            ...d,
            asset_id: d.asset_id || null,
            bw_counter: Number(d.bw_counter || 0),
            color_counter: Number(d.color_counter || 0),
        }));
        const options = { preserveScroll: true, onSuccess: onClose };
        if (machine) {
            form.put(update.url(machine.id), options);
        } else {
            form.post(store.url(), options);
        }
    };

    // Close the form first so the confirmation isn't stacked on top of it.
    const replaceQr = async () => {
        if (!machine) return;
        onClose();
        const ok = await confirm({
            title: `New QR code for ${machine.name}?`,
            description: 'Posters printed before will stop working. Print and put up the new poster afterwards.',
            action: 'Make new QR code',
            destructive: true,
        });
        if (ok) router.post(newQr.url(machine.id), {}, { preserveScroll: true });
    };

    return (
        <form className="contents" onSubmit={submit}>
            <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>{machine ? `Edit ${machine.name}` : 'Set up machine'}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                    {machine ? 'Change the name, location, linked asset or who can see it.' : 'Enter the meter readings shown on the machine right now.'}
                </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
                <div className="grid gap-2">
                    <Label htmlFor="m-name">Name</Label>
                    {/* No autofocus on phones: it would open the keyboard over the form. */}
                    <Input id="m-name" value={form.data.name} onChange={(e) => form.setData('name', e.target.value)}
                        placeholder="e.g. Canon iR-ADV C3530" required autoFocus={!drawer && !machine} />
                    <InputError message={form.errors.name} />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="m-loc">Location <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input id="m-loc" value={form.data.location} onChange={(e) => form.setData('location', e.target.value)} placeholder="e.g. Level 2, admin office" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="m-asset">Asset <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <select id="m-asset" className={selectClass} value={form.data.asset_id} onChange={(e) => form.setData('asset_id', e.target.value)}>
                        <option value="">Not linked</option>
                        {assets.map((a) => (
                            <option key={a.id} value={a.id} disabled={takenAssets.has(a.id)}>
                                {a.asset_number ? `${a.asset_number} · ${a.name}` : a.name}
                                {takenAssets.has(a.id) ? ' (linked to another machine)' : ''}
                            </option>
                        ))}
                    </select>
                    <InputError message={form.errors.asset_id} />
                </div>
                {machine ? (
                    <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
                        Counted now: B&amp;W <b className="font-mono text-foreground">{fmtNum(machine.bw_counter)}</b>, colour{' '}
                        <b className="font-mono text-foreground">{fmtNum(machine.color_counter)}</b>. To correct these, take a{' '}
                        <b className="text-foreground">meter reading</b>, so the difference is kept on record.
                    </p>
                ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-2">
                            <Label htmlFor="m-bw">B&amp;W meter</Label>
                            <Input id="m-bw" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" className="font-mono" value={form.data.bw_counter}
                                onChange={(e) => form.setData('bw_counter', digits(e.target.value, 9))} />
                            <InputError message={form.errors.bw_counter} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="m-color">Colour meter</Label>
                            <Input id="m-color" type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="0" className="font-mono" value={form.data.color_counter}
                                onChange={(e) => form.setData('color_counter', digits(e.target.value, 9))} />
                            <InputError message={form.errors.color_counter} />
                        </div>
                    </div>
                )}
                <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" className="size-4 accent-green-700" checked={form.data.active}
                        onChange={(e) => form.setData('active', e.target.checked)} />
                    Show this machine to users
                </label>
                {machine && (
                    <div className="flex flex-wrap gap-x-4">
                        <Button type="button" variant="ghost" size="sm" className="px-0 hover:bg-transparent hover:underline" onClick={replaceQr}>
                            <QrCode /> New QR code
                        </Button>
                    </div>
                )}
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={form.processing}>{form.processing ? 'Saving…' : 'Save'}</Button>
            </ResponsiveDialogFooter>
        </form>
    );
}

/** The admin types the numbers on the machine's meter; the difference shows before saving. */
function ReadingForm({ machine, onClose }: { machine: AdminMachine; onClose: () => void }) {
    const form = useForm({ bw_reading: '', color_reading: '', note: '' });
    const filled = form.data.bw_reading !== '' && form.data.color_reading !== '';

    const submit = (e: FormEvent) => {
        e.preventDefault();
        form.post(storeReading.url(machine.id), { preserveScroll: true, onSuccess: onClose });
    };

    const row = (label: string, key: 'bw_reading' | 'color_reading', counted: number) => (
        <div className="grid gap-2 rounded-lg border p-3">
            <div className="flex items-baseline justify-between gap-2">
                <Label htmlFor={`rd-${key}`}>{label}</Label>
                <span className="text-xs text-muted-foreground">
                    App counted <b className="font-mono text-foreground">{fmtNum(counted)}</b>
                </span>
            </div>
            <Input id={`rd-${key}`} type="text" inputMode="numeric" pattern="[0-9]*" autoComplete="off" placeholder="Number on the machine" className="h-11 font-mono text-lg"
                value={form.data[key]} onChange={(e) => form.setData(key, digits(e.target.value, 9))} />
            {form.data[key] !== '' && <Diff value={Number(form.data[key]) - counted} className="justify-self-start" />}
            <InputError message={form.errors[key]} />
        </div>
    );

    return (
        <form className="contents" onSubmit={submit}>
            <ResponsiveDialogHeader>
                <ResponsiveDialogTitle>Meter reading: {machine.name}</ResponsiveDialogTitle>
                <ResponsiveDialogDescription>
                    Type the numbers shown on the machine's meter. The app compares them with what people recorded, then counts on from them.
                </ResponsiveDialogDescription>
            </ResponsiveDialogHeader>
            <ResponsiveDialogBody>
                {row('Black & white', 'bw_reading', machine.bw_counter)}
                {row('Colour', 'color_reading', machine.color_counter)}
                <div className="grid gap-2">
                    <Label htmlFor="rd-note">Note <span className="font-normal text-muted-foreground">(optional)</span></Label>
                    <Input id="rd-note" maxLength={200} placeholder="e.g. End of month check" value={form.data.note}
                        onChange={(e) => form.setData('note', e.target.value)} />
                </div>
            </ResponsiveDialogBody>
            <ResponsiveDialogFooter>
                <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                <Button type="submit" disabled={form.processing || !filled}>{form.processing ? 'Saving…' : 'Save reading'}</Button>
            </ResponsiveDialogFooter>
        </form>
    );
}

function Readings({ readings }: { readings: MeterReading[] }) {
    const confirm = useConfirm();

    const undo = async (r: MeterReading) => {
        const ok = await confirm({
            title: 'Undo this reading?',
            description: `${r.machine_name}, ${fmtDateTime(r.created_at)}.\nThe machine goes back to the numbers the app had counted, plus anything recorded since.`,
            action: 'Undo reading',
            destructive: true,
        });
        if (ok) router.delete(undoReading.url(r.id), { preserveScroll: true });
    };

    const undoButton = (r: MeterReading) =>
        r.latest && !r.initial ? (
            <Button variant="ghost" size="icon-sm" onClick={() => undo(r)} aria-label="Undo reading" title="Undo reading"><Undo2 /></Button>
        ) : null;

    return (
        <section className="rounded-xl border bg-card p-4">
            <h2 className="flex items-center gap-2 font-semibold"><Gauge className="size-4" /> Meter readings</h2>
            <p className="mb-3 text-sm text-muted-foreground">
                Each reading compares the machine's real meter with what people recorded. "Not recorded" means pages were printed that nobody logged.
            </p>
            {readings.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">No readings yet.</p>
            ) : (
                <>
                    <ul className="-my-2 divide-y md:hidden">
                        {readings.map((r) => (
                            <li key={r.id} className="flex items-start gap-2 py-3">
                                <div className="min-w-0 flex-1 space-y-1">
                                    <div className="text-sm font-medium wrap-break-word">{r.machine_name}</div>
                                    <div className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)} · {r.created_by_name}</div>
                                    {r.initial ? (
                                        <div className="text-sm">
                                            Starting reading: B&amp;W <b className="font-mono">{fmtNum(r.bw_reading)}</b>, colour <b className="font-mono">{fmtNum(r.color_reading)}</b>
                                        </div>
                                    ) : (
                                        <div className="grid gap-1 text-sm">
                                            <div className="flex flex-wrap items-center gap-2">B&amp;W <b className="font-mono">{fmtNum(r.bw_reading)}</b> <Diff value={r.bw_diff} /></div>
                                            <div className="flex flex-wrap items-center gap-2">Colour <b className="font-mono">{fmtNum(r.color_reading)}</b> <Diff value={r.color_diff} /></div>
                                        </div>
                                    )}
                                    {r.note && !r.initial && <div className="text-xs wrap-break-word text-muted-foreground">{r.note}</div>}
                                </div>
                                {undoButton(r)}
                            </li>
                        ))}
                    </ul>
                    <table className="hidden w-full text-sm md:table">
                        <thead className="text-left text-muted-foreground">
                            <tr className="border-b">
                                <th className="py-2 pr-3 font-medium">When</th>
                                <th className="py-2 pr-3 font-medium">Machine</th>
                                <th className="py-2 pr-3 text-right font-medium">B&amp;W meter</th>
                                <th className="py-2 pr-3 font-medium">B&amp;W difference</th>
                                <th className="py-2 pr-3 text-right font-medium">Colour meter</th>
                                <th className="py-2 pr-3 font-medium">Colour difference</th>
                                <th className="py-2 pr-3 font-medium">By</th>
                                <th className="w-10" />
                            </tr>
                        </thead>
                        <tbody>
                            {readings.map((r) => (
                                <tr key={r.id} className="border-b last:border-0">
                                    <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                                    <td className="py-2 pr-3">
                                        {r.machine_name}
                                        {r.note && <div className="max-w-48 text-xs wrap-break-word text-muted-foreground">{r.note}</div>}
                                    </td>
                                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtNum(r.bw_reading)}</td>
                                    <td className="py-2 pr-3">{r.initial ? <span className="text-muted-foreground">–</span> : <Diff value={r.bw_diff} />}</td>
                                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtNum(r.color_reading)}</td>
                                    <td className="py-2 pr-3">{r.initial ? <span className="text-muted-foreground">–</span> : <Diff value={r.color_diff} />}</td>
                                    <td className="py-2 pr-3 text-muted-foreground">{r.created_by_name}</td>
                                    <td>{undoButton(r)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </section>
    );
}

const QR_BASE_KEY = 'photostat.qrBase';
const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:|\/|$)/i.test(url);

/** The address printed in the QR codes: this site by default. Phones can't open "localhost", so it can be changed. */
function useQrPosters() {
    const confirm = useConfirm();
    const [base, setBaseState] = useState(() => {
        try {
            return localStorage.getItem(QR_BASE_KEY) || window.location.origin;
        } catch {
            return window.location.origin;
        }
    });
    const [busy, setBusy] = useState(false);
    const setBase = (v: string) => {
        setBaseState(v);
        try {
            localStorage.setItem(QR_BASE_KEY, v);
        } catch {
            // Private browsing: just not remembered.
        }
    };
    const valid = /^https?:\/\/[^\s/]+(\/\S*)?$/i.test(base.trim());

    const download = async (list: AdminMachine[]) => {
        if (!valid) {
            await confirm({ title: 'App address needed', description: 'Enter the app address for the QR codes first, e.g. https://assets.example.com', cancel: false });
            return;
        }
        setBusy(true);
        try {
            const { downloadQrPosters } = await import('@/lib/qr-poster');
            await downloadQrPosters(list, { base: base.trim() });
        } catch (err) {
            await confirm({ title: 'Could not make the poster', description: (err as Error).message, cancel: false });
        } finally {
            setBusy(false);
        }
    };

    return { base, setBase, valid, busy, download };
}

function QrPosterCard({ qr, machines }: { qr: ReturnType<typeof useQrPosters>; machines: AdminMachine[] }) {
    return (
        <section className="grid gap-3 rounded-xl border bg-card p-4">
            <div>
                <h2 className="flex items-center gap-2 font-semibold"><QrCode className="size-4" /> QR code posters</h2>
                <p className="text-sm text-muted-foreground">
                    Print an A4 poster to put up by the machine. Scanning it lets anyone record prints with just their name, no sign-in.
                    If the link gets shared around, make a new QR code from the machine's edit form.
                </p>
            </div>
            <div className="grid gap-2">
                <Label htmlFor="qr-base">App address in the QR codes</Label>
                <Input id="qr-base" inputMode="url" value={qr.base} onChange={(e) => qr.setBase(e.target.value)} placeholder="https://assets.example.com" />
                {isLocal(qr.base) && (
                    <p className="text-sm">
                        <b className="text-destructive">Phones can't open "localhost".</b>{' '}
                        <span className="text-muted-foreground">Put the app's live address here before printing.</span>
                    </p>
                )}
            </div>
            <Button className="w-full sm:w-fit" onClick={() => qr.download(machines)} disabled={qr.busy || !machines.length || !qr.valid}>
                <QrCode /> {qr.busy ? 'Making poster…' : 'Download QR poster'}
            </Button>
        </section>
    );
}

Machines.layout = { breadcrumbs: [{ title: 'Photostat machine', href: index() }] };
