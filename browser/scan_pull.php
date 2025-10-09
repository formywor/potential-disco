<?php
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

$session = isset($_GET['session']) ? preg_replace('/[^A-Za-z0-9\-_.]/','', $_GET['session']) : '';
if ($session === '') { exit(''); }

// Attach to the same session id the HTA created
session_id($session);
session_start();

$digits = '';
if (!empty($_SESSION['code'])) {
  $digits = preg_replace('/\D/', '', (string)$_SESSION['code']);
  // one-time read
  $_SESSION['code'] = '';
}
session_write_close();

// Return digits (or empty if not set yet)
echo $digits;