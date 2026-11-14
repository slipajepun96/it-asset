import { Link, router, usePage } from '@inertiajs/react';
import { BarChart3, Boxes, History, LayoutGrid, MapPin, Printer, Settings2, Truck, Users } from 'lucide-react';
import { useEffect } from 'react';
import AppLogo from '@/components/app-logo';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { dashboard, home } from '@/routes';
import { index as assetsIndex } from '@/routes/assets';
import { index as locationsIndex } from '@/routes/locations';
import { index as photostatIndex, mine as photostatMine } from '@/routes/photostat';
import { report as photostatReport } from '@/routes/photostat/admin';
import { index as photostatMachines } from '@/routes/photostat/admin/machines';
import { index as suppliersIndex } from '@/routes/suppliers';
import { index as usersIndex } from '@/routes/users';
import type { NavItem } from '@/types';

const photostatItems: NavItem[] = [
    { title: 'Record prints', href: photostatIndex(), icon: Printer },
    { title: 'My records', href: photostatMine(), icon: History },
];

export function AppSidebar() {
    const { auth } = usePage<{ auth: { isAdmin: boolean; pendingCount: number } }>().props;

    const assetItems: NavItem[] = [
        { title: 'Dashboard', href: dashboard(), icon: LayoutGrid },
        { title: 'Assets', href: assetsIndex(), icon: Boxes },
        { title: 'Locations', href: locationsIndex(), icon: MapPin },
        { title: 'Suppliers', href: suppliersIndex(), icon: Truck },
    ];
    const adminItems: NavItem[] = [
        { title: 'Machine & readings', href: photostatMachines(), icon: Settings2 },
        { title: 'Photostat report', href: photostatReport(), icon: BarChart3 },
        { title: 'People', href: usersIndex(), icon: Users, badge: auth.pendingCount },
    ];

    // On phones the sidebar is a sheet over the page: close it as soon as any link in it is tapped.
    const { setOpenMobile } = useSidebar();
    useEffect(() => router.on('start', () => setOpenMobile(false)), [setOpenMobile]);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={home()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                {auth.isAdmin && <NavMain label="IT assets" items={assetItems} />}
                <NavMain label="Photostat" items={photostatItems} />
                {auth.isAdmin && <NavMain label="Admin" items={adminItems} />}
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
