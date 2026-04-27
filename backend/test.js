const axios = require("axios");

const url = "http://localhost:8080/remote.php/dav/files/admin/test.json";

axios.put(url, JSON.stringify({ hello: "world" }), {
  auth: {
    username: "admin",
    password: "admin123"
  },
  headers: {
    "Content-Type": "application/json"
  }
})
.then(() => console.log("Uploaded ✔"))
.catch(err => console.log(err.message));