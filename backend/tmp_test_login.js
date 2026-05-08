async function testLogin() {
  const req = await fetch("http://localhost:8000/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Origin": "http://localhost:5173"
    },
    body: JSON.stringify({
      email: "ava.admin@classroom.dev",
      password: "Admin#1234"
    })
  });
  const res = await req.json();
  console.log("Status:", req.status);
  console.log(res);
}
testLogin();
