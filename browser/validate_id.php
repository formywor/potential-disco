<?php
// validate_id.php — returns "OK <Name>" if code exists in ids.csv, otherwise "NO"
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$code = isset($_GET['code']) ? preg_replace('/\D/', '', $_GET['code']) : '';
if ($code === '') { echo "NO"; exit; }

$path = __DIR__ . '/ids.csv';
if (!is_file($path)) { echo "NO"; exit; }

$fh = fopen($path, 'rb');
if (!$fh) { echo "NO"; exit; }

$name = '';
while (($row = fgetcsv($fh)) !== false) {
  if (!isset($row[0])) continue;
  $id = preg_replace('/\D/', '', (string)$row[0]);
  if ($id === $code) {
    $name = isset($row[1]) ? trim((string)$row[1]) : 'User';
    break;
  }
}
fclose($fh);

if ($name !== '') {
  echo "OK " . $name;
} else {
  echo "NO";
}
