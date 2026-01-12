<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;

class DirectPasswordResetController extends Controller
{
    /**
     * Display the password reset view.
     */
    public function show()
    {
        return Inertia::render('auth/recover-password');
    }

    /**
     * Handle an incoming password reset request.
     */
    public function store(Request $request)
    {
        $request->validate([
            'cedula' => 'required|string|exists:users,cedula',
            'password' => 'required|string|confirmed|min:8',
        ]);

        $user = User::where('cedula', $request->cedula)->first();

        if (!$user) {
            throw ValidationException::withMessages([
                'cedula' => ['No podemos encontrar un usuario con esa cédula.'],
            ]);
        }

        $user->forceFill([
            'password' => Hash::make($request->password),
        ])->save();

        return redirect()->route('login')->with('status', 'Tu contraseña ha sido restablecida.');
    }
}
