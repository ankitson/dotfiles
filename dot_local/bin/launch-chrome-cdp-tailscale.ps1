[CmdletBinding()]
param(
    [int]$Port = 9222,
    [string]$ProfilePath = "$env:LOCALAPPDATA\Chrome-CDP-Tailscale",
    [string]$ChromePath = "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    [string]$TailscaleIp,
    [string]$LocalCdpAddress = '127.0.0.1',
    [switch]$OpenVersionEndpoint,
    [switch]$SkipFirewallRule,
    [switch]$SkipPortProxy,
    [switch]$EnsureFirewallRuleOnly
)

$ErrorActionPreference = 'Stop'

function Get-TailscaleIPv4 {
    $tailscale = Get-Command tailscale.exe -ErrorAction SilentlyContinue
    if (-not $tailscale) {
        throw 'tailscale.exe was not found in PATH. Pass -TailscaleIp explicitly or install Tailscale CLI.'
    }

    $ips = & $tailscale.Source ip -4
    $ip = $ips | Where-Object { $_ -match '^100\.' } | Select-Object -First 1
    if (-not $ip) {
        throw 'Could not find a Tailscale IPv4 address. Pass -TailscaleIp explicitly.'
    }

    return $ip.Trim()
}

function Test-IsAdministrator {
    $identity = [Security.Principal.WindowsIdentity]::GetCurrent()
    $principal = [Security.Principal.WindowsPrincipal]$identity
    return $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
}

function Get-FirewallRuleName {
    param(
        [string]$Address,
        [int]$RulePort
    )

    return "Chrome CDP over Tailscale $Address`:$RulePort"
}

function Join-ProcessArguments {
    param([string[]]$Arguments)

    return (($Arguments | ForEach-Object {
        if ($_ -match '[\s"]') {
            '"' + ($_ -replace '"', '\"') + '"'
        } else {
            $_
        }
    }) -join ' ')
}

function Test-ChromeCdpFirewallRule {
    param(
        [string]$RuleName,
        [string]$Address,
        [int]$RulePort
    )

    $rule = Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue |
        Where-Object { $_.Enabled -eq 'True' -and $_.Direction -eq 'Inbound' -and $_.Action -eq 'Allow' } |
        Select-Object -First 1

    if (-not $rule) {
        return $false
    }

    $portFilter = $rule | Get-NetFirewallPortFilter
    $addressFilter = $rule | Get-NetFirewallAddressFilter
    $applicationFilter = $rule | Get-NetFirewallApplicationFilter

    return (
        $portFilter.Protocol -eq 'TCP' -and
        $portFilter.LocalPort -eq [string]$RulePort -and
        $addressFilter.LocalAddress -eq $Address -and
        $applicationFilter.Program -eq 'Any'
    )
}

function Ensure-ChromeCdpFirewallRule {
    param(
        [string]$RuleName,
        [string]$Address,
        [int]$RulePort
    )

    if (Test-ChromeCdpFirewallRule -RuleName $RuleName -Address $Address -RulePort $RulePort) {
        Write-Host "Firewall rule already present: $RuleName"
        return
    }

    if (-not (Test-IsAdministrator)) {
        $args = @(
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            $PSCommandPath,
            '-Port',
            $RulePort,
            '-ProfilePath',
            $ProfilePath,
            '-ChromePath',
            $ChromePath,
            '-TailscaleIp',
            $Address,
            '-LocalCdpAddress',
            $LocalCdpAddress,
            '-EnsureFirewallRuleOnly'
        )

        Write-Host 'Creating or updating the firewall rule requires elevation. Approve the UAC prompt to continue.'
        $elevated = Start-Process -FilePath 'powershell.exe' -ArgumentList (Join-ProcessArguments $args) -Verb RunAs -Wait -PassThru
        if ($elevated.ExitCode -ne 0) {
            throw "Elevated firewall-rule setup failed with exit code $($elevated.ExitCode)."
        }

        if (-not (Test-ChromeCdpFirewallRule -RuleName $RuleName -Address $Address -RulePort $RulePort)) {
            throw 'Firewall rule setup completed, but the expected rule was not found.'
        }

        Write-Host "Firewall rule ready: $RuleName"
        return
    }

    Get-NetFirewallRule -DisplayName $RuleName -ErrorAction SilentlyContinue | Remove-NetFirewallRule
    New-NetFirewallRule `
        -DisplayName $RuleName `
        -Direction Inbound `
        -Action Allow `
        -Protocol TCP `
        -LocalAddress $Address `
        -LocalPort $RulePort | Out-Null

    Write-Host "Created firewall rule: $RuleName"
}

