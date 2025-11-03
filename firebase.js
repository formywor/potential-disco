<!-- firebase.js -->
<script type="module">
  import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
  import { getAuth } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
  import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
  import { getStorage } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-storage.js";

  const firebaseConfig = {
    apiKey: "AIzaSyCosaEc1xMspmr9Z0ykfI3_6Ksrp-3r5WM",
    authDomain: "gomega-65e3f.firebaseapp.com",
    projectId: "gomega-65e3f",
    storageBucket: "gomega-65e3f.firebasestorage.app",
    messagingSenderId: "212961835634",
    appId: "1:212961835634:web:976771599c0bd1e1a060eb",
    measurementId: "G-YQNHPZZY3T"
  };

  export const app = initializeApp(firebaseConfig);
  export const auth = getAuth(app);
  export const db = getFirestore(app);
  export const storage = getStorage(app);
</script>
