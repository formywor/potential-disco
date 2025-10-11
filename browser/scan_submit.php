<?php
// --- No cache headers ---
header('Content-Type: text/plain; charset=UTF-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

// (Optional) CORS if you serve scan.html from same domain you don't need this.
// header('Access-Control-Allow-Origin: https://gomega.watch');
// header('Vary: Origin');

function get_param($k) {
    if (isset($_POST[$k])) return $_POST[$k];
    if (isset($_GET[$k]))  return $_GET[$k];
    return '';
}

$session = (string) get_param('session');
$code    = (string) get_param('code');

// --- Validate session: allow 16-64 chars of hex/letters/digits/underscore ---
if (!preg_match('/^[A-Za-z0-9_\-]{16,64}$/', $session)) {
    http_response_code(400);
    echo "ERR invalid session";
    exit;
}

// --- Validate code: 6-20 digits ---
if (!preg_match('/^\d{6,20}$/', $code)) {
    http_response_code(400);
    echo "ERR invalid code";
    exit;
}

// --- Storage dir (relative to this script) ---
$baseDir = __DIR__ . '/sessions';
if (!is_dir($baseDir)) {
    if (!mkdir($baseDir, 0775, true) && !is_dir($baseDir)) {
        http_response_code(500);
        echo "ERR mkdir";
        exit;
    }
}

$path = $baseDir . '/' . $session . '.txt';

// --- Write atomically with lock ---
$payload = json_encode([
    'code' => $code,
    'ts'   => time()
], JSON_UNESCAPED_SLASHES);

$ok = false;
$fp = @fopen($path, 'c+');
if ($fp) {
    if (flock($fp, LOCK_EX)) {
        ftruncate($fp, 0);
        $ok = (fwrite($fp, $payload) !== false);
        fflush($fp);
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

if (!$ok) {
    http_response_code(500);
    echo "ERR write";
    exit;
}

// --- Best-effort cleanup of very old sessions (>24h) ---
$now = time();
if ($dh = @opendir($baseDir)) {
    while (($f = readdir($dh)) !== false) {
        if ($f === '.' || $f === '..') continue;
        $p = $baseDir . '/' . $f;
        if (is_file($p) && ($now - @filemtime($p) > 86400)) {
            @unlink($p);
        }
    }
    closedir($dh);
}

// Success (HTA and scan.html both accept any text that includes digits)
echo "OK $code";
