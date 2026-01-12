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
        Schema::table('negociaciones', function (Blueprint $table) {
            $table->string('co_ven')->after('vendedor');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('negociaciones', function (Blueprint $table) {
            $table->dropColumn('co_ven');
        });
    }
};
