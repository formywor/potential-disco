<?php
// --- No cache headers ---
header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// (Optional) CORS if needed
// header('Access-Control-Allow-Origin: https://gomega.watch');
// header('Vary: Origin');

$session = isset($_GET['session']) ? (string)$_GET['session'] : '';
$ack     = isset($_GET['ack']) ? (string)$_GET['ack'] : '0';

if (!preg_match('/^[A-Za-z0-9_\-]{16,64}$/', $session)) {
    http_response_code(400);
    echo "WAIT"; // don't leak digits on malformed input
    exit;
}

$baseDir = __DIR__ . '/sessions';
$path = $baseDir . '/' . $session . '.txt';

if (!is_file($path)) {
    // No code yet; launcher and scanner will keep polling
    echo "WAIT";
    exit;
}

// Read with shared lock
$code = '';
$ts   = 0;
$fp = @fopen($path, 'r');
if ($fp) {
    if (flock($fp, LOCK_SH)) {
        $raw = stream_get_contents($fp);
        flock($fp, LOCK_UN);
    } else {
        $raw = '';
    }
    fclose($fp);

    if ($raw) {
        $data = json_decode($raw, true);
        if (is_array($data) && isset($data['code']) && preg_match('/^\d{6,20}$/', $data['code'])) {
            $code = $data['code'];
            $ts   = isset($data['ts']) ? (int)$data['ts'] : 0;
        }
    }
}

if ($code === '') {
    echo "WAIT";
    exit;
}

// Optionally acknowledge (delete after read)
if ($ack === '1') {
    @unlink($path);
}

// Return something that definitely includes the digits so the HTA ExtractScanCode sees it
// You can add more info if you like; the HTA extracts the first 6–20 digit sequence.
echo "OK $code";
