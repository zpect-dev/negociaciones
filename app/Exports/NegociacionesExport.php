<?php

namespace App\Exports;

use App\Models\Negociacion;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class NegociacionesExport implements FromCollection, WithHeadings, WithMapping, WithStyles, ShouldAutoSize
{
    protected $request;

    public function __construct($request)
    {
        $this->request = $request;
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1    => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => [
                    'fillType' => \PhpOffice\PhpSpreadsheet\Style\Fill::FILL_SOLID,
                    'startColor' => [
                        'rgb' => '22c55e', // Tailwind green-500 equivalent
                    ],
                ],
            ],
        ];
    }

    public function collection()
    {
        $query = Negociacion::with('user');

         if ($this->request->has('ven')) {
            $query->where('co_ven', $this->request->ven);
        } else {
            if (!auth()->check()) {
                 return collect([]);
            }
            
            // Check roles
            if (!auth()->user()->isAdmin()) {
                $query->where('user_id', auth()->id());
            }
        }

        // Filters
        if ($this->request->has('search') && $this->request->search != '') {
            $search = $this->request->search;
            $query->where(function($q) use ($search) {
                $q->where('bitrix_id', 'like', "%{$search}%")
                    ->orWhere('bitrix_name', 'like', "%{$search}%")
                    ->orWhere('bitrix_far', 'like', "%{$search}%")
                    ->orWhereHas('user', function($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($this->request->has('date_from') && $this->request->date_from != '') {
            $query->whereDate('created_at', '>=', $this->request->date_from);
        }

        if ($this->request->has('date_to') && $this->request->date_to != '') {
            $query->whereDate('created_at', '<=', $this->request->date_to);
        }

        if ($this->request->has('efectividad') && $this->request->efectividad != '' && $this->request->efectividad != 'todas') {
             $efectividadMap = [
                'efectiva' => 1,
                'no-efectiva' => 2,
                'pendiente' => 0,
            ];
            if (isset($efectividadMap[$this->request->efectividad])) {
                $query->where('efectividad', $efectividadMap[$this->request->efectividad]);
            }
        }

        return $query->orderBy('created_at', 'desc')->get();
    }

    public function map($negociacion): array
    {
        $effectiveness = 'Pendiente';
        if ($negociacion->efectividad === 1) $effectiveness = 'Efectiva';
        if ($negociacion->efectividad === 2) $effectiveness = 'No Efectiva';

        return [
            $negociacion->created_at->format('d/m/Y'),
            $negociacion->bitrix_name,
            $negociacion->bitrix_id,
            $negociacion->bitrix_far,
            $negociacion->user ? $negociacion->user->name : 'Desconocido', // Ejecutivo
            $negociacion->tipo_negociacion,
            $negociacion->vendedor, // Vendedor Asignado
            $negociacion->co_ven,
            $negociacion->observacion, // Obs. Vendedor
            $negociacion->nota_entrega,
            $effectiveness,
            $negociacion->observacion_supervisor,
        ];
    }

    public function headings(): array
    {
        return [
            'Fecha',
            'Compañía',
            'ID Bitrix',
            'ID Profit/FAR',
            'Ejecutivo',
            'Tipo Negociación',
            'Vendedor Asignado',
            'Código Vendedor',
            'Obs. Vendedor',
            'Nota Entrega',
            'Efectividad',
            'Obs. Supervisor',
        ];
    }
}
