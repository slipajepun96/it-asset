import { Boxes, History, QrCode, Wrench } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AuthLayoutProps } from '@/types';

const brand = 'IT Asset Record';

export default function AuthGreenLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="relative min-h-dvh lg:grid lg:grid-cols-3">
            {/* Background: full screen on phones, right two thirds on desktop. */}
            <Backdrop className="fixed inset-0 lg:relative lg:inset-auto lg:order-2 lg:col-span-2 lg:min-h-dvh" />

            <main className="relative flex min-h-dvh items-center justify-center p-4 lg:order-1 lg:bg-background lg:p-10">
                <div className="w-full max-w-sm space-y-6 rounded-2xl bg-background p-6 shadow-2xl shadow-black/30 sm:p-8 lg:rounded-none lg:p-0 lg:shadow-none">
                    <div className="flex items-center gap-2">
                        <span className="flex size-9 items-center justify-center rounded-lg bg-[#14532d] text-[#a3e635]">
                            <Boxes className="size-5" />
                        </span>
                        <span className="font-semibold text-[#14532d] dark:text-[#a3e635]">{brand}</span>
                    </div>
                    <div className="space-y-1">
                        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                        <p className="text-sm text-muted-foreground">{description}</p>
                    </div>
                    {children}
                </div>
            </main>
        </div>
    );
}

function Backdrop({ className }: { className: string }) {
    return (
        <aside
            aria-hidden
            className={`${className} overflow-hidden bg-[#0f3d22] bg-[radial-gradient(ellipse_at_top_right,#1f6b38_0%,transparent_55%),radial-gradient(ellipse_at_bottom_left,#0a2615_0%,transparent_60%)]`}
        >
            <svg className="absolute inset-0 size-full opacity-[0.08]" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <pattern id="auth-grid" width="32" height="32" patternUnits="userSpaceOnUse">
                        <path d="M32 0H0V32" fill="none" stroke="#a3e635" strokeWidth="1" />
                    </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#auth-grid)" />
            </svg>
            <div className="absolute -top-24 -right-24 size-96 rounded-full bg-[#a3e635]/25 blur-3xl" />
            <div className="absolute -bottom-32 left-1/4 size-[28rem] rounded-full bg-[#65a30d]/20 blur-3xl" />

            <div className="relative hidden h-full flex-col justify-between p-12 text-white lg:flex xl:p-16">
                <span className="inline-flex w-fit items-center gap-2 rounded-full border border-[#a3e635]/40 bg-[#a3e635]/10 px-3 py-1 text-xs font-medium text-[#d9f99d]">
                    <span className="size-1.5 rounded-full bg-[#a3e635]" /> {brand}
                </span>

                <div className="max-w-xl space-y-6">
                    <h2 className="text-4xl leading-tight font-semibold tracking-tight xl:text-5xl">
                        Every device, from purchase to{' '}
                        <span className="text-[#a3e635]">retirement.</span>
                    </h2>
                    <p className="text-lg text-[#d1e7d6]">
                        Track locations, repairs and invoices in one place. Scan a label to see an
                        asset's full story.
                    </p>
                    <ul className="grid gap-3 sm:grid-cols-3">
                        <Feature icon={QrCode} text="QR labels" />
                        <Feature icon={History} text="Full history" />
                        <Feature icon={Wrench} text="Repair costs" />
                    </ul>
                </div>

                <p className="text-sm text-[#a7c4ae]">© {new Date().getFullYear()} {brand}</p>
            </div>
        </aside>
    );
}

function Feature({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
    return (
        <li className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm backdrop-blur">
            <Icon className="size-4 text-[#a3e635]" /> {text}
        </li>
    );
}
