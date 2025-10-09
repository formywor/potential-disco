<?php
header('Content-Type: text/plain');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$s = preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session'] ?? '');
$c = preg_replace('/\D/','', $_GET['code'] ?? '');
if ($s === '' || $c === '') { http_response_code(400); exit('ERR'); }

$dir = __DIR__ . '/sessions';
if (!is_dir($dir) && !@mkdir($dir, 0775, true)) { http_response_code(500); exit('ERR'); }

$f = "$dir/$s.txt";
if (@file_put_contents($f, $c, LOCK_EX) === false) { http_response_code(500); exit('ERR'); }

echo 'OK';