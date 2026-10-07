<# Probe for invite-code onboarding (dev posture: AUTH_ENFORCE unset => pass-through). #>
$ErrorActionPreference = 'Continue'
$base = 'http://localhost:5000'

function Show([string]$n) { "`n## $n ##" | Write-Host }

Show 'health'
curl.exe -s "$base/api/health"; Write-Output ''

Show 'create invite (store)'
$b1 = @{ role = 'storekeeper'; app_scope = @('store') } | ConvertTo-Json
$inv = curl.exe -s -X POST "$base/api/invites" -H 'Content-Type: application/json' -d "$b1"
"invite: $inv"
$code = ($inv | ConvertFrom-Json).code
"code = $code"

Show 'validate (public, before use)'
curl.exe -s "$base/api/invites/$code/validate"; Write-Output ''

Show 'sign-up with code'
$b2 = @{ inviteCode = $code; name = 'Probe Store'; email = 'probe@store.local'; phone = ''; password = 'secret123' } | ConvertTo-Json
$su = curl.exe -s -X POST "$base/api/auth/sign-up" -H 'Content-Type: application/json' -d "$b2"
"sign-up: $su"
$atoken = ($su | ConvertFrom-Json).accessToken

Show 'new employee /me (app_scope must be exactly store)'
curl.exe -s "$base/api/auth/me" -H "Authorization: Bearer $atoken"; Write-Output ''

Show '/data as new employee => http 200 (has store scope)'
curl.exe -s -o NUL -w '%{http_code}' "$base/api/data" -H "Authorization: Bearer $atoken"; Write-Output ''

Show 'double-spend: same code again => http 404 (single-use)'
curl.exe -s -o NUL -w '%{http_code}' -X POST "$base/api/auth/sign-up" -H 'Content-Type: application/json' -d "$b2"; Write-Output ''

Show 'validate after use => http 404 (consumed)'
curl.exe -s -o NUL -w '%{http_code}' "$base/api/invites/$code/validate"; Write-Output ''

Show 'list invites (usedAt/usedBy should be populated)'
curl.exe -s "$base/api/invites"; Write-Output ''