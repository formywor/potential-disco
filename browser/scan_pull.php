<?php
header('Content-Type: text/plain');
$s = preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session'] ?? '');
if ($s === '') { exit(''); }
$f = __DIR__ . "/sessions/$s.txt";
if (is_file($f)) {
  $code = trim(file_get_contents($f));
  @unlink($f);          // one-time read
  echo $code;
}