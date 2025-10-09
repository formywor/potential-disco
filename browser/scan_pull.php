<?php
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$session = isset($_GET['session']) ? preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session']) : '';
if ($session === '') { exit(''); }

session_id($session);
session_start();
$digits = isset($_SESSION['code']) ? preg_replace('/\D/','', (string)$_SESSION['code']) : '';
$_SESSION['code'] = '';  // one-time read
session_write_close();

echo $digits;