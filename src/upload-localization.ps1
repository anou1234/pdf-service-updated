# ===== CONFIG =====
$Url = "https://mseva.lgpunjab.gov.in/localization/messages/v1/_upsert"
$TenantId = "pb"
$AuthToken = "7f41ea59-c8b9-4f45-893c-85e821c0c850"
$MessagesFile = "./loc.json"

# ===== HEADERS =====
$Headers = @{
    "Content-Type" = "application/json"
}

# ===== READ JSON FILE =====
$Messages = Get-Content $MessagesFile -Raw | ConvertFrom-Json

# ===== LOOP & PUSH ONE BY ONE =====
foreach ($msg in $Messages) {

    $Body = @{
        RequestInfo = @{
            apiId     = "Rainmaker"
            ver       = ".01"
            ts        = $null
            action    = "_update"
            did       = "1"
            key       = ""
            msgId     = (Get-Date -Format "yyyyMMddHHmmss") + "|pb_IN"
            authToken = $AuthToken
        }
        tenantId = $TenantId
        messages = @($msg)
    } | ConvertTo-Json -Depth 10

    try {
        Invoke-RestMethod `
            -Uri $Url `
            -Method Post `
            -Headers $Headers `
            -Body $Body

        Write-Host "✅ Uploaded:" $msg.code -ForegroundColor Green
    }
    catch {
        Write-Host "❌ Failed:" $msg.code -ForegroundColor Red
        Write-Host $_.Exception.Message
    }
}