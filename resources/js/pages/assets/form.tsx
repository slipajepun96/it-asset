import { Form, Head, Link } from '@inertiajs/react';
import { DatePicker } from '@/components/date-picker';
import InputError from '@/components/input-error';
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
import type { Option } from '@/lib/asset-ui';
import { index, show, store, update } from '@/routes/assets';

type Asset = {
    id: string;
    name: string;
    asset_number: string | null;
    category: string | null;
    serial_number: string | null;
    supplier_id: number | null;
    location_id: number | null;
    price: string | null;
    purchase_date: string | null;
    status: string;
    has_invoice: boolean;
};

type Props = {
    asset?: Asset;
    suppliers: Option[];
    locations: Option[];
    statuses: string[];
};

export default function AssetForm({ asset, suppliers, locations, statuses }: Props) {
    const action = asset ? update.form(asset.id) : store.form();

    return (
        <>
            <Head title={asset ? 'Edit asset' : 'New asset'} />
            <div className="max-w-2xl space-y-6 p-4">
                <h1 className="text-xl font-semibold">
                    {asset ? `Edit ${asset.name}` : 'New asset'}
                </h1>

                <Form {...action} className="space-y-5">
                    {({ processing, errors }) => (
                        <>
                            <Field label="Name" error={errors.name}>
                                <Input name="name" defaultValue={asset?.name} required />
                            </Field>
                            <div className="grid gap-5 sm:grid-cols-2">
                                <Field label="Asset number" error={errors.asset_number}>
                                    <Input
                                        name="asset_number"
                                        defaultValue={asset?.asset_number ?? ''}
                                    />
                                </Field>
                                <Field label="Category" error={errors.category}>
                                    <Input
                                        name="category"
                                        defaultValue={asset?.category ?? ''}
                                        placeholder="Laptop, Printer, Router…"
                                    />
                                </Field>
                                <Field label="Serial number" error={errors.serial_number}>
                                    <Input
                                        name="serial_number"
                                        defaultValue={asset?.serial_number ?? ''}
                                    />
                                </Field>
                                <Field label="Supplier" error={errors.supplier_id}>
                                    <Select
                                        name="supplier_id"
                                        defaultValue={asset?.supplier_id?.toString() ?? ''}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {suppliers.map((s) => (
                                                <SelectItem key={s.id} value={s.id.toString()}>
                                                    {s.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Location" error={errors.location_id}>
                                    <Select
                                        name="location_id"
                                        defaultValue={asset?.location_id?.toString() ?? ''}
                                    >
                                        <SelectTrigger className="w-full">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {locations.map((l) => (
                                                <SelectItem key={l.id} value={l.id.toString()}>
                                                    {l.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </Field>
                                <Field label="Price" error={errors.price}>
                                    <Input
                                        name="price"
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        defaultValue={asset?.price ?? ''}
                                    />
                                </Field>
                                <Field label="Purchase date" error={errors.purchase_date}>
                                    <DatePicker
                                        name="purchase_date"
                                        defaultValue={asset?.purchase_date}
                                    />
                                </Field>
                                {asset && (
                                    <Field label="Status" error={errors.status}>
                                        <Select
                                            name="status"
                                            defaultValue={asset.status}
                                        >
                                            <SelectTrigger className="w-full">
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
                                    </Field>
                                )}
                            </div>
                            <Field
                                label={
                                    asset?.has_invoice
                                        ? 'Replace invoice (PDF/JPG/PNG)'
                                        : 'Invoice (PDF/JPG/PNG)'
                                }
                                error={errors.invoice}
                            >
                                <Input
                                    name="invoice"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                />
                            </Field>

                            <div className="flex gap-2">
                                <Button disabled={processing}>
                                    {asset ? 'Save changes' : 'Create asset'}
                                </Button>
                                <Button variant="outline" asChild>
                                    <Link href={asset ? show(asset.id) : index()}>Cancel</Link>
                                </Button>
                            </div>
                        </>
                    )}
                </Form>
            </div>
        </>
    );
}

function Field({
    label: text,
    error,
    children,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
}) {
    return (
        <div className="grid gap-2">
            <Label>{text}</Label>
            {children}
            <InputError message={error} />
        </div>
    );
}
