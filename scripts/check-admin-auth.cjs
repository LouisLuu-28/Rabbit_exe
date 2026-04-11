const fs = require("fs");

const envText = fs.readFileSync(".env", "utf8");
const lines = envText.split(/\r?\n/);
const envMap = {};
for (const line of lines) {
  const idx = line.indexOf("=");
  if (idx <= 0) continue;
  const key = line.slice(0, idx).trim();
  let value = line.slice(idx + 1).trim();
  if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
  envMap[key] = value;
}

const url = envMap.VITE_SUPABASE_URL;
const key = envMap.VITE_SUPABASE_PUBLISHABLE_KEY;

async function call(path, body) {
  const response = await fetch(`${url}${path}`, {
    method: "POST",
    headers: {
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const text = await response.text();
  console.log(`\n${path} => ${response.status}`);
  console.log(text.slice(0, 1000));
}

(async () => {
  await call("/auth/v1/signup", {
    email: "admin@gmail.com",
    password: "123456",
    data: {
      full_name: "Admin",
      role: "admin",
      plan: "premium",
      can_self_manage_plan: false,
      is_testing_account: false,
      subscription_expires_at: null,
    },
  });

  await call("/auth/v1/token?grant_type=password", {
    email: "admin@gmail.com",
    password: "123456",
  });
})();
