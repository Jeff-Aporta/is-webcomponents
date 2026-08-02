$myKeep = @(
  'components/data/ag-grid.js',
  'components/data/spreadsheet.js',
  'components/diagrams/org-chart.js',
  'components/forms/dropzone.js',
  'components/_shared/scrollbars.css'
)
$lines = git status --short
foreach ($line in $lines) {
  if ($line.Length -lt 4) { continue }
  $status = $line.Substring(0, 2).Trim()
  $path = $line.Substring(3).Trim()
  if ($path -notmatch '^components/.*\.js$') { continue }   # Solo components/<x>.js
  if ($myKeep -contains $path) { continue }
  Write-Host "restoring $path"
  git restore $path
}
Write-Host "done"
