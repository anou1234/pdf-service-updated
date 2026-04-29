$endpoint = "https://mseva-dev.lgpunjab.gov.in/filestore/v1/files"
$batchSize = 10

# ✅ FIX: ensure correct numeric order
$files = Get-ChildItem ".\downloads\*.png" | Sort-Object Name

$allUploadedFiles = @()   # accumulator

for ($i = 0; $i -lt $files.Count; $i += $batchSize) {

    $end = [Math]::Min($i + $batchSize - 1, $files.Count - 1)
    $batch = $files[$i..$end]

    Write-Host "Uploading files $i to $end"

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

    $response = & curl.exe @curlArgs | ConvertFrom-Json

    if ($response.files) {
        $allUploadedFiles += $response.files
    }

    if ($response.Errors) {
        Write-Warning "Upload error in batch $i"
        $response.Errors | Out-Host
    }

    Start-Sleep -Seconds 1
}

$finalResult = @{ files = $allUploadedFiles }

$finalResult |
    ConvertTo-Json -Depth 5 |
    Out-File "final-filestore-files.json" -Encoding utf8

Write-Host "`n✅ Upload complete"
Write-Host "✅ Total files uploaded:" $allUploadedFiles.Count
Write-Host "✅ Saved as final-filestore-files.json"