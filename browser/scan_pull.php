<?php
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$session = isset($_GET['session']) ? preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session']) : '';
if ($session === '') { exit(''); }

$dir  = rtrim(sys_get_temp_dir(), DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR . 'gomega_scans';
$file = $dir . DIRECTORY_SEPARATOR . $session . '.txt';

if (is_file($file)) {
  $digits = preg_replace('/\D/', '', (string)file_get_contents($file));
  @unlink($file); // one-time read
  echo $digits;   // HTA only accepts pure digits
}
