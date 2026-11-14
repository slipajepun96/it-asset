import { Head, router, usePage } from '@inertiajs/react';
import { Download, FileText } from 'lucide-react';
import { useState } from 'react';
import { useConfirm } from '@/components/confirm-provider';
import { Diff, RecordsList, StatCards } from '@/components/photostat/parts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { selectClass } from '@/lib/asset-ui';
import { byPerson, fmtDateTime, fmtNum, monthLabel } from '@/lib/photostat';
import type { MeterReading, PhotostatRecord } from '@/lib/photostat';
import { report } from '@/routes/photostat/admin';
import { destroy as destroyRecord } from '@/routes/photostat/admin/records';

type Props = {
    month: string;
    machineId: number | null;
    machines: { id: number; name: string }[];
    records: PhotostatRecord[];
    checks: MeterReading[];
};

export default function Report({ month, machineId, machines, records, checks }: Props) {
    const { auth } = usePage<{ auth: { user: { id: number; name: string } } }>().props;
    const confirm = useConfirm();
    const [pdfBusy, setPdfBusy] = useState(false);
    const machineName = machines.find((m) => m.id === machineId)?.name ?? 'All machines';
    const people = byPerson(records);
    const unrecordedBw = checks.reduce((a, r) => a + r.bw_diff, 0);
    const unrecordedColor = checks.reduce((a, r) => a + r.color_diff, 0);

    const filter = (next: { month?: string; machine_id?: number | null }) => {
        const query = { month, machine_id: machineId, ...next };
        router.get(report.url({ query: { month: query.month, ...(query.machine_id ? { machine_id: query.machine_id } : {}) } }), {}, { preserveState: true });
    };

    const exportCsv = () => {
        const head = ['Date', 'Machine', 'Name', 'Via', 'B&W', 'Colour', 'B&W count before', 'Colour count before', 'Purpose'];
        const esc = (v: string | number) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = records.map((r) =>
            [new Date(r.created_at).toLocaleString('en-MY'), r.machine_name ?? '', r.user_name, r.source === 'qr' ? 'QR' : 'App', r.bw, r.color, r.bw_before, r.color_before, r.purpose]
                .map(esc)
                .join(','),
        );
        const blob = new Blob(['﻿' + [head.map(esc).join(','), ...lines].join('\r\n')], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `photostat-${month}.csv`;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    // jsPDF is only downloaded the first time someone makes a PDF.
    const exportPdf = async () => {
        setPdfBusy(true);
        try {
            const { downloadPhotostatPdf } = await import('@/lib/photostat-pdf');
            downloadPhotostatPdf({ records, readings: checks, month, machineName, generatedBy: auth.user.name });
        } catch (err) {
            await confirm({ title: 'Could not make the PDF', description: (err as Error).message, cancel: false });
        } finally {
            setPdfBusy(false);
        }
    };

    const remove = async (r: PhotostatRecord) => {
        const ok = await confirm({
            title: 'Delete this record?',
            description: `${r.user_name}: ${fmtNum(r.bw)} B&W, ${fmtNum(r.color)} colour on ${r.machine_name}.\nThe machine's count goes back down by the same amount.`,
            action: 'Delete',
            destructive: true,
        });
        if (ok) router.delete(destroyRecord.url(r.id), { preserveScroll: true });
    };

    return (
        <>
            <Head title="Photostat report" />
            <div className="space-y-4 p-4">
                <div>
                    <h1 className="text-xl font-semibold">Photostat report</h1>
                    <p className="text-sm text-muted-foreground">{monthLabel(month)} · {machineName}</p>
                </div>

                <div className="grid grid-cols-2 items-end gap-3 sm:flex sm:flex-wrap">
                    <div className="grid gap-2">
                        <Label htmlFor="r-month">Month</Label>
                        <Input id="r-month" type="month" value={month} className="sm:w-44"
                            onChange={(e) => e.target.value && filter({ month: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="r-machine">Machine</Label>
                        <select id="r-machine" className={`${selectClass} sm:w-56`} value={machineId ?? ''}
                            onChange={(e) => filter({ machine_id: e.target.value ? Number(e.target.value) : null })}>
                            <option value="">All machines</option>
                            {machines.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2 grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
                        <Button onClick={exportPdf} disabled={pdfBusy}><FileText /> {pdfBusy ? 'Making PDF…' : 'PDF report'}</Button>
                        <Button variant="outline" onClick={exportCsv} disabled={!records.length}><Download /> CSV</Button>
                    </div>
                </div>

                <StatCards records={records} />

                {checks.length > 0 && (
                    <section className="rounded-xl border bg-card p-4">
                        <h2 className="font-semibold">Meter checks</h2>
                        <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                            Total difference: B&amp;W <Diff value={unrecordedBw} /> Colour <Diff value={unrecordedColor} />
                        </div>
                        <ul className="mt-2 divide-y">
                            {checks.map((r) => (
                                <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
                                    <div className="min-w-0">
                                        <div className="font-medium">{r.machine_name}</div>
                                        <div className="text-xs text-muted-foreground">
                                            {fmtDateTime(r.created_at)} · {r.created_by_name}
                                            {r.note && ` · ${r.note}`}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <span className="flex items-center gap-1.5">B&amp;W <Diff value={r.bw_diff} /></span>
                                        <span className="flex items-center gap-1.5">Colour <Diff value={r.color_diff} /></span>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {people.length > 0 && (
                    <section className="rounded-xl border bg-card p-4">
                        <h2 className="mb-2 font-semibold">By person</h2>
                        <table className="w-full text-sm">
                            <thead className="text-left text-muted-foreground">
                                <tr className="border-b">
                                    <th className="py-2 pr-3 font-medium">Name</th>
                                    <th className="py-2 pr-3 text-right font-medium">Records</th>
                                    <th className="py-2 pr-3 text-right font-medium">B&amp;W</th>
                                    <th className="py-2 text-right font-medium">Colour</th>
                                </tr>
                            </thead>
                            <tbody>
                                {people.map((u) => (
                                    <tr key={u.name} className="border-b last:border-0">
                                        <td className="py-2 pr-3">{u.name}</td>
                                        <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(u.count)}</td>
                                        <td className="py-2 pr-3 text-right tabular-nums">{fmtNum(u.bw)}</td>
                                        <td className="py-2 text-right tabular-nums">{fmtNum(u.color)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                )}

                <section className="rounded-xl border bg-card p-4">
                    <h2 className="mb-3 font-semibold">All records</h2>
                    <RecordsList records={records} showMachine meId={auth.user.id} onDelete={remove} />
                </section>
            </div>
        </>
    );
}

Report.layout = { breadcrumbs: [{ title: 'Photostat report', href: report() }] };
