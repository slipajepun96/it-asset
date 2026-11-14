import { Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fmtDateTime, fmtNum, totals } from '@/lib/photostat';
import type { PhotostatRecord } from '@/lib/photostat';
import { cn } from '@/lib/utils';

/** Real meter minus the app's count: positive = pages nobody recorded, negative = recorded but not printed. */
export function Diff({ value, className }: { value: number; className?: string }) {
    if (value === 0) {
        return <Badge className={cn('bg-green-700 text-white', className)}>Matches</Badge>;
    }

    return value > 0 ? (
        <Badge className={cn('bg-amber-400 text-black tabular-nums', className)} title="Printed but not recorded">
            +{fmtNum(value)} not recorded
        </Badge>
    ) : (
        <Badge variant="destructive" className={cn('tabular-nums', className)} title="Recorded more than the meter shows">
            {fmtNum(-value)} over-recorded
        </Badge>
    );
}

/** The app's count for a machine. B&W has a dark strip, colour a colour strip, so they're easy to tell apart. */
export function Meter({ kind, value, label }: { kind: 'bw' | 'color'; value: number; label?: string }) {
    return (
        <div className="relative overflow-hidden rounded-lg border bg-card p-3">
            <div
                className={cn(
                    'absolute inset-x-0 top-0 h-1',
                    kind === 'color' ? 'bg-gradient-to-r from-cyan-500 via-fuchsia-500 to-yellow-400' : 'bg-neutral-800 dark:bg-neutral-300',
                )}
            />
            <div className="text-xs font-medium text-muted-foreground">{label ?? (kind === 'color' ? 'Colour count' : 'B&W count')}</div>
            <div className="font-mono text-2xl font-semibold tabular-nums">{fmtNum(value)}</div>
        </div>
    );
}

export function StatCards({ records }: { records: PhotostatRecord[] }) {
    const t = totals(records);
    const stats: [string, number][] = [
        ['B&W pages', t.bw],
        ['Colour pages', t.color],
        ['Records', t.count],
    ];

    return (
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {stats.map(([label, value]) => (
                <div key={label} className="rounded-xl border bg-card p-3 sm:p-4">
                    <div className="truncate text-xs text-muted-foreground">{label}</div>
                    <div className="truncate text-lg font-semibold tabular-nums sm:text-2xl">{fmtNum(value)}</div>
                </div>
            ))}
        </div>
    );
}

/** Phones get a compact list; wider screens a table. */
export function RecordsList({
    records,
    showMachine = false,
    showUser = true,
    meId,
    onDelete,
}: {
    records: PhotostatRecord[];
    showMachine?: boolean;
    showUser?: boolean;
    meId?: number;
    onDelete?: (r: PhotostatRecord) => void;
}) {
    if (!records.length) {
        return <p className="py-6 text-center text-sm text-muted-foreground">No records yet.</p>;
    }

    const who = (r: PhotostatRecord) => (r.user_id && r.user_id === meId ? 'You' : r.user_name);
    // Recorded from a QR poster without signing in: the name was typed, not checked.
    const qrBadge = (r: PhotostatRecord) =>
        r.source === 'qr' && !r.user_id ? (
            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-[10px]" title="Recorded by QR code without signing in">
                QR
            </Badge>
        ) : null;
    const del = (r: PhotostatRecord) =>
        onDelete && (
            <Button variant="ghost" size="icon-sm" onClick={() => onDelete(r)} aria-label="Delete record" title="Delete record">
                <Trash2 className="text-destructive" />
            </Button>
        );

    return (
        <>
            <ul className="-my-2 divide-y md:hidden">
                {records.map((r) => (
                    <li key={r.id} className="flex items-center gap-3 py-2.5">
                        <div className="min-w-0 flex-1">
                            {(showUser || showMachine) && (
                                <div className="truncate text-sm font-medium">
                                    {[showUser && who(r), showMachine && r.machine_name].filter(Boolean).join(' · ')}
                                    {showUser && qrBadge(r)}
                                </div>
                            )}
                            <div className="text-xs text-muted-foreground">{fmtDateTime(r.created_at)}</div>
                            {r.purpose && <div className="truncate text-xs text-muted-foreground">{r.purpose}</div>}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1 text-sm tabular-nums">
                            {r.bw > 0 && (
                                <span>
                                    <span className="text-xs text-muted-foreground">B&amp;W</span> <b>{fmtNum(r.bw)}</b>
                                </span>
                            )}
                            {r.color > 0 && (
                                <span>
                                    <span className="text-xs text-muted-foreground">Colour</span> <b>{fmtNum(r.color)}</b>
                                </span>
                            )}
                        </div>
                        {del(r)}
                    </li>
                ))}
            </ul>

            <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-sm">
                    <thead className="text-left text-muted-foreground">
                        <tr className="border-b">
                            <th className="py-2 pr-3 font-medium">When</th>
                            {showMachine && <th className="py-2 pr-3 font-medium">Machine</th>}
                            {showUser && <th className="py-2 pr-3 font-medium">Who</th>}
                            <th className="py-2 pr-3 text-right font-medium">B&amp;W</th>
                            <th className="py-2 pr-3 text-right font-medium">Colour</th>
                            <th className="py-2 pr-3 font-medium">Purpose</th>
                            {onDelete && <th className="w-10" />}
                        </tr>
                    </thead>
                    <tbody>
                        {records.map((r) => (
                            <tr key={r.id} className="border-b last:border-0">
                                <td className="py-2 pr-3 whitespace-nowrap">{fmtDateTime(r.created_at)}</td>
                                {showMachine && <td className="py-2 pr-3">{r.machine_name}</td>}
                                {showUser && (
                                    <td className="py-2 pr-3">
                                        {who(r)}
                                        {qrBadge(r)}
                                    </td>
                                )}
                                <td className="py-2 pr-3 text-right tabular-nums">{r.bw ? fmtNum(r.bw) : '–'}</td>
                                <td className="py-2 pr-3 text-right tabular-nums">{r.color ? fmtNum(r.color) : '–'}</td>
                                <td className="max-w-64 truncate py-2 pr-3 text-muted-foreground" title={r.purpose}>
                                    {r.purpose}
                                </td>
                                {onDelete && <td>{del(r)}</td>}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}
