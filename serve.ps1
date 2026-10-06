$port = 8080
$listener = New-Object System.Net.Sockets.TcpListener ([System.Net.IPAddress]::Loopback, $port)
$listener.Start()
Write-Host "HTTP Server listening on http://localhost:$port"

$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

while ($true) {
    try {
        $client = $listener.AcceptTcpClient()
        $stream = $client.GetStream()
        $reader = New-Object System.IO.StreamReader($stream)
        $writer = New-Object System.IO.StreamWriter($stream)
        
        $requestLine = $reader.ReadLine()
        if ($requestLine) {
            $tokens = $requestLine.Split(' ')
            $path = $tokens[1]
            if ($path -eq '/' -or [string]::IsNullOrEmpty($path)) { $path = '/index.html' }
            $path = $path.Split('?')[0].TrimStart('/')
            $filePath = Join-Path $root $path
            
            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = switch ($ext) {
                    '.html' { 'text/html; charset=utf-8' }
                    '.css'  { 'text/css; charset=utf-8' }
                    '.js'   { 'application/javascript; charset=utf-8' }
                    '.png'  { 'image/png' }
                    '.jpg'  { 'image/jpeg' }
                    '.jpeg' { 'image/jpeg' }
                    '.svg'  { 'image/svg+xml' }
                    '.json' { 'application/json' }
                    default { 'application/octet-stream' }
                }
                
                $bytes = [System.IO.File]::ReadAllBytes($filePath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nContent-Length: $($bytes.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($bytes, 0, $bytes.Length)
            } else {
                $msg = [System.Text.Encoding]::UTF8.GetBytes("<h1>404 Not Found</h1>")
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/html`r`nContent-Length: $($msg.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($msg, 0, $msg.Length)
            }
        }
        $stream.Flush()
        $client.Close()
    } catch {
        # continue loop
    }
}
