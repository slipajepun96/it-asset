import { Form, Head, router } from '@inertiajs/react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { destroy, index, store } from '@/routes/suppliers';

type Props = {
    suppliers: { id: number; name: string; contact: string | null; assets_count: number }[];
};

export default function Suppliers({ suppliers }: Props) {
    return (
        <>
            <Head title="Suppliers" />
            <div className="max-w-2xl space-y-6 p-4">
                <h1 className="text-xl font-semibold">Suppliers</h1>
                <Form {...store.form()} resetOnSuccess className="flex flex-wrap items-start gap-2">
                    {({ errors, processing }) => (
                        <>
                            <div className="w-full sm:w-auto">
                                <Input name="name" placeholder="Supplier name" required />
                                <InputError message={errors.name} />
                            </div>
                            <Input name="contact" placeholder="Contact (email / phone)" className="w-full sm:w-64" />
                            <Button disabled={processing} className="w-full sm:w-auto">Add</Button>
                        </>
                    )}
                </Form>
                <ul className="divide-y rounded-xl border">
                    {suppliers.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2 p-3 text-sm">
                            <div className="min-w-0 break-words">
                                <div className="font-medium">{s.name}</div>
                                <div className="text-muted-foreground">
                                    {s.contact ?? '—'} · {s.assets_count} assets
                                </div>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => confirm(`Delete ${s.name}?`) && router.delete(destroy.url(s.id))}
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

Suppliers.layout = { breadcrumbs: [{ title: 'Suppliers', href: index() }] };
