<# Invite onboarding live probe — direct curl.exe + temp-file bodies (no quote mangling). #>
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000'

function Bf([pscustomobject]$o) {
  $p = Join-Path $env:TEMP ("p_{0}.json" -f [System.Guid]::NewGuid().Guid)
  ($o | ConvertTo-Json -Compress -Depth 5) | Set-Content -Path $p -Encoding ascii -NoNewline
  return $p
}
function Show([string]$h) { "`n## $h ##" }

Show 'health'; curl.exe -sS -m 8 "$base/api/health"; Write-Output ''

Show '1 login owner (Gabriel N. / gabfix-owner)'
$lf = Bf (@{ identifier = 'Gabriel N.'; password = 'gabfix-owner' })
$L = curl.exe -sS -m 8 -X POST "$base/api/auth/login" -H 'Content-Type: application/json' --data "@$lf"
Remove-Item $lf -ErrorAction SilentlyContinue
$L
$atoken = (ConvertFrom-Json $L).accessToken
"owner token length: $($atoken.Length)"

Show '2 POST /api/invites {role:storekeeper, app_scope:[store]}'
$if = Bf (@{ role = 'storekeeper'; app_scope = @('store') })
$I = curl.exe -sS -m 8 -X POST "$base/api/invites" -H 'Content-Type: application/json' -H "Authorization: Bearer $atoken" --data "@$if"
Remove-Item $if -ErrorAction SilentlyContinue
$L_I = $I | ConvertFrom-Json; $L_I | ConvertTo-Json -Depth 5 -Compress
$code = $L_I.code
"invite code = $code"

Show '3 GET /api/auth/invits/:code/validate (PUBLIC, before use)'
curl.exe -sS -m 8 "$base/api/auth/invites/$code/validate"; Write-Output ''

Show '4 POST /api/auth/sign-up (PUBLIC)'
$sf = Bf (@{ inviteCode = $code; name = 'Probe Store'; email = 'probe@store.local'; phone = ''; password = 'secret123' })
$S = curl.exe -sS -m 8 -X POST "$base/api/auth/sign-up" -H 'Content-Type: application/json' --data "@$sf"
Remove-Item $sf -ErrorAction SilentlyContinue
$S
$su = $S | ConvertFrom-Json
$empToken = $su.accessToken
"new employee app_scope = $(($su.user.app_scope -join ','))"

Show '5 GET /api/auth/me (store scope)'
curl.exe -sS -m 8 -H "Authorization: Bearer $empToken" "$base/api/auth/me"; Write-Output ''

Show '6 GET /api/data => expect 200 (store scope accepted)'
curl.exe -sS -m 8 -o NUL -w '%{http_code}' -H "Authorization: Bearer $empToken" "$base/api/data"; Write-Output ''

Show '7 GET /api/employees => expect 403 (store has no admin scope)'
curl.exe -sS -m 8 -o NUL -w '%{http_code}' -H "Authorization: Bearer $empToken" "$base/api/employees"; Write-Output ''

Show '8 double-spend (same code) => expect 404 (single-use)'
$df = Bf (@{ inviteCode = $code; name = 'Probe Two'; email = 'p2@store.local'; phone = ''; password = 'secret123' })
$ds = curl.exe -sS -m 8 -o NUL -w '%{http_code}' -X POST "$base/api/auth/sign-up" -H 'Content-Type: application/json' --data "@$df"
Remove-Item $df -ErrorAction SilentlyContinue
"double-spend status: $ds"

Show '9 validate after use => expect 404 (consumed)'
curl.exe -sS -m 8 -o NUL -w '%{http_code}' "$base/api/auth/invites/$code/validate"; Write-Output ''

Show '10 GET /api/invits (owner list) => usedBy/usedAt populated'
curl.exe -sS -m 8 -H "Authorization: Bearer $atoken" "$base/api/invites"; Write-Output ''

Show '11 login as the new employee => expect 200'
$lf2 = Bf (@{ identifier = 'Probe Store'; password = 'secret123' })
$le = curl.exe -sS -m 8 -o NUL -w '%{http_code}' -X POST "$base/api/auth/login" -H 'Content-Type: application/json' --data "@$lf2"
Remove-Item $lf2 -ErrorAction SilentlyContinue
"new-employee login status: $le"

"done"
