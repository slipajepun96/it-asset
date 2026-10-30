import { Form, Head, router } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { label } from '@/lib/asset-ui';
import { destroy, index, store } from '@/routes/locations';

type Props = {
    locations: { id: number; name: string; type: string; address: string | null; assets_count: number }[];
    types: string[];
};

export default function Locations({ locations, types }: Props) {
    return (
        <>
            <Head title="Locations" />
            <div className="max-w-2xl space-y-6 p-4">
                <h1 className="text-xl font-semibold">Locations</h1>
                <Form {...store.form()} resetOnSuccess className="flex flex-wrap items-start gap-2">
                    {({ errors, processing }) => (
                        <>
                            <div className="w-full sm:w-auto">
                                <Input name="name" placeholder="e.g. Head Office, Estate A" required />
                                <InputError message={errors.name} />
                            </div>
                            <Select
                                name="type"
                                defaultValue=""
                                required
                            >
                                <SelectTrigger className="w-full sm:w-36">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                    {types.map((t) => (
                                        <SelectItem key={t} value={t}>
                                            {label(t)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Input name="address" placeholder="Address (optional)" className="w-full sm:w-64" />
                            <Button disabled={processing} className="w-full sm:w-auto">Add</Button>
                        </>
                    )}
                </Form>
                <ul className="divide-y rounded-xl border">
                    {locations.map((l) => (
                        <li key={l.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                            <div className="min-w-0 break-words">
                                <div className="font-medium">
                                    {l.name} <span className="text-muted-foreground">({label(l.type)})</span>
                                </div>
                                <div className="text-muted-foreground">
                                    {l.address ?? '—'} · {l.assets_count} assets
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirm(`Delete ${l.name}?`) && router.delete(destroy.url(l.id))}
                            >
                                Delete
                            </Button>
                        </li>
                    ))}
                </ul>
            </div>
        </>
    );
}

Locations.layout = { breadcrumbs: [{ title: 'Locations', href: index() }] };
