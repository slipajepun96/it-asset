import { Head, Link } from '@inertiajs/react';
import {
    AlertTriangle,
    Banknote,
    Boxes,
    FileWarning,
    MapPinOff,
    Wrench,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { label } from '@/lib/asset-ui';
import { dashboard } from '@/routes';
import { index as assetsIndex, show } from '@/routes/assets';

type Bar = { label: string; count: number; value?: number };

type Props = {
    stats: {
        total_assets: number;
        current_value: number;
        in_repair: number;
        open_problems_30d: number;
        maintenance_cost_year: number;
        missing_invoice: number;
        unassigned_location: number;
    };
    by_status: Bar[];
    by_location: Bar[];
    by_category: Bar[];
    recent_logs: {
        id: number;
        asset_id: string;
        asset: string | null;
        type: string;
        description: string;
        user: string | null;
        logged_at: string;
    }[];
};

const money = (n: number) =>
    n.toLocaleString(undefined, { style: 'currency', currency: 'MYR', maximumFractionDigits: 0 });

export default function Dashboard({ stats, by_status, by_location, by_category, recent_logs }: Props) {
    return (
        <>
            <Head title="Dashboard" />
            <div className="space-y-6 p-4">
                <h1 className="text-xl font-semibold">Dashboard</h1>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <Stat icon={Boxes} title="Total assets" value={stats.total_assets.toLocaleString()} href={assetsIndex.url()} />
                    <Stat icon={Banknote} title="Current asset value" value={money(stats.current_value)} hint="Purchase price of assets not retired or lost" />
                    <Stat icon={Wrench} title="In repair" value={stats.in_repair} href={assetsIndex.url({ query: { status: 'in_repair' } })} />
                    <Stat icon={AlertTriangle} title="Problems (30 days)" value={stats.open_problems_30d} />
                    <Stat icon={Wrench} title="Maintenance spend (this year)" value={money(stats.maintenance_cost_year)} hint="Maintenance, service and component swaps" />
                    <Stat icon={FileWarning} title="Missing invoice" value={stats.missing_invoice} />
                    <Stat icon={MapPinOff} title="No location set" value={stats.unassigned_location} />
                </div>

                <div className="grid gap-4 lg:grid-cols-3">
                    <Panel title="By status">
                        <Bars rows={by_status.map((r) => ({ ...r, label: label(r.label) }))} />
                    </Panel>
                    <Panel title="By location">
                        <Bars rows={by_location} showValue />
                    </Panel>
                    <Panel title="By category">
                        <Bars rows={by_category} />
                    </Panel>
                </div>

                <Panel title="Recent activity">
                    {recent_logs.length === 0 && (
                        <p className="text-muted-foreground text-sm">No activity yet.</p>
                    )}
                    <ul className="divide-y">
                        {recent_logs.map((l) => (
                            <li key={l.id} className="flex flex-wrap items-center gap-2 py-2 text-sm">
                                <Badge variant="outline">{label(l.type)}</Badge>
                                <Link href={show(l.asset_id)} className="font-medium hover:underline">
                                    {l.asset ?? 'Deleted asset'}
                                </Link>
                                <span className="text-muted-foreground min-w-0 flex-1 truncate">
                                    {l.description}
                                </span>
                                <span className="text-muted-foreground text-xs">
                                    {l.user && `${l.user} · `}
                                    {new Date(l.logged_at).toLocaleDateString()}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Panel>
            </div>
        </>
    );
}

function Stat({
    icon: Icon,
    title,
    value,
    hint,
    href,
}: {
    icon: LucideIcon;
    title: string;
    value: string | number;
    hint?: string;
    href?: string;
}) {
    const body = (
        <div className="bg-card h-full rounded-xl border p-4">
            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                <Icon className="size-4" /> {title}
            </div>
            <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
            {hint && <div className="text-muted-foreground mt-1 text-xs">{hint}</div>}
        </div>
    );

    return href ? (
        <Link href={href} className="hover:[&>div]:border-primary">
            {body}
        </Link>
    ) : (
        body
    );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="bg-card rounded-xl border p-4">
            <h2 className="mb-3 font-medium">{title}</h2>
            {children}
        </section>
    );
}

function Bars({ rows, showValue = false }: { rows: Bar[]; showValue?: boolean }) {
    const max = Math.max(1, ...rows.map((r) => r.count));

    if (rows.length === 0) {
        return <p className="text-muted-foreground text-sm">No data yet.</p>;
    }

    return (
        <ul className="space-y-3">
            {rows.map((r) => (
                <li key={r.label} className="text-sm">
                    <div className="flex justify-between gap-2">
                        <span className="truncate">{r.label}</span>
                        <span className="text-muted-foreground">
                            {r.count}
                            {showValue && r.value ? ` · ${money(r.value)}` : ''}
                        </span>
                    </div>
                    <div className="bg-muted mt-1 h-2 rounded-full">
                        <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${(r.count / max) * 100}%` }}
                        />
                    </div>
                </li>
            ))}
        </ul>
    );
}

Dashboard.layout = { breadcrumbs: [{ title: 'Dashboard', href: dashboard() }] };
