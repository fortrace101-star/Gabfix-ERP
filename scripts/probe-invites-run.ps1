<# Invite onboarding live probe — curl.exe bodies via stdin (no quote mangling). #>
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000'

function Body([pscustomobject]$o) { $o | ConvertTo-Json -Compress -Depth 5 }
function Post([string]$path, [pscustomobject]$bodyObj, [string]$token) {
  $hdrs = @('-H', 'Content-Type: application/json')
  if ($token) { $hdrs = @('-H', 'Content-Type: application/json', '-H', "Authorization: Bearer $token") }
  Body $bodyObj | curl.exe -s -X POST "$base$path" @hdrs --data @-
}
function Get([string]$path, [string]$token) {
  if ($token) { return curl.exe -s -H "Authorization: Bearer $token" "$base$path" }
  return curl.exe -s "$base$path"
}
function Status([string]$method, [string]$path, [pscustomobject]$bodyObj, [string]$token) {
  $hdrs = @()
  if ($token) { $hdrs += @('-H', "Authorization: Bearer $token") }
  if ($bodyObj) {
    $hdrs += @('-H', 'Content-Type: application/json')
    return Body $bodyObj | curl.exe -s -o NUL -w '%{http_code}' -X $method "$base$path" @hdrs --data @-
  }
  return curl.exe -s -o NUL -w '%{http_code}' -X $method "$base$path" @hdrs
}
function J($raw) { $raw | ConvertFrom-Json | ConvertTo-Json -Depth 5 -Compress }

"## 1 login owner (Gabriel N. / gabfix-owner) ##"
$Lraw = Post /api/login (@{ identifier = 'Gabriel N.'; password = 'gabfix-owner' })
$Lraw
$atoken = (ConvertFrom-Json $Lraw).accessToken
"owner token length: $($atoken.Length)"

"## 2 POST /api/invites {role:storekeeper, app_scope:[store]} ##"
$Ir = Post /api/invites (@{ role = 'storekeeper'; app_scope = @('store') }) $atoken
J $Ir
$code = (ConvertFrom-Json $Ir).code
"invite code = $code"

"## 3 GET /api/auth/invites/:code/validate (PUBLIC, before use) ##"
J (Get "/api/auth/invites/$code/validate")

"## 4 POST /api/auth/sign-up (PUBLIC) ##"
$Sraw = Post /api/auth/sign-up (@{ inviteCode = $code; name = 'Probe Store'; email = 'probe@store.local'; phone = ''; password = 'secret123' })
J $Sraw
$empToken = (ConvertFrom-Json $Sraw).accessToken
"new employee app_scope = $((ConvertFrom-Json $Sraw).user.app_scope -join ',')"

"## 5 GET /api/auth/me (store scope) ##"
J (Get /api/auth/me $empToken)

"## 6 GET /api/data => expect 200 (store accepted) ##"
Status GET /api/data $null $empToken

"## 7 GET /api/employees => expect 403 (store has no admin scope) ##"
Status GET /api/employees $null $empToken

"## 8 double-spend (same code again) => expect 404 ##"
Status POST /api/auth/sign-up (@{ inviteCode = $code; name = 'Probe Two'; email = 'p2@store.local'; phone = ''; password = 'secret123' })

"## 9 validate after use => expect 404 ##"
Status GET "/api/auth/invites/$code/validate" $null

"## 10 GET /api/invites (owner list) => usedBy/usedAt populated ##"
J (Get /api/invites $atoken)

"## 11 login as the new employee => expect 200 (password works) ##"
Status POST /api/login (@{ identifier = 'Probe Store'; password = 'secret123' })

"done"
