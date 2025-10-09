<?php
header('Content-Type: text/plain');
$s = preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session'] ?? '');
$c = preg_replace('/[^0-9]/','', $_GET['code'] ?? '');
if ($s === '' || $c === '') { http_response_code(400); exit('bad'); }
$dir = __DIR__ . '/sessions';
if (!is_dir($dir)) { @mkdir($dir, 0775, true); }
file_put_contents("$dir/$s.txt", $c);
echo "ok";