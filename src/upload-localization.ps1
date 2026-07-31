# ===== CONFIG =====
$Url = "https://sdc-uat.lgpunjab.gov.in/localization/messages/v1/_upsert"
$TenantId = "pb"
$AuthToken = "1e6779c7-e18f-4ce8-b5bd-82e0323f485c"
$MessagesFile = "./loc_notbpa.json"

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