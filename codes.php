<?php
// --------------- SETTINGS ---------------
$file = __DIR__ . "/browser/codes.txt";  // where the codes are stored
$password = ""; // <- optional: set a password if you want protection
// ----------------------------------------

// Make sure codes.txt exists
if (!file_exists($file)) file_put_contents($file, "");

// Handle API actions (AJAX)
if (isset($_GET['action'])) {
    header("Content-Type: application/json; charset=utf-8");

    // Password check
    if ($password !== "" && ($_GET['pass'] ?? "") !== $password) {
        echo json_encode(["ok"=>0,"error"=>"Unauthorized"]);
        exit;
    }

    $codes = array_filter(array_map("trim", explode(",", file_get_contents($file))));

    if ($_GET['action'] === "list") {
        echo json_encode(["ok"=>1, "codes"=>$codes]);
        exit;
    }

    if ($_GET['action'] === "add") {
        $new = trim($_GET['code'] ?? "");
        if ($new !== "" && !in_array($new, $codes)) {
            $codes[] = $new;
            file_put_contents($file, implode(",", $codes));
        }
        echo json_encode(["ok"=>1, "codes"=>$codes]);
        exit;
    }

    if ($_GET['action'] === "delete") {
        $del = trim($_GET['code'] ?? "");
        $codes = array_values(array_filter($codes, fn($c) => $c !== $del));
        file_put_contents($file, implode(",", $codes));
        echo json_encode(["ok"=>1, "codes"=>$codes]);
        exit;
    }

    echo json_encode(["ok"=>0,"error"=>"Unknown action"]);
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Ban Codes Manager</title>
<style>
body { font-family: Arial, sans-serif; margin:20px; background:#f5f5f5; }
h1 { color:#333; }
#codes { margin-top:15px; padding:10px; background:white; border:1px solid #ccc; }
.chip { display:inline-block; margin:5px; padding:6px 10px; background:#e0eaff; border-radius:6px; }
.chip button { margin-left:6px; background:#f55; color:white; border:none; border-radius:4px; cursor:pointer; }
input { padding:8px; }
button { padding:8px 12px; cursor:pointer; }
</style>
</head>
<body>
<h1>Ban Codes Manager</h1>
<div>
  <input id="newCode" type="text" placeholder="Enter new code">
  <button onclick="addCode()">Add Code</button>
</div>
<div id="codes"></div>

<script>
async function fetchCodes() {
  let res = await fetch("?action=list");
  let data = await res.json();
  if (data.ok) displayCodes(data.codes);
}

function displayCodes(codes) {
  const container = document.getElementById("codes");
  container.innerHTML = "";
  codes.forEach(c => {
    let span = document.createElement("span");
    span.className = "chip";
    span.textContent = c;
    let btn = document.createElement("button");
    btn.textContent = "X";
    btn.onclick = async () => {
      await fetch("?action=delete&code=" + encodeURIComponent(c));
      fetchCodes();
    };
    span.appendChild(btn);
    container.appendChild(span);
  });
}

async function addCode() {
  let code = document.getElementById("newCode").value.trim();
  if (!code) return;
  await fetch("?action=add&code=" + encodeURIComponent(code));
  document.getElementById("newCode").value = "";
  fetchCodes();
}

fetchCodes();
</script>
</body>
</html>