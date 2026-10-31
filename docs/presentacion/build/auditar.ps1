# Audita la presentación con PowerPoint: textos que se desbordan de su caja y textos que se pisan.
# Uso: powershell -File auditar.ps1 -Pptx <ruta.pptx>
param([Parameter(Mandatory = $true)][string]$Pptx)
$ErrorActionPreference = "Stop"
$ppt = New-Object -ComObject PowerPoint.Application
try {
  $pres = $ppt.Presentations.Open((Resolve-Path $Pptx).Path, -1, 0, 0)
  $slideH = $pres.PageSetup.SlideHeight
  $slideW = $pres.PageSetup.SlideWidth
  foreach ($sl in $pres.Slides) {
    $items = @()
    foreach ($sh in $sl.Shapes) {
      if (-not $sh.HasTextFrame) { continue }
      $tf = $sh.TextFrame2
      if (-not $tf.HasText) { continue }
      $tr = $tf.TextRange
      $txt = ($tr.Text -replace "[\r\n\v]+", " / ")
      if ($txt.Length -gt 48) { $txt = $txt.Substring(0, 48) + "..." }
      $it = [pscustomobject]@{
        Name = $sh.Name; Text = $txt
        L = $tr.BoundLeft; T = $tr.BoundTop; W = $tr.BoundWidth; H = $tr.BoundHeight
        SL = $sh.Left; ST = $sh.Top; SW = $sh.Width; SH = $sh.Height
        MT = $tf.MarginTop; MB = $tf.MarginBottom; ML = $tf.MarginLeft; MR = $tf.MarginRight
      }
      $items += $it
      # 1) Desborde de la caja (tolerancia de 2 pt)
      $innerH = $it.SH - $it.MT - $it.MB
      $innerW = $it.SW - $it.ML - $it.MR
      if ($it.H -gt $innerH + 2) { "S{0}  DESBORDE-ALTO  {1:N1}pt > {2:N1}pt  [{3}]" -f $sl.SlideIndex, $it.H, $innerH, $it.Text }
      if ($it.W -gt $innerW + 2) { "S{0}  DESBORDE-ANCHO {1:N1}pt > {2:N1}pt  [{3}]" -f $sl.SlideIndex, $it.W, $innerW, $it.Text }
      # 2) Fuera de la lámina
      if ($it.L -lt -1 -or $it.T -lt -1 -or ($it.L + $it.W) -gt $slideW + 1 -or ($it.T + $it.H) -gt $slideH + 1) { "S{0}  FUERA-DE-LAMINA [{1}]" -f $sl.SlideIndex, $it.Text }
    }
    # 3) Textos que se pisan entre sí
    for ($i = 0; $i -lt $items.Count; $i++) {
      for ($j = $i + 1; $j -lt $items.Count; $j++) {
        $a = $items[$i]; $b = $items[$j]
        $ox = [math]::Min($a.L + $a.W, $b.L + $b.W) - [math]::Max($a.L, $b.L)
        $oy = [math]::Min($a.T + $a.H, $b.T + $b.H) - [math]::Max($a.T, $b.T)
        if ($ox -gt 3 -and $oy -gt 3) { "S{0}  SE-PISAN  [{1}]  con  [{2}]  ({3:N0}x{4:N0}pt)" -f $sl.SlideIndex, $a.Text, $b.Text, $ox, $oy }
      }
    }
  }
  "Auditoría terminada: {0} láminas" -f $pres.Slides.Count
  $pres.Close()
} finally {
  $ppt.Quit()
  [System.Runtime.InteropServices.Marshal]::ReleaseComObject($ppt) | Out-Null
}
