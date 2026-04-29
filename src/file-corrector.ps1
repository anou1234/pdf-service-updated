Add-Type -AssemblyName System.Drawing

# Put ONLY the defective PNG filenames here
$badFiles = @(
  "kiratpur_sahib.png",
  "narotjaimailsingh.png"
)

foreach ($name in $badFiles) {

    $path = Join-Path ".\downloads" $name

    # ✅ Check file exists
    if (-not (Test-Path $path)) {
        Write-Warning "File not found, skipping: $name"
        continue
    }

    try {
        $img = [System.Drawing.Image]::FromFile($path)

        $tmp = "$path.clean.png"
        $img.Save($tmp, [System.Drawing.Imaging.ImageFormat]::Png)
        $img.Dispose()

        Move-Item $tmp $path -Force
        Write-Host "SUCCESS: Re-encoded $name"
    }
    catch {
        Write-Warning "FAILED to re-encode $name"
        Write-Warning $_.Exception.Message
    }
}