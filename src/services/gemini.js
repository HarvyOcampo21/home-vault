// Updated to v1beta and model version 2.5-flash
const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

const RECEIPT_PROMPT = `You are a receipt scanner. Analyze this receipt image or document and extract all information.

Return ONLY a valid JSON object with this exact structure — no markdown, no explanation, just JSON:
{
  "store": "store or merchant name",
  "date": "YYYY-MM-DD format, or today's date if unclear",
  "receiptNumber": "receipt, invoice, or reference number, or null if not found",
  "items": [
    {
      "name": "item name, be concise and clear",
      "totalPrice": 0.00
    }
  ],
  "total": 0.00
}

Rules:
- Extract EVERY line item you can see
- Prices must be numbers (no currency symbols)
- If a quantity is shown (e.g. 2x item @ 5.00 = 10.00), list it as one item with totalPrice as the line total
- If you cannot read something clearly, make your best guess
- Do not include subtotals, taxes, discounts, or payment method lines as items — only actual purchased items
- The "total" field is the grand total paid`;

export async function scanReceipt(apiKey, imageBase64, mimeType) {
  if (!apiKey)
    throw new Error(
      "Gemini API key not configured. Please add it in Settings.",
    );

  const isDocument = mimeType === "application/pdf";

  const part = isDocument
    ? { inline_data: { mime_type: mimeType, data: imageBase64 } }
    : { inline_data: { mime_type: mimeType, data: imageBase64 } };

  const body = {
    contents: [
      {
        parts: [{ text: RECEIPT_PROMPT }, part],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 2048,
      // Add this line to force JSON mode
      response_mime_type: "application/json",
    },
  };

  const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const msg = err?.error?.message || `Gemini error ${response.status}`;
    throw new Error(msg);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

  // If you use response_mime_type, 'text' will already be a clean JSON string
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Could not read the receipt logic.");
  }

  // Normalize items
  const items = (parsed.items || []).map((item) => ({
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: item.name || "Unknown item",
    totalPrice: Number(item.totalPrice) || 0,
    category: "house",
    forMember: "",
    status: "paid",
  }));

  return {
    store: parsed.store || "",
    date: parsed.date || new Date().toISOString().split("T")[0],
    receiptNumber: parsed.receiptNumber || "",
    items,
    total: Number(parsed.total) || 0,
  };
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1]);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}
