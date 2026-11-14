import { Head, Link, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { index } from '@/routes/photostat';
import { index as machinesAdmin } from '@/routes/photostat/admin/machines';

/** Shown only until the photostat machine is set up (or while it's hidden). */
export default function PhotostatIndex() {
    const { auth } = usePage<{ auth: { isAdmin: boolean } }>().props;

    return (
        <>
            <Head title="Photostat" />
            <div className="space-y-4 p-4">
                <h1 className="text-xl font-semibold">Photostat</h1>
                <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
                    The photostat machine isn't set up yet.
                    {auth.isAdmin && (
                        <div className="mt-3">
                            <Button asChild>
                                <Link href={machinesAdmin()}>Set up the machine</Link>
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

PhotostatIndex.layout = { breadcrumbs: [{ title: 'Photostat', href: index() }] };
