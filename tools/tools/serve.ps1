param(
  [string]$Root = (Get-Location).Path,
  [int]$Port = 8765
)

$resolvedRoot = (Resolve-Path -LiteralPath $Root).Path
$listener = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $Port)
$listener.Start()
Write-Host "Serving $resolvedRoot at http://localhost:$Port/"

function Get-MimeType {
  param([string]$Path)
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) {
    ".html" { "text/html; charset=utf-8" }
    ".css" { "text/css; charset=utf-8" }
    ".js" { "text/javascript; charset=utf-8" }
    ".json" { "application/json; charset=utf-8" }
    ".md" { "text/markdown; charset=utf-8" }
    default { "application/octet-stream" }
  }
}

function Send-Response {
  param(
    [System.Net.Sockets.NetworkStream]$Stream,
    [int]$Status,
    [string]$StatusText,
    [string]$ContentType,
    [byte[]]$Body
  )

  $header = "HTTP/1.1 $Status $StatusText`r`nContent-Type: $ContentType`r`nContent-Length: $($Body.Length)`r`nConnection: close`r`n`r`n"
  $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
  $Stream.Write($headerBytes, 0, $headerBytes.Length)
  $Stream.Write($Body, 0, $Body.Length)
}

try {
  while ($true) {
    $client = $listener.AcceptTcpClient()
    try {
      $stream = $client.GetStream()
      $buffer = New-Object byte[] 4096
      $read = $stream.Read($buffer, 0, $buffer.Length)
      $request = [System.Text.Encoding]::ASCII.GetString($buffer, 0, $read)
      $firstLine = ($request -split "`r?`n")[0]
      $parts = $firstLine -split " "
      $path = if ($parts.Length -ge 2) { $parts[1] } else { "/" }
      $relative = [System.Uri]::UnescapeDataString(($path -split "\?")[0].TrimStart("/"))
      if ([string]::IsNullOrWhiteSpace($relative)) {
        $relative = "index.html"
      }

      $candidate = [System.IO.Path]::GetFullPath([System.IO.Path]::Combine($resolvedRoot, $relative))
      if (-not $candidate.StartsWith($resolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
        Send-Response $stream 403 "Forbidden" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Forbidden"))
        continue
      }

      if (-not [System.IO.File]::Exists($candidate)) {
        Send-Response $stream 404 "Not Found" "text/plain; charset=utf-8" ([System.Text.Encoding]::UTF8.GetBytes("Not found"))
        continue
      }

      $bytes = [System.IO.File]::ReadAllBytes($candidate)
      Send-Response $stream 200 "OK" (Get-MimeType $candidate) $bytes
    }
    finally {
      $client.Close()
    }
  }
}
finally {
  $listener.Stop()
}
