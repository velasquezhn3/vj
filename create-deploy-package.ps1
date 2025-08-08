# Script para crear paquete de despliegue en Windows
$sourceFolder = "C:\Users\Admin\Documents\Bot Vj\vj"
$destinationZip = "C:\Users\Admin\Documents\Bot Vj\vj\botvj-deploy.zip"

# Excluir estas carpetas/archivos
$excludePatterns = @(
    "node_modules",
    "coverage", 
    "logs",
    "uploads",
    "tests",
    ".git"
)

# Crear archivo ZIP
Add-Type -AssemblyName System.IO.Compression.FileSystem

if (Test-Path $destinationZip) {
    Remove-Item $destinationZip
}

$zip = [System.IO.Compression.ZipFile]::Open($destinationZip, 'Create')

Get-ChildItem -Path $sourceFolder -Recurse -File | Where-Object {
    $relativePath = $_.FullName.Substring($sourceFolder.Length + 1)
    $shouldExclude = $false
    
    foreach ($pattern in $excludePatterns) {
        if ($relativePath -like "*$pattern*") {
            $shouldExclude = $true
            break
        }
    }
    
    -not $shouldExclude
} | ForEach-Object {
    $relativePath = $_.FullName.Substring($sourceFolder.Length + 1)
    $entry = $zip.CreateEntry($relativePath)
    $entryStream = $entry.Open()
    $fileStream = [System.IO.File]::OpenRead($_.FullName)
    $fileStream.CopyTo($entryStream)
    $fileStream.Close()
    $entryStream.Close()
}

$zip.Dispose()

Write-Host "✅ Paquete creado: botvj-deploy.zip"
