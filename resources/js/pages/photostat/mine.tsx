import { Head, router } from '@inertiajs/react';
import { RecordsList, StatCards } from '@/components/photostat/parts';
import { Input } from '@/components/ui/input';
import { fmtNum, monthLabel } from '@/lib/photostat';
import type { PhotostatRecord } from '@/lib/photostat';
import { index, mine } from '@/routes/photostat';

export default function MyRecords({ month, records }: { month: string; records: PhotostatRecord[] }) {
    return (
        <>
            <Head title="My records" />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-semibold">My records</h1>
                        <p className="text-sm text-muted-foreground">{monthLabel(month)}</p>
                    </div>
                    <Input
                        type="month"
                        value={month}
                        onChange={(e) => e.target.value && router.get(mine.url({ query: { month: e.target.value } }), {}, { preserveState: true })}
                        className="w-40 sm:w-44"
                    />
                </div>
                <StatCards records={records} />
                <div className="rounded-xl border bg-card p-4">
                    <h2 className="mb-3 font-semibold">
                        {fmtNum(records.length)} record{records.length === 1 ? '' : 's'}
                    </h2>
                    <RecordsList records={records} showMachine showUser={false} />
                </div>
            </div>
        </>
    );
}

MyRecords.layout = {
    breadcrumbs: [
        { title: 'Photostat', href: index() },
        { title: 'My records', href: mine() },
    ],
};
