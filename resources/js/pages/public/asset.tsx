import { Head, Link, usePage } from '@inertiajs/react';
import { Download, LogIn, Pencil } from 'lucide-react';
import AppLogo from '@/components/app-logo';
import { LogAttachments } from '@/components/log-attachments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { label } from '@/lib/asset-ui';
import type { AssetSummary, Attachment, Option } from '@/lib/asset-ui';
import { edit, invoice, show } from '@/routes/assets';

type Asset = AssetSummary & {
    purchase_date: string | null;
    price: string | null;
    supplier: (Option & { contact: string | null }) | null;
    has_invoice: boolean;
};

type Log = {
    id: number;
    type: string;
    description: string;
    cost: string | null;
    location: string | null;
    user: string | null;
    logged_at: string;
    attachments: Attachment[];
};

type Props = { asset: Asset; logs: Log[] };

export default function PublicAsset({ asset, logs }: Props) {
    const { auth } = usePage<{ auth: { user: unknown } }>().props;
    const loggedIn = Boolean(auth.user);

    return (
        <>
            <Head title={asset.name} />
            <div className="bg-background min-h-svh">
                <header className="flex items-center justify-between gap-2 border-b px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                        <AppLogo />
                    </div>
                    {loggedIn && (
                        <Button variant="ghost" size="sm" asChild>
                            <Link href={show(asset.id)}>Open in app</Link>
                        </Button>
                    )}
                </header>

                <main className="mx-auto max-w-3xl space-y-6 p-4">
                    <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                            <h1 className="min-w-0 text-xl font-semibold break-words">
                                {asset.name}
                            </h1>
                            <Badge variant="outline">{label(asset.status)}</Badge>
                        </div>
                        {asset.asset_number && (
                            <p className="text-lg font-medium">{asset.asset_number}</p>
                        )}
                        <p className="text-muted-foreground font-mono text-xs break-all">
                            {asset.id}
                        </p>
                        <Button asChild className="w-full sm:w-auto">
                            <Link href={edit(asset.id)}>
                                {loggedIn ? <Pencil /> : <LogIn />}
                                {loggedIn ? 'Edit asset' : 'Admin: log in to edit'}
                            </Link>
                        </Button>
                    </div>

                    <section className="space-y-3 rounded-xl border p-4">
                        <h2 className="font-medium">Details</h2>
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <Item name="Category" value={asset.category} />
                            <Item name="Serial number" value={asset.serial_number} />
                            <Item name="Current location" value={asset.location?.name} />
                            <Item name="Supplier" value={asset.supplier?.name} />
                            <Item name="Supplier contact" value={asset.supplier?.contact} />
                            <Item name="Price" value={asset.price} />
                            <Item name="Purchase date" value={asset.purchase_date} />
                            {asset.has_invoice && (
                                <div>
                                    <dt className="text-muted-foreground">Invoice</dt>
                                    <dd>
                                        <a
                                            href={invoice.url(asset.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 underline"
                                        >
                                            <Download className="size-4" />
                                            {loggedIn ? 'View invoice' : 'Log in to view invoice'}
                                        </a>
                                    </dd>
                                </div>
                            )}
                        </dl>
                    </section>

                    <section className="space-y-3">
                        <h2 className="font-medium">History</h2>
                        {logs.length === 0 && (
                            <p className="text-muted-foreground text-sm">No history recorded yet.</p>
                        )}
                        <ol className="space-y-3">
                            {logs.map((l) => (
                                <li key={l.id} className="rounded-xl border p-3 text-sm">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Badge>{label(l.type)}</Badge>
                                        <span className="text-muted-foreground">
                                            {new Date(l.logged_at).toLocaleString()}
                                            {l.user && ` · ${l.user}`}
                                        </span>
                                        {l.location && <span>→ {l.location}</span>}
                                        {l.cost && <span className="sm:ml-auto">Cost: {l.cost}</span>}
                                    </div>
                                    <p className="mt-2 break-words whitespace-pre-wrap">
                                        {l.description}
                                    </p>
                                    <LogAttachments files={l.attachments} />
                                </li>
                            ))}
                        </ol>
                    </section>
                </main>
            </div>
        </>
    );
}

function Item({ name, value }: { name: string; value?: string | null }) {
    return (
        <div className="min-w-0">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="break-words">{value || '—'}</dd>
        </div>
    );
}
