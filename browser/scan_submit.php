<?php
// Plain text + no-cache
header('Content-Type: text/plain; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');

// Sanitize inputs
$session = isset($_POST['session']) ? preg_replace('/[^A-Za-z0-9\-_.]/','', $_POST['session']) : '';
$codeRaw = isset($_POST['code']) ? $_POST['code'] : '';
$code    = preg_replace('/\D/', '', $codeRaw);   // DIGITS ONLY

if ($session === '' || $code === '') { http_response_code(400); echo 'ERR'; exit; }

// Bind PHP session *to your provided id* (no cookies required)
session_id($session);
session_start();
$_SESSION['code'] = $code;    // store once
session_write_close();

echo 'OK';