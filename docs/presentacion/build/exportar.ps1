# Exporta la presentación con PowerPoint: una imagen por lámina (para revisarla) y un PDF de respaldo.
# Uso: powershell -File exportar.ps1 -Pptx <ruta.pptx> -OutDir <carpeta de imágenes> [-Pdf <ruta.pdf>]
param(
  [Parameter(Mandatory = $true)][string]$Pptx,
  [Parameter(Mandatory = $true)][string]$OutDir,
  [string]$Pdf = ""
)
$ErrorActionPreference = "Stop"
$ppt = New-Object -ComObject PowerPoint.Application
try {
  # Abrir solo lectura, sin ventana
  $pres = $ppt.Presentations.Open((Resolve-Path $Pptx).Path, -1, 0, 0)
  New-Item -ItemType Directory -Force $OutDir | Out-Null
  Get-ChildItem (Join-Path $OutDir "*") -Include "Slide*.PNG","Diapositiva*.PNG" -ErrorAction SilentlyContinue | Remove-Item -Force
  $pres.Export((Resolve-Path $OutDir).Path, "PNG", 1920, 1080)
  if ($Pdf -ne "") {
    $pdfFull = [System.IO.Path]::GetFullPath($Pdf)
    $pres.SaveAs($pdfFull, 32)
  }
  Write-Output ("Lámina(s): " + $pres.Slides.Count)
  $pres.Close()
} finally {
  $ppt.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
