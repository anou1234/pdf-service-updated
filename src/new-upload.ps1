$endpoint = "https://mseva-dev.lgpunjab.gov.in/filestore/v1/files"
$batchSize = 10
$jsonPath  = "final-filestore-files.json"

# ✅ Failed batch start indices (from logs)
$failedBatches = @(80, 120)

# ✅ Stable ordering (MUST match original upload)
$files = Get-ChildItem ".\downloads\*.png" | Sort-Object Name

# ✅ Load existing JSON
if (Test-Path $jsonPath) {
    $existing = Get-Content $jsonPath | ConvertFrom-Json
    $allUploadedFiles = @($existing.files)
} else {
    Write-Error "❌ $jsonPath not found. Cannot append."
    exit 1
}

function Upload-Batch($startIndex) {

    $end = [Math]::Min($startIndex + $batchSize - 1, $files.Count - 1)
    $batch = $files[$startIndex..$end]

    Write-Host "Retrying files $startIndex to $end" -ForegroundColor Cyan

    $curlArgs = @(
        "--location", $endpoint,
        "--header", "accept: application/json",
        "--header", "origin: https://mseva-dev.lgpunjab.gov.in",
        "--header", "referer: https://mseva-dev.lgpunjab.gov.in/digit-ui/citizen/noc/new-application",
        "--form", "tenantId=pb",
        "--form", "module=undefined"
    )

    foreach ($file in $batch) {
        $curlArgs += "--form"
        $curlArgs += "file=@`"$($file.FullName)`""
    }

    return (& curl.exe @curlArgs | ConvertFrom-Json)
}

# ==========================
# ✅ RETRY FAILED BATCHES ONLY
# ==========================
foreach ($start in $failedBatches) {

    $response = Upload-Batch $start

    if ($response.files) {
        Write-Host "✅ Retry successful for batch $start"
        $allUploadedFiles += $response.files
    }

    if ($response.Errors) {
        Write-Warning "❌ Retry failed again for batch $start"
        $response.Errors | Out-Host
    }

    Start-Sleep -Seconds 1
}

# ==========================
# ✅ SAVE APPENDED JSON
# ==========================
@{
    files = $allUploadedFiles
} | ConvertTo-Json -Depth 5 |
    Out-File $jsonPath -Encoding utf8

Write-Host "`n✅ Retry script complete"
Write-Host "✅ Total files in JSON:" $allUploadedFiles.Count
Write-Host "✅ Updated file:" $jsonPath