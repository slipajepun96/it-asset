import { createContext, useContext } from 'react';
import type { ComponentProps, ReactNode } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerFooter,
    DrawerHeader,
    DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';

const MobileContext = createContext(false);

/**
 * A dialog on desktop and a bottom drawer on phones, with one set of parts:
 * ResponsiveDialog > ResponsiveDialogContent > Header (Title, Description), Body, Footer.
 * Put fields in Body: in the drawer it scrolls between the fixed header and footer.
 */
export function ResponsiveDialog({
    open,
    onOpenChange,
    children,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: ReactNode;
}) {
    const mobile = useIsMobile();
    const Root = mobile ? Drawer : Dialog;

    return (
        <MobileContext.Provider value={mobile}>
            <Root open={open} onOpenChange={onOpenChange}>
                {children}
            </Root>
        </MobileContext.Provider>
    );
}

export const useIsDrawer = () => useContext(MobileContext);

/** className sets the dialog's width (e.g. sm:max-w-md); the drawer is always full width. */
export function ResponsiveDialogContent({
    className,
    children,
}: {
    className?: string;
    children: ReactNode;
}) {
    return useContext(MobileContext) ? (
        <DrawerContent className="data-[vaul-drawer-direction=bottom]:max-h-[calc(100dvh-0.75rem)]">
            {children}
        </DrawerContent>
    ) : (
        <DialogContent className={cn('max-h-[calc(100dvh-2rem)] overflow-y-auto', className)}>
            {children}
        </DialogContent>
    );
}

export function ResponsiveDialogHeader({ className, ...props }: ComponentProps<'div'>) {
    return useContext(MobileContext) ? (
        <DrawerHeader className={cn('px-4 pt-2 pb-3 text-left', className)} {...props} />
    ) : (
        <DialogHeader className={className} {...props} />
    );
}

export function ResponsiveDialogTitle(props: ComponentProps<typeof DialogTitle>) {
    return useContext(MobileContext) ? <DrawerTitle {...props} /> : <DialogTitle {...props} />;
}

export function ResponsiveDialogDescription(props: ComponentProps<typeof DialogDescription>) {
    return useContext(MobileContext) ? <DrawerDescription {...props} /> : <DialogDescription {...props} />;
}

export function ResponsiveDialogBody({ className, ...props }: ComponentProps<'div'>) {
    const mobile = useContext(MobileContext);

    return (
        <div
            className={cn(mobile ? 'grid min-h-0 flex-1 gap-4 overflow-y-auto px-4 pb-3' : 'grid gap-4', className)}
            {...props}
        />
    );
}

/** On phones the buttons share one row, with the main action (the last button) on the right. */
export function ResponsiveDialogFooter({ className, ...props }: ComponentProps<'div'>) {
    return useContext(MobileContext) ? (
        <DrawerFooter
            className={cn('flex-row border-t p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] *:flex-1', className)}
            {...props}
        />
    ) : (
        <DialogFooter className={className} {...props} />
    );
}
