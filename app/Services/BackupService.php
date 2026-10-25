<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schema;
use Native\Mobile\Facades\Share;

final class BackupService
{
    /**
     * Order matters only for readability; restore disables foreign keys.
     *
     * @var list<string>
     */
    private const TABLES = [
        'settings',
        'accounts',
        'categories',
        'transactions',
        'people',
        'loans',
        'installments',
        'debts',
        'cheques',
        'assets',
        'lots',
        'goals',
        'budgets',
        'scenarios',
    ];

    public function exportJson(): string
    {
        $tables = [];
        foreach (self::TABLES as $table) {
            $tables[$table] = DB::table($table)->get()->map(fn (object $row): array => (array) $row)->all();
        }

        return (string) json_encode([
            'app' => 'hesab-plus',
            'version' => 1,
            'created_at' => now()->toIso8601String(),
            'tables' => $tables,
        ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    }

    /**
     * @return array{path: string, name: string, size: int, rows: int}
     */
    public function createBackup(): array
    {
        $directory = $this->directory();
        File::ensureDirectoryExists($directory);
        $name = 'hesab-backup-'.now()->format('Ymd-His').'.json';
        $path = $directory.DIRECTORY_SEPARATOR.$name;
        $json = $this->exportJson();
        File::put($path, $json);

        $rows = 0;
        $decoded = json_decode($json, true);
        foreach (($decoded['tables'] ?? []) as $tableRows) {
            $rows += is_array($tableRows) ? count($tableRows) : 0;
        }

        return [
            'path' => $path,
            'name' => $name,
            'size' => File::size($path),
            'rows' => $rows,
        ];
    }

    public function latestBackupPath(): ?string
    {
        $files = File::glob($this->directory().DIRECTORY_SEPARATOR.'hesab-backup-*.json') ?: [];
        if ($files === []) {
            return null;
        }
        usort($files, fn (string $a, string $b): int => filemtime($b) <=> filemtime($a));

        return $files[0];
    }

    public function importFile(string $path): bool
    {
        if (! File::exists($path)) {
            return false;
        }

        return $this->importJson((string) File::get($path));
    }

    public function importJson(string $json): bool
    {
        $decoded = json_decode($json, true);
        if (! is_array($decoded) || ($decoded['app'] ?? null) !== 'hesab-plus' || ! is_array($decoded['tables'] ?? null)) {
            return false;
        }

        $tables = $decoded['tables'];
        foreach (self::TABLES as $table) {
            if (! array_key_exists($table, $tables) || ! is_array($tables[$table])) {
                return false;
            }
        }

        Schema::disableForeignKeyConstraints();
        try {
            DB::transaction(function () use ($tables): void {
                foreach (array_reverse(self::TABLES) as $table) {
                    DB::table($table)->delete();
                }
                foreach (self::TABLES as $table) {
                    $rows = $tables[$table];
                    foreach (array_chunk($rows, 100) as $chunk) {
                        DB::table($table)->insert($chunk);
                    }
                }
            });
        } finally {
            Schema::enableForeignKeyConstraints();
        }

        return true;
    }

    public function share(string $path): void
    {
        Share::file('حساب+', 'نسخه پشتیبان حساب+', $path);
    }

    public function directory(): string
    {
        return storage_path('app'.DIRECTORY_SEPARATOR.'backups');
    }
}
