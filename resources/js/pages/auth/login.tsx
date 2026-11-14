import { Head, usePage } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { google } from '@/routes/auth';

type Props = {
    status?: string;
    googleConfigured: boolean;
};

export default function Login({ status, googleConfigured }: Props) {
    const { errors } = usePage<{ errors: Record<string, string> }>().props;
    const error = errors.google ?? errors.email;

    return (
        <>
            <Head title="Sign in" />

            <div className="flex flex-col gap-4">
                {status && (
                    <div className="rounded-md border border-green-700/30 bg-green-50 px-3 py-2 text-sm text-green-900 dark:bg-green-950 dark:text-green-100">
                        {status}
                    </div>
                )}
                {error && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {error}
                    </div>
                )}
                {!googleConfigured && (
                    <div className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        Sign in with Google is not set up on this server yet.
                    </div>
                )}

                <Button variant="outline" size="lg" className="w-full" asChild disabled={!googleConfigured}>
                    {/* A full page visit: Google's sign-in page can't open inside Inertia. */}
                    <a href={google.url()}>
                        <svg viewBox="0 0 48 48" width="20" height="20" aria-hidden="true">
                            <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.6 5.4 2.6 13.3l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z" />
                            <path fill="#4285F4" d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.4 5.7c4.3-4 6.9-9.9 6.9-17.1z" />
                            <path fill="#FBBC05" d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-7.9-6.1C.9 16.6 0 20.2 0 24s.9 7.4 2.6 10.7l7.9-6.1z" />
                            <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2.1 1.4-4.8 2.3-8.5 2.3-6.3 0-11.6-4.1-13.5-9.9l-7.9 6.1C6.6 42.6 14.6 48 24 48z" />
                        </svg>
                        Sign in with Google
                    </a>
                </Button>
            </div>
        </>
    );
}

Login.layout = {
    title: 'Sign in',
    description: "Use your Google account. New people need an admin's approval first.",
};