function Test-PortProxyRule {
    param(
        [string]$ListenAddress,
        [int]$ListenPort,
        [string]$ConnectAddress,
        [int]$ConnectPort
    )

    $output = & netsh.exe interface portproxy show v4tov4
    $escapedListen = [regex]::Escape($ListenAddress)
    $escapedConnect = [regex]::Escape($ConnectAddress)
    $pattern = "^\s*$escapedListen\s+$ListenPort\s+$escapedConnect\s+$ConnectPort\s*$"
    return [bool]($output | Select-String -Pattern $pattern)
}

function Ensure-PortProxyRule {
    param(
        [string]$ListenAddress,
        [int]$ListenPort,
        [string]$ConnectAddress,
        [int]$ConnectPort
    )

    if (Test-PortProxyRule -ListenAddress $ListenAddress -ListenPort $ListenPort -ConnectAddress $ConnectAddress -ConnectPort $ConnectPort) {
        Write-Host "Portproxy already present: $ListenAddress`:$ListenPort -> $ConnectAddress`:$ConnectPort"
        return
    }

    if (-not (Test-IsAdministrator)) {
        $args = @(
            '-NoProfile',
            '-ExecutionPolicy',
            'Bypass',
            '-File',
            $PSCommandPath,
            '-Port',
            $ListenPort,
            '-ProfilePath',
            $ProfilePath,
            '-ChromePath',
            $ChromePath,
            '-TailscaleIp',
            $ListenAddress,
            '-LocalCdpAddress',
            $ConnectAddress,
            '-EnsureFirewallRuleOnly'
        )

        if ($SkipFirewallRule) {
            $args += '-SkipFirewallRule'
        }

        Write-Host 'Creating or updating the portproxy rule requires elevation. Approve the UAC prompt to continue.'
        $elevated = Start-Process -FilePath 'powershell.exe' -ArgumentList (Join-ProcessArguments $args) -Verb RunAs -Wait -PassThru
        if ($elevated.ExitCode -ne 0) {
            throw "Elevated portproxy setup failed with exit code $($elevated.ExitCode)."
        }

        if (-not (Test-PortProxyRule -ListenAddress $ListenAddress -ListenPort $ListenPort -ConnectAddress $ConnectAddress -ConnectPort $ConnectPort)) {
            throw 'Portproxy setup completed, but the expected rule was not found.'
        }

        Write-Host "Portproxy ready: $ListenAddress`:$ListenPort -> $ConnectAddress`:$ConnectPort"
        return
    }

    & netsh.exe interface portproxy delete v4tov4 listenaddress=$ListenAddress listenport=$ListenPort | Out-Null
    & netsh.exe interface portproxy add v4tov4 listenaddress=$ListenAddress listenport=$ListenPort connectaddress=$ConnectAddress connectport=$ConnectPort | Out-Null
    Write-Host "Created portproxy: $ListenAddress`:$ListenPort -> $ConnectAddress`:$ConnectPort"
}

if (-not $TailscaleIp) {
    $TailscaleIp = Get-TailscaleIPv4
}

if (-not (Test-Path -LiteralPath $ChromePath)) {
    throw "Chrome was not found at '$ChromePath'. Pass -ChromePath with the correct chrome.exe path."
}

$firewallRuleName = Get-FirewallRuleName -Address $TailscaleIp -RulePort $Port
if (-not $SkipFirewallRule) {
    Ensure-ChromeCdpFirewallRule -RuleName $firewallRuleName -Address $TailscaleIp -RulePort $Port
}

if (-not $SkipPortProxy) {
    Ensure-PortProxyRule -ListenAddress $TailscaleIp -ListenPort $Port -ConnectAddress $LocalCdpAddress -ConnectPort $Port
}

if ($EnsureFirewallRuleOnly) {
    return
}

New-Item -ItemType Directory -Path $ProfilePath -Force | Out-Null

$arguments = @(
    "--remote-debugging-address=$LocalCdpAddress",
    "--remote-debugging-port=$Port",
    "--user-data-dir=$ProfilePath",
    '--no-first-run',
    '--no-default-browser-check'
)

$process = Start-Process -FilePath $ChromePath -ArgumentList $arguments -PassThru
$endpoint = "http://$TailscaleIp`:$Port/json/version"

Write-Host "Started Chrome PID $($process.Id)"
Write-Host "CDP endpoint: $endpoint"
Write-Host "Profile path: $ProfilePath"

if ($OpenVersionEndpoint) {
    Start-Process $endpoint
}
