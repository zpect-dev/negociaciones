<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Negociacion extends Model
{
    protected $connection = 'mysql';
    protected $table = 'negociaciones';

    protected $fillable = [
        'bitrix_id',
        'bitrix_name',
        'bitrix_far',
        'vendedor',
        'tipo_negociacion',
        'documento',
        'observacion',
        'user_id',
        'co_ven',
        'efectividad',
        'observacion_supervisor',
    ];
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}