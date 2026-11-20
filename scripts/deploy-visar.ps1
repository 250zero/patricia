[CmdletBinding()]
param(
    [Parameter(Mandatory=$false)]
    [string]$HostServer = "",

    [Parameter(Mandatory=$false)]
    [string]$User = ""
)

# Cargar variables de entorno desde el .env raiz
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

if (-not $HostServer) {
    $HostServer = [System.Environment]::GetEnvironmentVariable("VISAR_HOST")
    if (-not $HostServer) { $HostServer = "159.203.103.8" }
}
if (-not $User) {
    $User = [System.Environment]::GetEnvironmentVariable("VISAR_USER")
    if (-not $User) { $User = "root" }
}
$Domain = [System.Environment]::GetEnvironmentVariable("VISAR_DOMAIN")
if (-not $Domain) { $Domain = "patricia.vis7ar.com" }

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "🚀 Despliegue Patricia en Servidor Visar ($HostServer)" -ForegroundColor Cyan
Write-Host "   Dominio: https://$Domain" -ForegroundColor DarkGray
Write-Host "==========================================" -ForegroundColor Cyan

# 1. Compilacion de PWA Angular si existe pwa/package.json
$PwaDir = "$PSScriptRoot\..\pwa"
if (Test-Path "$PwaDir\package.json") {
    Write-Host "`n[1/5] Compilando PWA Angular..." -ForegroundColor Yellow
    Set-Location -Path $PwaDir
    npm run build -- --configuration production
    if ($LASTEXITCODE -ne 0) {
        Write-Error "❌ Error al compilar PWA Angular."
        Set-Location -Path "$PSScriptRoot\.."
        exit 1
    }
    Set-Location -Path "$PSScriptRoot\.."
    Write-Host "✅ PWA compilada correctamente." -ForegroundColor Green
} else {
    Write-Host "`n[1/5] PWA en construccion. Usando mock interactivo de alta fidelidad como vista inicial..." -ForegroundColor Yellow
    # Asegurar carpeta dist local temporal para sincronizar
    New-Item -ItemType Directory -Force -Path "$PSScriptRoot\..\dist\patricia\browser" | Out-Null
    Copy-Item "$PSScriptRoot\..\index.html" "$PSScriptRoot\..\dist\patricia\browser\index.html" -Force
}

# 2. Creacion de carpetas remotas en Visar
Write-Host "`n[2/5] Creando directorios remotos en Visar..." -ForegroundColor Yellow
ssh ${User}@${HostServer} "mkdir -p /var/www/${Domain}/dist/patricia/browser /var/www/${Domain}/backend /var/www/${Domain}/deploy /var/www/${Domain}/logs"

# 3. Sincronizacion de Frontend a Visar
Write-Host "`n[3/5] Sincronizando estaticos PWA en /var/www/$Domain/dist/patricia/browser/..." -ForegroundColor Yellow
if (Test-Path "$PwaDir\dist\patricia\browser") {
    scp -r "$PwaDir\dist\patricia\browser\*" "${User}@${HostServer}:/var/www/${Domain}/dist/patricia/browser/"
} else {
    scp "$PSScriptRoot\..\index.html" "${User}@${HostServer}:/var/www/${Domain}/dist/patricia/browser/index.html"
}

# 4. Sincronizacion de Backend Deno y Deploy a Visar
Write-Host "`n[4/5] Sincronizando configuracion y deploy en /var/www/$Domain/..." -ForegroundColor Yellow
scp -r "$PSScriptRoot\..\deploy\*" "${User}@${HostServer}:/var/www/${Domain}/deploy/"
if (Test-Path "$PSScriptRoot\..\backend\main.ts") {
    scp -r "$PSScriptRoot\..\backend\*" "${User}@${HostServer}:/var/www/${Domain}/backend/"
    scp "$PSScriptRoot\..\.env" "${User}@${HostServer}:/var/www/${Domain}/backend/.env"
}

# 5. Ejecutar Setup del Servidor y Certbot SSL
Write-Host "`n[5/5] Ejecutando setup de Nginx, Systemd y SSL Certbot en Visar..." -ForegroundColor Yellow
ssh ${User}@${HostServer} "bash /var/www/${Domain}/deploy/setup-server.sh"

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "🎉 Despliegue completado con exito: https://$Domain" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
