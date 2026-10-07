<# Invite onboarding live probe (AUTH_ENFORCE=true posture). #>
$ErrorActionPreference = 'Stop'
$base = 'http://localhost:5000'
$http = [System.Net.Http.HttpClient]::new()
$http.Timeout = [System.TimeSpan]::FromSeconds(30)

function Call {
  param([string]$Method, [string]$Path, $Body, $Token)
  $req = [System.Net.Http.HttpRequestMessage]::new([System.Net.Http.HttpMethod]::new($Method), "$base$Path")
  if ($null -ne $Body) {
    $json = if ($Body -is [string]) { $Body } else { $Body | ConvertTo-Json -Compress -Depth 5 }
    $req.Content = [System.Net.Http.StringContent]::new($json, [System.Text.Encoding]::UTF8, 'application/json')
  }
  if ($Token) { $req.Headers.Authorization = "Bearer $Token" }
  $resp = $http.Send($req)
  $text = $resp.Content.ReadAsStringAsync().GetResult()
  return [PSCustomObject]@{ status = [int]$resp.StatusCode; text = $resp.StatusCode.ToString(); body = $text }
}

"## 1. login owner (Gabriel N. / gabfix-owner) ##"
$L = Call POST /api/login @{ identifier = 'Gabriel N.'; password = 'gabfix-owner' }
$L | Out-String | Write-Host
$atoken = ($L.body | ConvertFrom-Json).accessToken
"owner token ok (len $($atoken.Length))"

"## 2. POST /api/invites {role:storekeeper, app_scope:[store]} ##"
$I = Call POST /api/invites @{ role = 'storekeeper'; app_scope = @('store') } -Token $atoken
$I | Out-String | Write-Host
$code = ($I.body | ConvertFrom-Json).code
"invite code = $code"

"## 3. GET /api/auth/invits/:code/validate (PUBLIC, before use) ##"
"## (fix path below) ##"
Call GET "/api/auth/invites/$code/validate" | Out-String | Write-Host

"## 4. POST /api/auth/sign-up (PUBLIC) ##"
$S = Call POST /api/auth/sign-up @{ inviteCode = $code; name = 'Probe Store'; email = 'probe@store.local'; phone = ''; password = 'secret123' }
$S | Out-String | Write-Host
$empToken = ($S.body | ConvertFrom-Json).accessToken
"new employee app_scope = $(($S.body | ConvertFrom-Json).user.app_scope)"

"## 5. GET /api/auth/me (store scope) ##"
Call GET /api/auth/me -Token $empToken | Out-String | Write-Host

"## 6. GET /api/data => 200 (store scope accepted) ##"
(Call GET /api/data -Token $empToken).status

"## 7. GET /api/employees => 403 (store scope has no admin scope) ##"
(Call GET /api/employees -Token $empToken).status

"## 8. double-spend (same code) => 404 (single-use) ##"
$S2 = Call POST /api/auth/sign-up @{ inviteCode = $code; name = 'Probe Two'; email = 'p2@store.local'; phone = ''; password = 'secret123' }
"double-spend status = $($S2.status)"

"## 9. validate after use => 404 ##"
$V2 = Call GET "/api/auth/invites/$code/validate"
"validate-after status = $($V2.status)"

"## 10. GET /api/invites (owner) => usedBy/usedAt populated ##"
Call GET /api/invites -Token $atoken | Out-String | Write-Host

"## 11. login as the new employee (password) => 200, scope [store] ##"
$S3 = Call POST /api/login @{ identifier = 'Probe Store'; password = 'secret123' }
"new-employee login status = $($S3.status) (scope = $(($S3.body | ConvertFrom-Json).user.app_scope))"

"done"
