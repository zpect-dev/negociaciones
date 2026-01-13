import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Sheet,
    SheetContent,
    SheetFooter,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
} from '@/components/ui/sheet';
import axios from '@/lib/axios';
import { cn } from '@/lib/utils';
import {
    Combobox,
    ComboboxButton,
    ComboboxInput,
    ComboboxOption,
    ComboboxOptions,
} from '@headlessui/react';
import { router } from '@inertiajs/react';
import { AxiosError } from 'axios';
import {
    Calendar,
    Check,
    ChevronsUpDown,
    Loader2,
    Search,
    User,
} from 'lucide-react';
import { useState } from 'react';

export function CreateNegotiationSheet({
    trigger,
}: {
    trigger?: React.ReactNode;
}) {
    const [companyId, setCompanyId] = useState('');
    const [companyData, setCompanyData] = useState<{
        ID: string;
        TITLE: string;
        UF_CRM_1634787828: string;
    } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Vendedores State
    const [vendedores, setVendedores] = useState<
        { nombre: string; co_ven: string }[]
    >([]);
    const [observacion, setObservacion] = useState<string | null>(null);
    const [usuario, setUsuario] = useState<{ name: string } | null>(null);
    const [selectedVendedor, setSelectedVendedor] = useState<{
        nombre: string;
        co_ven: string;
    } | null>(null);
    const [negotiationType, setNegotiationType] = useState('');
    const [pdfFile, setPdfFile] = useState<File | null>(null);
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');

    const filteredVendedores =
        query === ''
            ? vendedores
            : vendedores.filter((person) => {
                  const q = query.toLowerCase();
                  return (
                      person.nombre.toLowerCase().includes(q) ||
                      person.co_ven.toLowerCase().includes(q)
                  );
              });

    const crearNegociacion = async () => {
        setLoading(true);
        setError(null);

        try {
            const respuesta = await axios.get('/vendedores');
            const data = respuesta.data;

            setVendedores(data.vendedores || []);
            setUsuario(data.usuario);
        } catch (err: unknown) {
            const axiosError = err as AxiosError<{ message: string }>;
            setError(
                axiosError.response?.data?.message ||
                    'Error al obtener lista de vendedores',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!companyId) return;

        setLoading(true);
        setError(null);
        setCompanyData(null);
        setObservacion(null);

        try {
            const response = await fetch(
                `https://b24-sjdauj.bitrix24.es/rest/5149/qly93wxo8xvetemt/crm.company.list.json?FILTER[UF_CRM_1634787828]=${companyId}&SELECT[]=ID&SELECT[]=TITLE&SELECT[]=UF_CRM_1634787828`,
            );
            const data = await response.json();

            if (data.result && data.result.length > 0) {
                const company = data.result[0];
                let obsText: string | null = null;

                if (company.UF_CRM_1634787828) {
                    try {
                        // Internal call -> Use axios
                        const obsResponse = await axios.get(
                            `/observacion/${company.UF_CRM_1634787828}`,
                        );
                        const obsData = obsResponse.data;
                        if (obsData) {
                            obsText =
                                obsData.observacion?.venta_descripcion ??
                                '' +
                                    (obsData.observacion
                                        ?.cobranza_descripcion ?? '');
                        }
                    } catch (e) {
                        console.error('Error fetching observation', e);
                    }
                }

                // Now set all data
                setCompanyData(company);
                setObservacion(obsText);
            } else {
                setError('Compañía no encontrada');
            }
        } catch {
            setError('Error al buscar la compañía');
        } finally {
            setLoading(false);
        }
    };

    const resetFields = () => {
        setCompanyId('');
        setCompanyData(null);
        setVendedores([]);
        setObservacion(null);
        // setUsuario(null);
        setSelectedVendedor(null);
        setNegotiationType('');
        setPdfFile(null);
        setQuery('');
        setError(null);
        setLoading(false);
    };

    const handleOpenChange = (isOpen: boolean) => {
        setOpen(isOpen);
        if (!isOpen) {
            resetFields();
        }
    };

    const handleSubmit = async () => {
        if (!companyData) {
            setError('Debe buscar y seleccionar una compañía.');
            return;
        }

        if (!selectedVendedor) {
            setError('Debe asignar un vendedor.');
            return;
        }

        setLoading(true);
        setError(null);

        const formData = new FormData();
        formData.append('bitrix_id', companyData.ID);
        formData.append('bitrix_name', companyData.TITLE);
        formData.append('bitrix_far', companyData.UF_CRM_1634787828);
        formData.append('vendedor', selectedVendedor.nombre);
        formData.append('co_ven', selectedVendedor.co_ven);

        if (negotiationType) {
            formData.append('tipo_negociacion', negotiationType);
        }

        if (pdfFile) {
            formData.append('documento', pdfFile);
        }

        if (observacion) {
            formData.append('observacion', observacion);
        }

        try {
            // Axios automatically handles content-type for FormData
            await axios.post('/negociacion', formData);

            setOpen(false); // This will trigger resetFields via handleOpenChange
            router.visit(window.location.href, {
                only: ['negotiations'],
                preserveScroll: true,
                preserveState: true,
            });
        } catch {
            setError('Error al guardar la negociación.');
        } finally {
            setLoading(false);
        }
    };

    const isFormValid =
        !!companyData &&
        !!selectedVendedor &&
        !!negotiationType.trim() &&
        !!pdfFile;

    return (
        <Sheet open={open} onOpenChange={handleOpenChange}>
            <SheetTrigger asChild>
                {trigger || (
                    <Button onClick={crearNegociacion} disabled={loading}>
                        Nueva Negociación
                    </Button>
                )}
            </SheetTrigger>
            <SheetContent className="w-full overflow-y-auto sm:max-w-[540px]">
                <div className="mx-auto w-full max-w-lg px-8 py-10">
                    <SheetHeader className="mb-8 text-center">
                        <SheetTitle className="text-2xl">
                            Crear Nueva Negociación
                        </SheetTitle>
                    </SheetHeader>
                    <div className="grid gap-6">
                        {/* Auto-fields Section */}
                        <div className="flex items-center justify-around gap-4 rounded-lg border bg-muted/50 p-4">
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Fecha de Registro
                                </Label>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                    {new Date().toLocaleDateString('es-ES', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </div>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs text-muted-foreground">
                                    Usuario Responsable
                                </Label>
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <User className="h-4 w-4 text-muted-foreground" />
                                    {usuario?.name}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>ID de la Compañía</Label>
                            <div className="flex gap-2">
                                <Input
                                    value={companyId}
                                    onChange={(e) =>
                                        setCompanyId(e.target.value)
                                    }
                                    placeholder="Ingrese ID..."
                                />
                                <Button
                                    size="icon"
                                    onClick={handleSearch}
                                    disabled={loading || !companyId}
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <Search className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            {error && (
                                <p className="text-sm text-red-500">{error}</p>
                            )}
                            {companyData && (
                                <div className="rounded-md border p-3 text-sm">
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="font-semibold">
                                                ID Bitrix:
                                            </span>{' '}
                                            {companyData.ID}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-semibold">
                                                Compañia:
                                            </span>{' '}
                                            {companyData.TITLE}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-semibold">
                                                FAR:
                                            </span>{' '}
                                            {companyData.UF_CRM_1634787828}
                                        </div>
                                        <div className="col-span-2">
                                            <span className="font-semibold">
                                                Observación:
                                            </span>{' '}
                                            {observacion}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="type">Tipo de Negociación</Label>
                            <Input
                                id="type"
                                value={negotiationType}
                                onChange={(e) =>
                                    setNegotiationType(e.target.value)
                                }
                                placeholder="Ej. Laboratorios, Alta Rotación..."
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="salesperson">
                                Vendedor Asignado
                            </Label>
                            <Combobox
                                value={selectedVendedor}
                                onChange={setSelectedVendedor}
                                onClose={() => setQuery('')}
                            >
                                {/* 1. ESTE DIV RELATIVE AHORA ENVUELVE TODO */}
                                <div className="relative">
                                    <ComboboxInput
                                        className={cn(
                                            'flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                                        )}
                                        displayValue={(person: {
                                            nombre: string;
                                            co_ven: string;
                                        }) => person?.nombre}
                                        onChange={(event) =>
                                            setQuery(event.target.value)
                                        }
                                        placeholder="Buscar vendedor..."
                                    />

                                    <ComboboxButton className="absolute inset-y-0 right-0 flex items-center pr-2">
                                        <ChevronsUpDown
                                            className="h-4 w-4 text-muted-foreground"
                                            aria-hidden="true"
                                        />
                                    </ComboboxButton>

                                    {/* 2. MOVÍ LAS OPCIONES AQUÍ ADENTRO */}
                                    <ComboboxOptions className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md focus:outline-none sm:text-sm">
                                        {/* Nota: Eliminé max-w-[90vw], min-w-[200px] y sm:max-w-md para que obedezca al w-full del padre */}

                                        {filteredVendedores.length === 0 &&
                                        query !== '' ? (
                                            <div className="relative cursor-default px-4 py-2 text-muted-foreground select-none">
                                                No se encontraron vendedores.
                                            </div>
                                        ) : (
                                            filteredVendedores.map((person) => (
                                                <ComboboxOption
                                                    key={person.nombre}
                                                    className={({ focus }) =>
                                                        cn(
                                                            'relative cursor-default rounded-sm py-1.5 pr-2 pl-8 text-sm outline-none select-none',
                                                            focus
                                                                ? 'bg-accent text-accent-foreground'
                                                                : '',
                                                        )
                                                    }
                                                    value={person}
                                                >
                                                    {({ selected }) => (
                                                        <>
                                                            <span
                                                                className={cn(
                                                                    'block truncate',
                                                                    selected
                                                                        ? 'font-medium'
                                                                        : 'font-normal',
                                                                )}
                                                            >
                                                                {person.nombre}{' '}
                                                                <span className="text-muted-foreground">
                                                                    (
                                                                    {
                                                                        person.co_ven
                                                                    }
                                                                    )
                                                                </span>
                                                            </span>
                                                            {selected ? (
                                                                <span className="absolute inset-y-0 left-0 flex items-center pl-2 text-primary">
                                                                    <Check
                                                                        className="h-4 w-4"
                                                                        aria-hidden="true"
                                                                    />
                                                                </span>
                                                            ) : null}
                                                        </>
                                                    )}
                                                </ComboboxOption>
                                            ))
                                        )}
                                    </ComboboxOptions>
                                </div>{' '}
                                {/* FIN DEL DIV RELATIVE */}
                            </Combobox>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="pdf">Archivo PDF</Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    id="pdf"
                                    type="file"
                                    accept=".pdf"
                                    onChange={(e) =>
                                        setPdfFile(
                                            e.target.files
                                                ? e.target.files[0]
                                                : null,
                                        )
                                    }
                                    className="cursor-pointer file:text-foreground"
                                />
                            </div>
                        </div>
                    </div>
                    <SheetFooter className="mt-8 sm:justify-center">
                        <Button
                            type="submit"
                            onClick={handleSubmit}
                            className="w-full sm:w-auto"
                            disabled={loading || !isFormValid}
                        >
                            {loading && (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Guardar Negociación
                        </Button>
                    </SheetFooter>
                </div>
            </SheetContent>
        </Sheet>
    );
}
