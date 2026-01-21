<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Vendedor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Negociacion;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\NegociacionesExport;
    
class NegociacionesController extends Controller
{
    public function export(Request $request) 
    {
        return Excel::download(new NegociacionesExport($request), 'negociaciones.xlsx');
    }

    public function index(Request $request)
    {
        $readOnly = false;
        $query = Negociacion::with('user');

        if ($request->has('ven')) {
            $query->where('co_ven', $request->ven);
            $readOnly = true;
        } else {
            if (!auth()->check()) {
                return redirect()->route('login');
            }
            
            // Check roles
            if (!auth()->user()->isAdmin()) {
                $query->where('user_id', auth()->id());
            }
        }

        // Filters
        if ($request->has('search') && $request->search != '') {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('bitrix_id', 'like', "%{$search}%")
                    ->orWhere('bitrix_name', 'like', "%{$search}%")
                    ->orWhere('bitrix_far', 'like', "%{$search}%")
                    ->orWhereHas('user', function($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        if ($request->has('date_from') && $request->date_from != '') {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to') && $request->date_to != '') {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        if ($request->has('efectividad') && $request->efectividad != '' && $request->efectividad != 'todas') {
            $efectividadMap = [
                'efectiva' => 1,
                'no-efectiva' => 2,
                'pendiente' => 0,
            ];
            if (isset($efectividadMap[$request->efectividad])) {
                $query->where('efectividad', $efectividadMap[$request->efectividad]);
            }
        }

        $negotiations = $query->orderBy('created_at', 'desc')
            ->get();

        $negotiations = $negotiations->map(function ($negociacion) {
                // Initials logic
                $parts = explode(' ', $negociacion->vendedor);
                $initials = '';
                if (count($parts) > 0) $initials .= strtoupper(substr($parts[0], 0, 1));
                if (count($parts) > 1) $initials .= strtoupper(substr($parts[1], 0, 1));

                // Effectiveness logic
                $effectiveness = 'Pendiente';
                if ($negociacion->efectividad === 1) $effectiveness = 'Efectiva';
                if ($negociacion->efectividad === 2) $effectiveness = 'No Efectiva';

                return [
                    'id' => $negociacion->id,
                    'fecha' => $negociacion->fecha_negociacion 
                        ? $negociacion->fecha_negociacion->translatedFormat('d M Y') 
                        : $negociacion->created_at->translatedFormat('d M Y'),
                    'bitrixId' => $negociacion->bitrix_id,
                    'companyName' => $negociacion->bitrix_name,
                    'companyTar' => $negociacion->bitrix_far,
                    'userCreator' => $negociacion->user ? $negociacion->user->name : 'Desconocido',
                    'negotiationType' => $negociacion->tipo_negociacion,
                    'salesPerson' => [
                        'name' => $negociacion->vendedor,
                        'initials' => $initials,
                        'co_ven' => $negociacion->co_ven,
                    ],
                    'salesObservation' => $this->observacion($negociacion->bitrix_far, $negociacion->fecha_negociacion),
                    'effectiveness' => $effectiveness,
                    'hasPdf' => !empty($negociacion->documento),
                    'pdfUrl' => !empty($negociacion->documento) ? asset('storage/negociaciones/' . $negociacion->documento) : null,
                    'hasHistory' => false, // Placeholder
                    'hasNotes' => !empty($negociacion->observacion_supervisor),
                    'notesCount' => !empty($negociacion->observacion_supervisor) ? 1 : 0,
                    'supervisorObservation' => $negociacion->observacion_supervisor,
                    'notaEntrega' => $negociacion->nota_entrega,
                ];
            });
    
        return Inertia::render('dashboard', [
            'negotiations' => $negotiations,
            'readOnly' => $readOnly,
            'isAdmin' => auth()->check() ? auth()->user()->isAdmin() : false,
            'filters' => $request->only(['search', 'date_from', 'date_to', 'efectividad']),
        ]);
    }

    public function store(Request $request) 
    {
        $validatedData = $request->validate([
            'bitrix_id' => 'required',
            'bitrix_name' => 'required',
            'bitrix_far' => 'required',
            'vendedor' => 'required',
            'co_ven' => 'required',
            'tipo_negociacion' => 'required',
            'documento' => 'required|file|mimes:pdf',
            'fecha_negociacion' => 'nullable|date',
        ]);

        $fileName = null;
        if ($request->hasFile('documento')) {
            $file = $request->file('documento');
            $fileName = time() . '_' . $file->getClientOriginalName();
            $path = $file->storeAs('negociaciones', $fileName, 'public');
        }

        $negociacion = Negociacion::create([
            'bitrix_id' => $validatedData['bitrix_id'],
            'bitrix_name' => $validatedData['bitrix_name'],
            'bitrix_far' => $validatedData['bitrix_far'],
            'vendedor' => $validatedData['vendedor'],
            'co_ven' => $validatedData['co_ven'],
            'tipo_negociacion' => $validatedData['tipo_negociacion'],
            'documento' => $fileName,
            'user_id' => auth()->user()->id,
            'fecha_negociacion' => $validatedData['fecha_negociacion'] ?? now(),
        ]);

        if($negociacion) {
            return response()->json(['message' => 'Negociación guardada correctamente']);
        }

        return response()->json(['message' => 'Error al guardar la negociación'], 500);
    }

    public function create()
    {
        $vendedores = Vendedor::select('nombre', 'co_ven')->where('rol', 'vendedor')->get();
        return response()->json([
            'vendedores' => $vendedores,
            'usuario' => auth()->user(),
        ]);
    }

    public function observacion($far, $fecha) {
        $observaciones = DB::connection('mysql-app')
            ->table('gestiones')
            ->select('venta_descripcion', 'cobranza_descripcion')
            ->where('co_cli', $far)
            ->whereDate('fecha_registro', $fecha)
            ->orderBy('fecha_registro', 'desc')
            ->first();

        $observacion = ($observaciones?->venta_descripcion ?? '') . ($observaciones?->cobranza_descripcion ?? '');
        
        return trim($observacion);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'efectividad' => 'nullable|integer|in:0,1,2',
            'observacion_supervisor' => 'nullable|string',
            'nota_entrega' => 'nullable|string',
        ]);

        $negociacion = Negociacion::findOrFail($id);
        
        if ($request->has('efectividad')) {
            $negociacion->efectividad = $request->efectividad;
        }

        if ($request->has('observacion_supervisor') && auth()->user()->isAdmin()) {
            $negociacion->observacion_supervisor = $request->observacion_supervisor;
        }

        if ($request->has('nota_entrega')) {
            $negociacion->nota_entrega = $request->nota_entrega;
        }

        $negociacion->save();

        return response()->json(['message' => 'Negociación actualizada correctamente']);
    }

    public function destroy($id)
    {
        if (!auth()->check() || !auth()->user()->isAdmin()) {
            return response()->json(['message' => 'No autorizado'], 403);
        }

        $negociacion = Negociacion::findOrFail($id);
        
        // Delete associated document if exists
        if ($negociacion->documento) {
            $filePath = storage_path('app/public/negociaciones/' . $negociacion->documento);
            if (file_exists($filePath)) {
                unlink($filePath);
            }
        }

        $negociacion->delete();

        return response()->json(['message' => 'Negociación eliminada correctamente']);
    }
}
