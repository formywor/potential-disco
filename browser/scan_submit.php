<?php
// JSON + no-cache
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Validate
$session = isset($_POST['session']) ? preg_replace('/[^A-Za-z0-9\-_.]/','', $_POST['session']) : '';
$codeRaw = isset($_POST['code']) ? $_POST['code'] : '';
$code = preg_replace('/\D/', '', $codeRaw);   // digits only

if ($session === '' || $code === '') {
  http_response_code(400);
  echo json_encode(['ok'=>false, 'err'=>'bad_input']); exit;
}

// Use system temp dir so it works on any host
$dir = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'gomega_scans';
if (!is_dir($dir) && !@mkdir($dir, 0775, true)) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'err'=>'mkdir_failed']); exit;
}

$file = $dir . DIRECTORY_SEPARATOR . $session . '.txt';
if (@file_put_contents($file, $code, LOCK_EX) === false) {
  http_response_code(500);
  echo json_encode(['ok'=>false, 'err'=>'write_failed']); exit;
}

echo json_encode(['ok'=>true]);
