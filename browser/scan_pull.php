<?php
header('Content-Type: text/plain');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$s = preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session'] ?? '');
if ($s === '') { exit(''); }

$f = __DIR__ . "/sessions/$s.txt";
if (is_file($f)) {
  $code = preg_replace('/\D/','', file_get_contents($f));
  @unlink($f);  // one-time read
  echo $code;
}