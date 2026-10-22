import { Form, Head, Link, router } from '@inertiajs/react';
import { Download, Pencil, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { label } from '@/lib/asset-ui';
import type { AssetSummary, Option } from '@/lib/asset-ui';
import { destroy, edit, index, invoice, label as labelRoute, qr, show, status as statusRoute } from '@/routes/assets';
import { store as storeLog } from '@/routes/assets/logs';

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
};

type Props = {
    asset: Asset;
    logs: Log[];
    locations: Option[];
    logTypes: string[];
    statuses: string[];
};

export default function AssetShow({ asset, logs, locations, logTypes, statuses }: Props) {
    const [type, setType] = useState('problem');

    return (
        <>
            <Head title={asset.name} />
            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                        <h1 className="text-xl font-semibold">{asset.name}</h1>
                        <p className="text-muted-foreground font-mono text-xs">{asset.id}</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" asChild>
                            <Link href={edit(asset.id)}>
                                <Pencil /> Edit
                            </Link>
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() =>
                                confirm('Delete this asset and its history?') &&
                                router.delete(destroy.url(asset.id))
                            }
                        >
                            <Trash2 /> Delete
                        </Button>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    <section className="space-y-3 rounded-xl border p-4 lg:col-span-2">
                        <h2 className="font-medium">Details</h2>
                        <dl className="grid gap-3 text-sm sm:grid-cols-2">
                            <Item name="Asset number" value={asset.asset_number} />
                            <Item name="Category" value={asset.category} />
                            <Item name="Serial number" value={asset.serial_number} />
                            <Item name="Supplier" value={asset.supplier?.name} />
                            <Item name="Price" value={asset.price} />
                            <Item name="Purchase date" value={asset.purchase_date} />
                            <Item name="Current location" value={asset.location?.name} />
                            <div>
                                <dt className="text-muted-foreground">Status</dt>
                                <dd>
                                    <Select
                                        value={asset.status}
                                        onValueChange={(status) =>
                                            router.patch(
                                                statusRoute.url(asset.id),
                                                { status },
                                                { preserveScroll: true },
                                            )
                                        }
                                    >
                                        <SelectTrigger className="mt-1 w-48">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {statuses.map((s) => (
                                                <SelectItem key={s} value={s}>
                                                    {label(s)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </dd>
                            </div>
                            <div>
                                <dt className="text-muted-foreground">Invoice</dt>
                                <dd>
                                    {asset.has_invoice ? (
                                        <a
                                            href={invoice.url(asset.id)}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="inline-flex items-center gap-1 underline"
                                        >
                                            <Download className="size-4" /> View invoice
                                        </a>
                                    ) : (
                                        '—'
                                    )}
                                </dd>
                            </div>
                        </dl>
                    </section>

                    <section className="flex flex-col items-center gap-3 rounded-xl border p-4">
                        <h2 className="font-medium">QR code</h2>
                        <img src={qr.url(asset.id)} alt="Asset QR code" className="size-48 rounded bg-white p-2" />
                        <Button variant="outline" size="sm" asChild>
                            <Link href={labelRoute(asset.id)}>
                                <Printer /> Print label
                            </Link>
                        </Button>
                    </section>
                </div>

                <section className="space-y-4 rounded-xl border p-4">
                    <h2 className="font-medium">Add history entry</h2>
                    <Form
                        {...storeLog.form(asset.id)}
                        options={{ preserveScroll: true }}
                        resetOnSuccess
                        className="grid gap-4 sm:grid-cols-2"
                    >
                        {({ processing, errors }) => (
                            <>
                                <div className="grid gap-2">
                                    <Label>Type</Label>
                                    <Select
                                        name="type"
                                        value={type}
                                        onValueChange={setType}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {logTypes.map((t) => (
                                                <SelectItem key={t} value={t}>
                                                    {label(t)}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <InputError message={errors.type} />
                                </div>
                                <div className="grid gap-2">
                                    <Label>Date</Label>
                                    <DatePicker name="logged_at" placeholder="Today" />
                                    <InputError message={errors.logged_at} />
                                </div>
                                {type === 'relocation' && (
                                    <div className="grid gap-2">
                                        <Label>New location</Label>
                                        <Select name="location_id" defaultValue="">
                                            <SelectTrigger className="w-full">
                                                <SelectValue placeholder="Select…" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {locations.map((l) => (
                                                    <SelectItem key={l.id} value={l.id.toString()}>
                                                        {l.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <InputError message={errors.location_id} />
                                    </div>
                                )}
                                <div className="grid gap-2">
                                    <Label>Cost (optional)</Label>
                                    <Input name="cost" type="number" step="0.01" min="0" />
                                    <InputError message={errors.cost} />
                                </div>
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>Description</Label>
                                    <textarea
                                        name="description"
                                        rows={3}
                                        required
                                        className="border-input dark:bg-input/30 rounded-md border bg-transparent p-3 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                        placeholder="What happened, which component was swapped, who serviced it…"
                                    />
                                    <InputError message={errors.description} />
                                </div>
                                <div>
                                    <Button disabled={processing}>Add entry</Button>
                                </div>
                            </>
                        )}
                    </Form>
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
                                    {l.cost && <span className="ml-auto">Cost: {l.cost}</span>}
                                </div>
                                <p className="mt-2 whitespace-pre-wrap">{l.description}</p>
                            </li>
                        ))}
                    </ol>
                </section>
            </div>
        </>
    );
}

function Item({ name, value }: { name: string; value?: string | null }) {
    return (
        <div>
            <dt className="text-muted-foreground">{name}</dt>
            <dd>{value || '—'}</dd>
        </div>
    );
}

AssetShow.layout = { breadcrumbs: [{ title: 'Assets', href: index() }] };
