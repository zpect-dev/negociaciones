<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('negociaciones', function (Blueprint $table) {
            $table->id();
            $table->string('bitrix_id');
            $table->string('bitrix_name');
            $table->string('bitrix_far');
            $table->foreignId('user_id')->constrained('users');
            $table->string('tipo_negociacion');
            $table->string('vendedor');
            $table->string('observacion')->nullable();
            $table->tinyInteger('efectividad')->default(0);
            $table->string('documento');
            $table->string('observacion_supervisor');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('negociaciones');
    }
};
