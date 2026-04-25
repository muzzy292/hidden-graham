// Claude receipt & email scanning for tax deductions

const PROMPT = `You are an Australian tax assistant. Extract ALL individual line items from this receipt or document as separate deductions.

Return ONLY a valid JSON array — no explanation, no markdown:
[
  {
    "merchant": "business/store name",
    "date": "YYYY-MM-DD",
    "amount": 0.00,
    "gst": 0.00,
    "category": "work-related|vehicle-travel|home-office|phone-internet|self-education|donations|investment|other",
    "description": "item name and quantity, e.g. Printer paper A4 x2"
  }
]

Rules:
- Return ONE array entry per distinct line item on the receipt
- If the receipt has only one item, return an array with one entry
- amount = price of that individual line item (inc GST)
- gst = GST for that line item; if not shown per item, calculate as amount / 11
- date = the receipt date for all items
- merchant = the store/supplier name for all items
- Pick the most appropriate ATO category for each individual item
- Use null only if a field truly cannot be determined
- Do NOT return the receipt total as a line item`;

async function _callClaude(messages, apiKey) {
  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-allow-browser": "true"
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages
    })
  });
  if (!resp.ok) throw new Error(`API error ${resp.status}`);
  const data = await resp.json();
  const text = data.content?.[0]?.text || "";
  // Try array first, then object (wrap single object in array)
  const arrMatch = text.match(/\[[\s\S]*\]/);
  if (arrMatch) return JSON.parse(arrMatch[0]);
  const objMatch = text.match(/\{[\s\S]*\}/);
  if (objMatch) return [JSON.parse(objMatch[0])];
  throw new Error("No JSON in response");
}

export async function scanReceiptImage(file, apiKey) {
  const base64 = await new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result.split(",")[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
  return _callClaude([{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
      { type: "text",  text: PROMPT }
    ]
  }], apiKey);
}

export async function scanEmailText(emailText, apiKey) {
  return _callClaude([{
    role: "user",
    content: `${PROMPT}\n\nText to analyse:\n${emailText}`
  }], apiKey);
}
