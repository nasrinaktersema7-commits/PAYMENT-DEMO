const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const paymentNumbers = require("./number");

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, "data");
const DB_FILE = path.join(DATA_DIR, "payment-requests.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, "[]", "utf8");

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));

function readRequests() {
  try { return JSON.parse(fs.readFileSync(DB_FILE, "utf8")); }
  catch { return []; }
}
function writeRequests(items) {
  fs.writeFileSync(DB_FILE, JSON.stringify(items, null, 2), "utf8");
}

// Only publish payment destination numbers, never credentials.
app.get("/api/payment-methods", (req, res) => {
  res.json({
    methods: [
      { id: "bkash", name: "bKash", number: paymentNumbers.bkash },
      { id: "nagad", name: "Nagad", number: paymentNumbers.nagad },
      { id: "rocket", name: "Rocket", number: paymentNumbers.rocket }
    ]
  });
});

// Creates a PENDING request only. It does NOT verify a transfer or add wallet balance.
app.post("/api/payment-requests", (req, res) => {
  const { method, amount, transactionId } = req.body || {};
  const allowed = ["bkash", "nagad", "rocket"];

  if (!allowed.includes(method)) {
    return res.status(400).json({ success: false, message: "Choose a valid payment method." });
  }
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > 50000) {
    return res.status(400).json({ success: false, message: "Amount must be a whole number from 1 to 50000 BDT." });
  }
  if (typeof transactionId !== "string" || !/^[A-Za-z0-9-]{6,40}$/.test(transactionId.trim())) {
    return res.status(400).json({ success: false, message: "Enter a valid transaction reference (6–40 letters/numbers)." });
  }

  const trx = transactionId.trim().toUpperCase();
  const requests = readRequests();
  const duplicate = requests.some(r => r.method === method && r.transactionId === trx);
  if (duplicate) {
    return res.status(409).json({ success: false, message: "This transaction reference has already been submitted." });
  }

  const item = {
    id: crypto.randomUUID(),
    method,
    amount,
    transactionId: trx,
    status: "PENDING_REVIEW",
    createdAt: new Date().toISOString()
  };
  requests.push(item);
  writeRequests(requests);

  return res.status(202).json({
    success: true,
    requestId: item.id,
    status: item.status,
    message: "Request received. No balance has been added; payment must be verified through an authorized provider channel."
  });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Payment request server listening on port ${PORT}`);
});
