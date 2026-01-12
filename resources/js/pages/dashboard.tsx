import DashboardTable, {
    NegotiationRecord,
} from '@/components/dashboard-table';
import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/react';

const breadcrumbs: BreadcrumbItem[] = [
    // {
    //     title: 'Dashboard',
    //     href: dashboard().url,
    // },
];

export default function Dashboard({
    negotiations,
    readOnly = false,
    isAdmin = false,
    filters = {},
}: {
    negotiations: NegotiationRecord[];
    readOnly?: boolean;
    isAdmin?: boolean;
    filters?: Record<string, any>;
}) {
    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-4 overflow-x-auto rounded-xl p-2">
                <div className="relative flex-1 overflow-hidden rounded-xl border border-sidebar-border/70 dark:border-sidebar-border">
                    <DashboardTable
                        data={negotiations}
                        readOnly={readOnly}
                        isAdmin={isAdmin}
                        filters={filters}
                    />
                </div>
            </div>
        </AppLayout>
    );
}
