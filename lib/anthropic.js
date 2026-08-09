const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-sonnet-4-6";

function stripFences(text) {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

export function parseAiJson(text) {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // tenta extrair o trecho JSON de dentro do texto abaixo
  }
  const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (match) {
    try {
      return JSON.parse(match[0]);
    } catch {
      // cai no erro abaixo
    }
  }
  throw new Error("Não foi possível interpretar a resposta da IA.");
}

// Chamada server-side à API da Anthropic. A chave (ANTHROPIC_API_KEY) nunca
// é exposta ao navegador — só existe como variável de ambiente do servidor.
export async function callClaude(system, userContent, { useWebSearch = false } = {}) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY não configurada no servidor.");

  const body = {
    model: MODEL,
    max_tokens: useWebSearch ? 2500 : 1200,
    system,
    messages: [{ role: "user", content: userContent }],
  };
  if (useWebSearch) {
    body.tools = [{ type: "web_search_20250305", name: "web_search" }];
  }

  const response = await fetch(ANTHROPIC_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`Falha ao chamar a IA (${response.status}): ${errText.slice(0, 200)}`);
  }

  const data = await response.json();
  return (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("\n");
}
