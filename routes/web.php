<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;
use App\Http\Controllers\NegociacionesController;
use App\Http\Controllers\Auth\DirectPasswordResetController;

Route::get('/', function () {
    return redirect()->route('login');
})->name('home');

Route::middleware('guest')->group(function () {
    Route::get('recover-password', [DirectPasswordResetController::class, 'show'])->name('password.recover');
    Route::post('recover-password', [DirectPasswordResetController::class, 'store'])->name('password.recover.store');
});

Route::get('dashboard', [NegociacionesController::class, 'index'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('vendedores', [NegociacionesController::class, 'create'])->name('vendedores');
    Route::get('observacion/{far}', [NegociacionesController::class, 'observacion'])->name('observacion');
    Route::post('negociacion', [NegociacionesController::class, 'store'])->name('negociacion.store');
    Route::patch('negociacion/{id}', [NegociacionesController::class, 'update'])->name('negociacion.update');
});

require __DIR__.'/settings.php';
