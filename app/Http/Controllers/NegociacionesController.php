<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Models\Vendedor;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\Negociacion;
    
class NegociacionesController extends Controller
{
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
                    ->orWhere('bitrix_far', 'like', "%{$search}%");
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
                    'fecha' => $negociacion->created_at->translatedFormat('d M Y'),
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
                    'salesObservation' => $negociacion->observacion,
                    'effectiveness' => $effectiveness,
                    'hasPdf' => !empty($negociacion->documento),
                    'pdfUrl' => !empty($negociacion->documento) ? asset('storage/negociaciones/' . $negociacion->documento) : null,
                    'hasHistory' => false, // Placeholder
                    'hasNotes' => !empty($negociacion->observacion_supervisor),
                    'notesCount' => !empty($negociacion->observacion_supervisor) ? 1 : 0,
                    'supervisorObservation' => $negociacion->observacion_supervisor,
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
            'observacion' => 'nullable',
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
            'observacion' => $validatedData['observacion'] ?? null,
            'user_id' => auth()->user()->id,
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

    public function observacion($far) {
        $observacion = DB::connection('mysql-app')
            ->table('gestiones')
            ->select('venta_descripcion', 'cobranza_descripcion')
            ->where('co_cli', $far)
            ->orderBy('fecha_registro', 'desc')
            ->first();
        return response()->json([
            'observacion' => $observacion
        ]);
    }

    public function update(Request $request, $id)
    {
        $request->validate([
            'efectividad' => 'nullable|integer|in:0,1,2',
            'observacion_supervisor' => 'nullable|string',
        ]);

        $negociacion = Negociacion::findOrFail($id);
        
        if ($request->has('efectividad')) {
            $negociacion->efectividad = $request->efectividad;
        }

        if ($request->has('observacion_supervisor') && auth()->user()->isAdmin()) {
            $negociacion->observacion_supervisor = $request->observacion_supervisor;
        }

        $negociacion->save();

        return response()->json(['message' => 'Negociación actualizada correctamente']);
    }
}
