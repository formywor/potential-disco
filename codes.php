<?php
$file = __DIR__ . "/browser/codes.txt";

if (!file_exists($file)) {
    file_put_contents($file, "");
}

$action = $_GET['action'] ?? '';
$code = $_GET['code'] ?? '';

$codes = array_filter(explode(",", file_get_contents($file)));

if ($action === "read") {
    echo implode(",", $codes);
}
elseif ($action === "add" && $code !== '') {
    if (!in_array($code, $codes)) {
        $codes[] = $code;
        file_put_contents($file, implode(",", $codes));
    }
}
elseif ($action === "delete" && $code !== '') {
    $codes = array_filter($codes, fn($c) => $c !== $code);
    file_put_contents($file, implode(",", $codes));
}