[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [switch]$WithSeed,

    [Parameter(Mandatory=$false)]
    [string]$DatabaseUrl = ""
)

# 1. Cargar variables de entorno desde el .env raiz
$EnvFile = "$PSScriptRoot\..\.env"
if (Test-Path $EnvFile) {
    Get-Content $EnvFile | ForEach-Object {
        $line = $_.Trim()
        if ($line -and -not $line.StartsWith("#") -and $line.Contains("=")) {
            $parts = $line.Split("=", 2)
            $name = $parts[0].Trim()
            $val = $parts[1].Trim()
            [System.Environment]::SetEnvironmentVariable($name, $val, "Process")
        }
    }
}

if (-not $DatabaseUrl) {
    $DatabaseUrl = [System.Environment]::GetEnvironmentVariable("DATABASE_URL")
}

if (-not $DatabaseUrl) {
    Write-Error "❌ Error: DATABASE_URL no esta definido en el archivo .env ni fue suministrado como parametro."
    exit 1
}

$ProjectRef = [System.Environment]::GetEnvironmentVariable("SUPABASE_PROJECT_REF")

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Despliegue Backend Patricia — Supabase Cloud" -ForegroundColor Cyan
if ($ProjectRef) {
    Write-Host "   Proyecto: $ProjectRef" -ForegroundColor DarkGray
}
Write-Host "==========================================" -ForegroundColor Cyan

# 2. Ejecutar Migraciones DDL/DML pendientes en Supabase Cloud
Write-Host "`n[1/2] Aplicando migraciones pendientes en PostgreSQL..." -ForegroundColor Yellow
npx supabase db push --remote="$DatabaseUrl" --yes
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Error al aplicar migraciones en Supabase Cloud. Despliegue abortado."
    exit 1
}
Write-Host "✅ Migraciones aplicadas exitosamente." -ForegroundColor Green

# 3. Ejecutar Seeds de forma controlada
if ($WithSeed) {
    Write-Host "`n[2/2] 🌱 Ejecutando Seeds idempotentes en Supabase Cloud..." -ForegroundColor Magenta
    $DenoBin = "$HOME\.deno\bin\deno.exe"
    if (-not (Test-Path $DenoBin)) { $DenoBin = "deno" }
    
    & $DenoBin run --allow-net --allow-env --allow-read "$PSScriptRoot\run-seed.ts"
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Seeds aplicados exitosamente." -ForegroundColor Green
    } else {
        Write-Warning "⚠️ Advertencia al ejecutar seeds."
    }
} else {
    Write-Host "`n[2/2] ⏭️ Omitiendo seeds (ejecute con -WithSeed para sembrar usuarios y datos demo)." -ForegroundColor DarkGray
}

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "🎉 Base de Datos sincronizada con exito!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
