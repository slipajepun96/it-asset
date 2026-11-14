import { Form, Head, Link, router } from '@inertiajs/react';
import { Download, Pencil, Printer, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
import { LogAttachments } from '@/components/log-attachments';
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
import type { AssetSummary, Attachment, Option } from '@/lib/asset-ui';
import { destroy, edit, index, invoice, label as labelRoute, qr, show, status as statusRoute } from '@/routes/assets';
import { store as storeLog } from '@/routes/assets/logs';
import { Diff } from '@/components/photostat/parts';
import { fmtDateTime, fmtNum } from '@/lib/photostat';
import type { MeterReading } from '@/lib/photostat';
import { index as photostatMachines } from '@/routes/photostat/admin/machines';
import { report as photostatReport } from '@/routes/photostat/admin';

type PhotostatSummary = {
    id: number;
    name: string;
    bw_counter: number;
    color_counter: number;
    active: boolean;
    month_bw: number;
    month_color: number;
    month_records: number;
    last_check: MeterReading | null;
};

/** This asset is a photostat machine: its print count, this month's usage and the latest meter check. */
function PhotostatCard({ machine }: { machine: PhotostatSummary }) {
    return (
        <section className="space-y-3 rounded-xl border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-medium">
                    <Printer className="size-4" /> Photostat: {machine.name}
                    {!machine.active && <Badge variant="secondary">Hidden</Badge>}
                </h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={photostatReport({ query: { machine_id: machine.id } })}>Report</Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={photostatMachines()}>Meter readings</Link>
                    </Button>
                </div>
            </div>
            <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
                <div><dt className="text-muted-foreground">B&amp;W count</dt><dd className="font-mono text-lg">{fmtNum(machine.bw_counter)}</dd></div>
                <div><dt className="text-muted-foreground">Colour count</dt><dd className="font-mono text-lg">{fmtNum(machine.color_counter)}</dd></div>
                <div><dt className="text-muted-foreground">This month</dt><dd>{fmtNum(machine.month_bw)} B&amp;W · {fmtNum(machine.month_color)} colour</dd></div>
                <div><dt className="text-muted-foreground">Records this month</dt><dd>{fmtNum(machine.month_records)}</dd></div>
            </dl>
            <div className="text-sm">
                {machine.last_check ? (
                    <div className="flex flex-wrap items-center gap-2">
                        <span className="text-muted-foreground">Last meter check {fmtDateTime(machine.last_check.created_at)}:</span>
                        B&amp;W <Diff value={machine.last_check.bw_diff} /> Colour <Diff value={machine.last_check.color_diff} />
                    </div>
                ) : (
                    <span className="text-muted-foreground">No meter check yet.</span>
                )}
            </div>
        </section>
    );
}

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

type Props = {
    asset: Asset;
    logs: Log[];
    locations: Option[];
    logTypes: string[];
    statuses: string[];
    photostat: PhotostatSummary | null;
};

export default function AssetShow({ asset, logs, locations, logTypes, statuses, photostat }: Props) {
    const [type, setType] = useState('problem');

    return (
        <>
            <Head title={asset.name} />
            <div className="space-y-6 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                        <h1 className="text-xl font-semibold break-words">{asset.name}</h1>
                        <p className="text-muted-foreground font-mono text-xs break-all">{asset.id}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
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
                    <section className="min-w-0 space-y-3 rounded-xl border p-4 lg:col-span-2">
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
                                        <SelectTrigger className="mt-1 w-full sm:w-48">
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

                {photostat && <PhotostatCard machine={photostat} />}

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
                                <div className="grid gap-2 sm:col-span-2">
                                    <Label>Attachments (optional)</Label>
                                    <Input
                                        name="attachments[]"
                                        type="file"
                                        multiple
                                        accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                                    />
                                    <p className="text-muted-foreground text-xs">
                                        Service reports, repair invoices, photos. Up to 5 files, 10 MB each.
                                    </p>
                                    <InputError
                                        message={
                                            errors.attachments ??
                                            Object.entries(errors).find(([k]) =>
                                                k.startsWith('attachments.'),
                                            )?.[1]
                                        }
                                    />
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
                                    {l.cost && <span className="sm:ml-auto">Cost: {l.cost}</span>}
                                </div>
                                <p className="mt-2 break-words whitespace-pre-wrap">{l.description}</p>
                                <LogAttachments files={l.attachments} />
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
        <div className="min-w-0">
            <dt className="text-muted-foreground">{name}</dt>
            <dd className="break-words">{value || '—'}</dd>
        </div>
    );
}

AssetShow.layout = { breadcrumbs: [{ title: 'Assets', href: index() }] };
