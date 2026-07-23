# ===== CONFIG =====
$Url = "https://test.one1sewa.com/localization/messages/v1/_upsert"
$TenantId = "cg"
$AuthToken = "2523db09-8bc2-45bf-9932-0a177853b3b0"
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