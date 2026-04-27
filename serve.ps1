$port = 8080
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$listener = [System.Net.HttpListener]::new()
$listener.Prefixes.Add("http://localhost:$port/")
$listener.Start()
Write-Host "Serving $root on http://localhost:$port"

$mime = @{
  '.html' = 'text/html; charset=utf-8'
  '.js'   = 'application/javascript'
  '.json' = 'application/json'
  '.svg'  = 'image/svg+xml'
  '.css'  = 'text/css'
  '.png'  = 'image/png'
  '.ico'  = 'image/x-icon'
}

while ($listener.IsListening) {
  $ctx  = $listener.GetContext()
  $path = $ctx.Request.Url.LocalPath.TrimStart('/')
  if ($path -eq '' -or $path -eq '/') { $path = 'index.html' }
  $file = Join-Path $root $path
  if (Test-Path $file -PathType Leaf) {
    $ext  = [System.IO.Path]::GetExtension($file)
    $ct   = if ($mime[$ext]) { $mime[$ext] } else { 'application/octet-stream' }
    $bytes = [System.IO.File]::ReadAllBytes($file)
    $ctx.Response.ContentType   = $ct
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
