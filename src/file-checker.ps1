$files = Get-ChildItem ".\downloads\*.png" | Sort-Object Name

function Print-Batch($start, $end) {
    Write-Host "`nFiles in batch $start to $end" -ForegroundColor Cyan
    for ($i = $start; $i -le $end -and $i -lt $files.Count; $i++) {
        "{0,3}: {1}" -f $i, $files[$i].Name
    }
}

# ✅ Problem batches from your logs
Print-Batch 80 89
Print-Batch 120 129