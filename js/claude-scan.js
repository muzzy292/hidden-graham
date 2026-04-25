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

// Compress image to max 1600px and JPEG 0.85 quality before sending to Claude
async function _compressImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        if (width > height) { height = Math.round(height * MAX / width); width = MAX; }
        else                { width  = Math.round(width  * MAX / height); height = MAX; }
      }
      const canvas = document.createElement("canvas");
      canvas.width = width; canvas.height = height;
      canvas.getContext("2d").drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.85).split(",")[1]);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export async function scanReceiptImage(file, apiKey) {
  // Compress images; for PDFs fall back to raw base64
  let base64, mimeType;
  if (file.type === "application/pdf") {
    base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload  = e => resolve(e.target.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    mimeType = "application/pdf";
  } else {
    base64   = await _compressImage(file);
    mimeType = "image/jpeg";
  }

  return _callClaude([{
    role: "user",
    content: [
      { type: "image", source: { type: "base64", media_type: mimeType, data: base64 } },
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
