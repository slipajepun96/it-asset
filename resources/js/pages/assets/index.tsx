import { Head, Link, router } from '@inertiajs/react';
import { Plus, Printer } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { label } from '@/lib/asset-ui';
import type { AssetSummary, Option } from '@/lib/asset-ui';
import { create, index, labels, show } from '@/routes/assets';

type Paginated = {
    data: AssetSummary[];
    links: { url: string | null; label: string; active: boolean }[];
};

type Props = {
    assets: Paginated;
    filters: { search?: string; status?: string; location_id?: string };
    locations: Option[];
    statuses: string[];
};

export default function AssetsIndex({ assets, filters, locations, statuses }: Props) {
    const [search, setSearch] = useState(filters.search ?? '');
    const [selected, setSelected] = useState<string[]>([]);
    const pageIds = assets.data.map((a) => a.id);
    const allSelected = pageIds.length > 0 && pageIds.every((id) => selected.includes(id));

    const toggle = (id: string, checked: boolean) =>
        setSelected((s) => (checked ? [...s, id] : s.filter((x) => x !== id)));

    const toggleAll = (checked: boolean) =>
        setSelected((s) =>
            checked ? [...new Set([...s, ...pageIds])] : s.filter((id) => !pageIds.includes(id)),
        );

    const apply = (next: Record<string, string | undefined>) =>
        router.get(
            index.url(),
            Object.fromEntries(
                Object.entries({ ...filters, ...next }).filter(([, v]) => v),
            ),
            { preserveState: true, replace: true },
        );

    return (
        <>
            <Head title="Assets" />
            <div className="space-y-4 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <h1 className="text-xl font-semibold">Assets</h1>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            disabled={selected.length === 0}
                            onClick={() => router.get(labels.url(), { ids: selected })}
                        >
                            <Printer /> Print labels{selected.length > 0 && ` (${selected.length})`}
                        </Button>
                        <Button asChild>
                            <Link href={create()}>
                                <Plus /> New asset
                            </Link>
                        </Button>
                    </div>
                </div>

                <form
                    className="flex flex-wrap gap-2"
                    onSubmit={(e) => {
                        e.preventDefault();
                        apply({ search });
                    }}
                >
                    <Input
                        className="w-full sm:max-w-xs"
                        placeholder="Search name, asset no., serial or UUID"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                    <Select
                        value={filters.status ?? ''}
                        onValueChange={(status) =>
                            apply({ status: status === '__all__' ? undefined : status })
                        }
                    >
                        <SelectTrigger className="w-full sm:w-40">
                            <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All statuses</SelectItem>
                            {statuses.map((s) => (
                                <SelectItem key={s} value={s}>
                                    {label(s)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={filters.location_id ?? ''}
                        onValueChange={(locationId) =>
                            apply({ location_id: locationId === '__all__' ? undefined : locationId })
                        }
                    >
                        <SelectTrigger className="w-full sm:w-48">
                            <SelectValue placeholder="All locations" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="__all__">All locations</SelectItem>
                            {locations.map((l) => (
                                <SelectItem key={l.id} value={l.id.toString()}>
                                    {l.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button type="submit" variant="secondary" className="w-full sm:w-auto">
                        Search
                    </Button>
                </form>

                {/* Phones and tablets: one card per asset. */}
                <div className="space-y-2 lg:hidden">
                    {assets.data.length > 0 && (
                        <label className="flex items-center gap-2 px-1 text-sm">
                            <Checkbox
                                checked={allSelected}
                                onCheckedChange={(c) => toggleAll(c === true)}
                            />
                            Select all on this page
                        </label>
                    )}
                    {assets.data.map((a) => (
                        <div key={a.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                            <Checkbox
                                className="mt-0.5"
                                aria-label={`Select ${a.name}`}
                                checked={selected.includes(a.id)}
                                onCheckedChange={(c) => toggle(a.id, c === true)}
                            />
                            <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <Link
                                        href={show(a.id)}
                                        className="min-w-0 font-medium break-words hover:underline"
                                    >
                                        {a.name}
                                    </Link>
                                    <Badge variant="outline">{label(a.status)}</Badge>
                                </div>
                                <div className="text-muted-foreground break-words">
                                    {[a.asset_number, a.category, a.location?.name]
                                        .filter(Boolean)
                                        .join(' · ') || '—'}
                                </div>
                                {a.serial_number && (
                                    <div className="text-muted-foreground text-xs break-all">
                                        S/N {a.serial_number}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {assets.data.length === 0 && (
                        <p className="text-muted-foreground rounded-xl border p-6 text-center text-sm">
                            No assets found.
                        </p>
                    )}
                </div>

                <div className="hidden rounded-xl border lg:block">
                    <table className="w-full text-sm break-words">
                        <thead className="bg-muted/50 text-left">
                            <tr>
                                <th className="w-10 p-3">
                                    <Checkbox
                                        aria-label="Select all"
                                        checked={allSelected}
                                        onCheckedChange={(c) => toggleAll(c === true)}
                                    />
                                </th>
                                <th className="p-3">Asset no.</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Serial</th>
                                <th className="p-3">Category</th>
                                <th className="p-3">Location</th>
                                <th className="p-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {assets.data.map((a) => (
                                <tr key={a.id} className="border-t">
                                    <td className="p-3">
                                        <Checkbox
                                            aria-label={`Select ${a.name}`}
                                            checked={selected.includes(a.id)}
                                            onCheckedChange={(c) => toggle(a.id, c === true)}
                                        />
                                    </td>
                                    <td className="p-3">{a.asset_number ?? '—'}</td>
                                    <td className="p-3">
                                        <Link
                                            href={show(a.id)}
                                            className="font-medium hover:underline"
                                        >
                                            {a.name}
                                        </Link>
                                    </td>
                                    <td className="p-3">{a.serial_number ?? '—'}</td>
                                    <td className="p-3">{a.category ?? '—'}</td>
                                    <td className="p-3">{a.location?.name ?? '—'}</td>
                                    <td className="p-3">
                                        <Badge variant="outline">{label(a.status)}</Badge>
                                    </td>
                                </tr>
                            ))}
                            {assets.data.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="text-muted-foreground p-6 text-center">
                                        No assets found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex flex-wrap gap-1">
                    {assets.links.map(
                        (l, i) =>
                            l.url && (
                                <Button
                                    key={i}
                                    size="sm"
                                    variant={l.active ? 'default' : 'outline'}
                                    asChild
                                >
                                    <Link href={l.url} dangerouslySetInnerHTML={{ __html: l.label }} />
                                </Button>
                            ),
                    )}
                </div>
            </div>
        </>
    );
}

AssetsIndex.layout = { breadcrumbs: [{ title: 'Assets', href: index() }] };
