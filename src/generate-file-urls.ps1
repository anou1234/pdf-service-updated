# =========================
# CONFIG
# =========================
$inputJson  = "final-filestore-files.json"
$outputJson = "file-urls.json"

# =========================
# LOAD FILESTORE IDS
# =========================
$data = Get-Content $inputJson | ConvertFrom-Json
$fileStoreIds = $data.files | Select-Object -ExpandProperty fileStoreId

Write-Host "Found $($fileStoreIds.Count) fileStoreIds"
Write-Host "=============================="

$results = [ordered]@{}
$i = 0

foreach ($id in $fileStoreIds) {

    $i++
    Write-Host "`n[$i / $($fileStoreIds.Count)] Processing ID:"
    Write-Host "  $id"

    # ✅ FIX: use REAL '&', not '&amp;' or '&amp;amp;'
    $cmd = 'curl -sS --location "https://mseva-dev.lgpunjab.gov.in/filestore/v1/files/url?tenantId=pb&fileStoreIds=' + $id + '"'

    Write-Host "CMD:"
    Write-Host "  $cmd"

    $raw = cmd.exe /c $cmd
    $raw = $raw.Trim()

    Write-Host "Response length: $($raw.Length)"
    Write-Host "RAW (preview):"
    Write-Host ($raw.Substring(0, [Math]::Min(200, $raw.Length)))

    if ($raw -match 'https://[^"]+') {
        $results[$id] = $Matches[0]
        Write-Host "✅ URL captured"
    }
    else {
        Write-Warning "No URL found for $id"
    }
}

# =========================
# SAVE OUTPUT
# =========================
$results |
    ConvertTo-Json -Depth 3 |
    Out-File $outputJson -Encoding utf8

Write-Host "`n✅ Done"
Write-Host "✅ URLs saved to $outputJson"
Write-Host "✅ Total URLs:" $results.Count