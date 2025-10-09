<?php
// JSON + no-cache
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Input
$session = isset($_POST['session']) ? preg_replace('/[^A-Za-z0-9\-_.]/','', $_POST['session']) : '';
$codeRaw = isset($_POST['code']) ? $_POST['code'] : '';
$code = preg_replace('/\D/', '', $codeRaw);

if ($session === '' || $code === '') {
  http_response_code(400);
  echo json_encode(['ok'=>false]); exit;
}

// Try system temp dir first
$dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'gomega_scans';
if (!is_dir($dir)) { @mkdir($dir, 0775, true); }

// If system temp fails for any reason, fall back to ./sessions near this file
if (!is_dir($dir) || !is_writable($dir)) {
  $dir = __DIR__ . DIRECTORY_SEPARATOR . 'sessions';
  if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
}

$file = $dir . DIRECTORY_SEPARATOR . $session . '.txt';
$ok = @file_put_contents($file, $code, LOCK_EX);

if ($ok === false) {
  http_response_code(500);
  echo json_encode(['ok'=>false]); exit;
}

echo json_encode(['ok'=>true]);