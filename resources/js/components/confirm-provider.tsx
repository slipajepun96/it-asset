import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
    ResponsiveDialog,
    ResponsiveDialogContent,
    ResponsiveDialogDescription,
    ResponsiveDialogFooter,
    ResponsiveDialogHeader,
    ResponsiveDialogTitle,
} from '@/components/responsive-dialog';
import { Button } from '@/components/ui/button';

export type ConfirmOptions = {
    title: string;
    description?: string;
    action?: string;
    cancel?: string | false;
    destructive?: boolean;
};

type Ask = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<Ask>(async () => false);

/**
 * The app's replacement for the browser's confirm(): a dialog on desktop, a drawer on phones.
 *   const confirm = useConfirm();
 *   if (await confirm({ title: 'Delete?', action: 'Delete', destructive: true })) …
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [options, setOptions] = useState<ConfirmOptions | null>(null);
    const [open, setOpen] = useState(false);
    const resolver = useRef<((answer: boolean) => void) | null>(null);

    const ask = useCallback<Ask>((next) => {
        resolver.current?.(false);

        return new Promise((resolve) => {
            resolver.current = resolve;
            setOptions(next);
            setOpen(true);
        });
    }, []);

    const finish = (answer: boolean) => {
        resolver.current?.(answer);
        resolver.current = null;
        setOpen(false);
    };

    return (
        <ConfirmContext.Provider value={ask}>
            {children}
            <ResponsiveDialog open={open} onOpenChange={(o) => !o && finish(false)}>
                <ResponsiveDialogContent className="sm:max-w-md">
                    {options && (
                        <>
                            <ResponsiveDialogHeader>
                                <ResponsiveDialogTitle>{options.title}</ResponsiveDialogTitle>
                                {options.description && (
                                    <ResponsiveDialogDescription className="whitespace-pre-line">
                                        {options.description}
                                    </ResponsiveDialogDescription>
                                )}
                            </ResponsiveDialogHeader>
                            <ResponsiveDialogFooter>
                                {options.cancel !== false && (
                                    <Button variant="outline" onClick={() => finish(false)}>
                                        {options.cancel ?? 'Cancel'}
                                    </Button>
                                )}
                                <Button
                                    variant={options.destructive ? 'destructive' : 'default'}
                                    onClick={() => finish(true)}
                                >
                                    {options.action ?? 'OK'}
                                </Button>
                            </ResponsiveDialogFooter>
                        </>
                    )}
                </ResponsiveDialogContent>
            </ResponsiveDialog>
        </ConfirmContext.Provider>
    );
}

export const useConfirm = () => useContext(ConfirmContext);
