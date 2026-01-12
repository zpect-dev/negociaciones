import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import AuthLayout from '@/layouts/auth-layout';
import { Head, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

declare var route: any;

export default function RecoverPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors, reset } = useForm({
        cedula: '',
        password: '',
        password_confirmation: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('password.recover.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <AuthLayout
            title="Recuperar Contraseña"
            description="Ingresa tu cédula y tu nueva contraseña."
        >
            <Head title="Recuperar Contraseña" />

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <form onSubmit={submit} className="flex flex-col gap-6">
                <div className="grid gap-6">
                    <div className="grid gap-2">
                        <Label htmlFor="cedula">Cédula</Label>
                        <Input
                            id="cedula"
                            type="text"
                            name="cedula"
                            value={data.cedula}
                            className="block w-full"
                            autoComplete="username"
                            autoFocus
                            onChange={(e) => setData('cedula', e.target.value)}
                            placeholder="V-12345678"
                        />
                        <InputError message={errors.cedula} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password">Nueva Contraseña</Label>
                        <Input
                            id="password"
                            type="password"
                            name="password"
                            value={data.password}
                            className="block w-full"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password', e.target.value)
                            }
                            placeholder="********"
                        />
                        <InputError message={errors.password} />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="password_confirmation">
                            Confirmar Contraseña
                        </Label>
                        <Input
                            id="password_confirmation"
                            type="password"
                            name="password_confirmation"
                            value={data.password_confirmation}
                            className="block w-full"
                            autoComplete="new-password"
                            onChange={(e) =>
                                setData('password_confirmation', e.target.value)
                            }
                            placeholder="********"
                        />
                        <InputError message={errors.password_confirmation} />
                    </div>

                    <Button className="w-full" disabled={processing}>
                        {processing && <Spinner className="mr-2" />}
                        Restablecer Contraseña
                    </Button>
                </div>
            </form>
        </AuthLayout>
    );
}
