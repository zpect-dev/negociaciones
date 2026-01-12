import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import axios from '@/lib/axios';
import { cn } from '@/lib/utils';
import { router } from '@inertiajs/react';
import debounce from 'lodash/debounce';
import {
    CheckCircle2,
    FileText,
    Hourglass,
    MessageSquare,
    Search,
    XCircle,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
import { CreateNegotiationSheet } from './create-negotiation-sheet';

export interface NegotiationRecord {
    id: number;
    fecha: string;
    bitrixId: string;
    companyName: string;
    companyTar: string;
    userCreator: string;
    negotiationType: string;
    salesPerson: {
        name: string;
        avatar?: string;
        initials: string;
        co_ven: string;
    };
    salesObservation: string;
    effectiveness: 'Efectiva' | 'No Efectiva' | 'Pendiente';
    hasPdf: boolean;
    hasHistory: boolean;
    hasNotes: boolean;
    notesCount?: number;
    pdfUrl?: string; // Optional because not all have PDF
    supervisorObservation?: string;
}

export default function DashboardTable({
    data,
    readOnly = false,
    isAdmin = false,
    filters = {},
}: {
    data: NegotiationRecord[];
    readOnly?: boolean;
    isAdmin?: boolean;
    filters?: Record<string, string | null | undefined>;
}) {
    const [isObservationModalOpen, setIsObservationModalOpen] = useState(false);
    const [selectedNegotiation, setSelectedNegotiation] =
        useState<NegotiationRecord | null>(null);
    const [observationText, setObservationText] = useState('');

    // Filter states
    const [search, setSearch] = useState(filters?.search || '');
    const [dateFrom, setDateFrom] = useState(filters?.date_from || '');
    const [dateTo, setDateTo] = useState(filters?.date_to || '');
    const [effectiveness, setEffectiveness] = useState(
        filters?.efectividad || 'todas',
    );

    const getVenParam = useCallback(() => {
        const params = new URLSearchParams(window.location.search);
        return filters.ven || params.get('ven');
    }, [filters.ven]);

    const cleanParams = (params: Record<string, string | null | undefined>) => {
        const cleaned: Record<string, string | null | undefined> = {};
        Object.keys(params).forEach((key) => {
            const value = params[key];
            if (
                value !== '' &&
                value !== null &&
                value !== undefined &&
                value !== 'todas'
            ) {
                cleaned[key] = value;
            }
        });
        return cleaned;
    };

    // Debounced search
    const debouncedSearch = useMemo(
        () =>
            debounce((query) => {
                const params = {
                    search: query,
                    date_from: dateFrom,
                    date_to: dateTo,
                    efectividad: effectiveness,
                    ven: getVenParam(),
                };

                router.get(route('dashboard'), cleanParams(params), {
                    preserveState: true,
                    replace: true,
                });
            }, 300),
        [dateFrom, dateTo, effectiveness, getVenParam],
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearch(e.target.value);
        debouncedSearch(e.target.value);
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = {
            search,
            date_from: dateFrom,
            date_to: dateTo,
            efectividad: effectiveness,
            ven: getVenParam(), // Preserve ven parameter robustly
            [key]: value,
        };

        if (key === 'date_from') setDateFrom(value);
        if (key === 'date_to') setDateTo(value);
        if (key === 'efectividad') setEffectiveness(value);

        // Ensure date fields use the new value if they are the one being changed
        if (key === 'date_from') newFilters.date_from = value;
        if (key === 'date_to') newFilters.date_to = value;
        if (key === 'efectividad') newFilters.efectividad = value;

        router.get(route('dashboard'), cleanParams(newFilters), {
            preserveState: true,
            replace: true,
        });
    };

    const openObservationModal = (negotiation: NegotiationRecord) => {
        setSelectedNegotiation(negotiation);
        setObservationText(negotiation.supervisorObservation || '');
        setIsObservationModalOpen(true);
    };

    const handleSaveObservation = async () => {
        if (!selectedNegotiation) return;

        try {
            await axios.patch(`/negociacion/${selectedNegotiation.id}`, {
                observacion_supervisor: observationText,
            });

            // Reload to show changes
            window.location.reload();
        } catch (error) {
            console.error('Error updating observation:', error);
            alert('Error al guardar la observación');
        }
    };
    const updateEffectiveness = async (id: number, value: string) => {
        if (readOnly) return;
        try {
            // Map string values to integers for the backend
            let effectiveInt = 0; // Pendiente
            if (value === 'Efectiva') effectiveInt = 1;
            if (value === 'No Efectiva') effectiveInt = 2;

            await axios.patch(`/negociacion/${id}`, {
                efectividad: effectiveInt,
            });

            // Reload the page to reflect changes (simplest approach for now)
            window.location.reload();
        } catch (error) {
            console.error('Error updating effectiveness:', error);
            alert('Error al actualizar la efectividad');
        }
    };

    return (
        <Card className="border-0">
            <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl font-semibold">
                        Tablero de Negociaciones
                    </CardTitle>
                    {!readOnly && <CreateNegotiationSheet />}
                </div>
                <div className="flex flex-col gap-4 pt-4 lg:flex-row lg:items-end">
                    <div className="relative flex-1">
                        <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Buscar por Compañía, ID Bitrix o Código FAR/Profit..."
                            className="pl-9"
                            value={search}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="grid w-full grid-cols-2 gap-2 lg:flex lg:w-auto">
                        <div className="grid gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Desde:
                            </label>

                            <Input
                                type="date"
                                className="w-full lg:w-[140px]"
                                value={dateFrom}
                                onChange={(e) =>
                                    handleFilterChange(
                                        'date_from',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="grid gap-1.5">
                            <label className="text-xs font-medium text-muted-foreground">
                                Hasta:
                            </label>

                            <Input
                                type="date"
                                className="w-full lg:w-[140px]"
                                value={dateTo}
                                onChange={(e) =>
                                    handleFilterChange(
                                        'date_to',
                                        e.target.value,
                                    )
                                }
                            />
                        </div>
                        <div className="col-span-2 grid gap-1.5 lg:col-span-1 lg:w-auto">
                            <label className="text-xs font-medium text-muted-foreground">
                                Efectividad:
                            </label>
                            <Select
                                value={effectiveness}
                                onValueChange={(value) =>
                                    handleFilterChange('efectividad', value)
                                }
                            >
                                <SelectTrigger className="w-full lg:w-[140px]">
                                    <SelectValue placeholder="Efectividad" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="todas">Todas</SelectItem>
                                    <SelectItem value="efectiva">
                                        Efectiva
                                    </SelectItem>
                                    <SelectItem value="no-efectiva">
                                        No Efectiva
                                    </SelectItem>
                                    <SelectItem value="pendiente">
                                        Pendiente
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md">
                    <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-xs font-medium text-muted-foreground uppercase">
                            <tr>
                                <th className="min-w-[120px] px-4 py-3 text-left">
                                    Fecha
                                </th>
                                <th className="max-w-[300px] px-4 py-3 text-left">
                                    Compañía
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Ejecutivo/a
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Tipo Negociación
                                </th>
                                <th className="px-4 py-3 text-left">
                                    Vendedor Asignado
                                </th>
                                <th className="max-w-[150px] px-4 py-3 text-left">
                                    Obs. Vendedor
                                </th>
                                <th className="px-4 py-3 text-center">
                                    Efectividad
                                </th>
                                <th className="px-4 py-3 text-right">
                                    Documento
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y">
                            {data.map((item) => (
                                <tr
                                    key={item.id}
                                    className="bg-card transition-colors hover:bg-muted/40"
                                >
                                    <td className="px-4 py-4 align-middle">
                                        <div className="font-medium text-foreground">
                                            {item.fecha}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-middle">
                                        <div
                                            className="max-w-[200px] truncate font-medium text-foreground"
                                            title={item.companyName}
                                        >
                                            {item.companyName}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            <span>{item.bitrixId}</span>
                                            <span className="text-muted-foreground/40">
                                                |
                                            </span>
                                            <span>{item.companyTar}</span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-middle">
                                        <span className="text-xs text-muted-foreground">
                                            {item.userCreator}
                                        </span>
                                    </td>
                                    <td className="px-4 py-4 align-middle">
                                        <Badge
                                            variant="secondary"
                                            className="border-blue-100 bg-blue-50 font-normal text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                                        >
                                            {item.negotiationType}
                                        </Badge>
                                    </td>
                                    <td className="px-4 py-4 align-middle">
                                        <div className="flex flex-col">
                                            <span
                                                className="max-w-[140px] truncate text-sm font-medium"
                                                title={item.salesPerson.name}
                                            >
                                                {item.salesPerson.name}
                                            </span>
                                            <span className="text-xs text-muted-foreground">
                                                {item.salesPerson.co_ven}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 align-middle">
                                        <div
                                            className="max-w-[150px] truncate text-xs text-muted-foreground"
                                            title={item.salesObservation}
                                        >
                                            {item.salesObservation}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center align-middle">
                                        <div className="flex justify-center">
                                            <Select
                                                defaultValue={
                                                    item.effectiveness
                                                }
                                                onValueChange={(value) =>
                                                    updateEffectiveness(
                                                        item.id,
                                                        value,
                                                    )
                                                }
                                                disabled={readOnly}
                                            >
                                                <SelectTrigger className="h-8 w-[130px] text-xs disabled:cursor-default disabled:opacity-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Efectiva">
                                                        <div className="flex items-center gap-2 text-green-600">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>
                                                                Efectiva
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="No Efectiva">
                                                        <div className="flex items-center gap-2 text-red-600">
                                                            <XCircle className="h-3.5 w-3.5" />
                                                            <span>
                                                                No Efectiva
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="Pendiente">
                                                        <div className="flex items-center gap-2 text-gray-500">
                                                            <Hourglass className="h-3.5 w-3.5" />
                                                            <span>
                                                                Pendiente
                                                            </span>
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-right align-middle">
                                        <div className="flex items-center justify-center gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-8 w-8',
                                                    item.hasNotes
                                                        ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400'
                                                        : 'text-muted-foreground',
                                                )}
                                                onClick={() =>
                                                    openObservationModal(item)
                                                }
                                            >
                                                <div className="relative">
                                                    <MessageSquare className="h-4 w-4" />
                                                    {item.hasNotes && (
                                                        <span className="absolute -top-1 -right-1 flex h-2 w-2">
                                                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-yellow-400 opacity-75"></span>
                                                            <span className="relative inline-flex h-2 w-2 rounded-full bg-yellow-500"></span>
                                                        </span>
                                                    )}
                                                </div>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'h-8 w-8',
                                                    item.hasPdf
                                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:text-red-400'
                                                        : 'text-muted-foreground opacity-50',
                                                )}
                                                disabled={!item.hasPdf}
                                                onClick={() =>
                                                    item.pdfUrl &&
                                                    window.open(
                                                        item.pdfUrl,
                                                        '_blank',
                                                    )
                                                }
                                            >
                                                <FileText className="h-4 w-4" />
                                            </Button>
                                            {/* <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:bg-muted"
                                            >
                                                <History className="h-4 w-4" />
                                            </Button> */}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </CardContent>

            <Dialog
                open={isObservationModalOpen}
                onOpenChange={setIsObservationModalOpen}
            >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Observación del Supervisor</DialogTitle>
                        <DialogDescription>
                            {isAdmin
                                ? 'Ingrese la observación para esta negociación.'
                                : 'Observación registrada por el supervisor.'}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="observation">Observación</Label>
                            <textarea
                                id="observation"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Escribe aquí..."
                                value={observationText}
                                onChange={(e) =>
                                    setObservationText(e.target.value)
                                }
                                disabled={!isAdmin}
                            />
                        </div>
                    </div>
                    {isAdmin && (
                        <DialogFooter>
                            <Button
                                variant="outline"
                                onClick={() => setIsObservationModalOpen(false)}
                            >
                                Cancelar
                            </Button>
                            <Button onClick={handleSaveObservation}>
                                Guardar
                            </Button>
                        </DialogFooter>
                    )}
                </DialogContent>
            </Dialog>
        </Card>
    );
}
