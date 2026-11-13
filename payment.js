let selectedMethod = "bkash";
let methods = {};

const numberEl = document.getElementById("payment-number");
const messageEl = document.getElementById("message");
const form = document.getElementById("payment-form");
const submitButton = document.getElementById("submit-button");

function showMessage(text, ok) {
  messageEl.style.display = "block";
  messageEl.style.background = ok ? "#e9f8ef" : "#fff0f0";
  messageEl.style.color = ok ? "#17643b" : "#a32626";
  messageEl.textContent = text;
}

async function loadMethods() {
  try {
    const response = await fetch("/api/payment-methods");
    if (!response.ok) throw new Error("Could not load payment methods");
    const data = await response.json();
    methods = Object.fromEntries(data.methods.map(item => [item.id, item]));
    updateDestination();
  } catch {
    numberEl.textContent = "পেমেন্ট নম্বর লোড করা যায়নি। পরে চেষ্টা করুন।";
  }
}

function updateDestination() {
  const item = methods[selectedMethod];
  numberEl.textContent = item ? `${item.name}: ${item.number}` : "নম্বর পাওয়া যায়নি";
}

document.querySelectorAll(".method").forEach(button => {
  button.addEventListener("click", () => {
    selectedMethod = button.dataset.method;
    document.querySelectorAll(".method").forEach(el =>
      el.setAttribute("aria-pressed", String(el === button))
    );
    updateDestination();
  });
});

form.addEventListener("submit", async event => {
  event.preventDefault();
  messageEl.style.display = "none";
  submitButton.disabled = true;

  const amount = Number(document.getElementById("amount").value);
  const transactionId = document.getElementById("transactionId").value.trim();

  try {
    const response = await fetch("/api/payment-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method: selectedMethod, amount, transactionId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Request failed");

    showMessage(
      `রিকোয়েস্ট জমা হয়েছে। Reference: ${data.requestId}। অবস্থা: ${data.status}। এখনো ব্যালেন্স যোগ হয়নি; অনুমোদিত মাধ্যমে পেমেন্ট যাচাই প্রয়োজন।`,
      true
    );
    form.reset();
  } catch (error) {
    showMessage(error.message || "সমস্যা হয়েছে। আবার চেষ্টা করুন।", false);
  } finally {
    submitButton.disabled = false;
  }
});

loadMethods();
