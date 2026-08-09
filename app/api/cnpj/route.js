import { NextResponse } from "next/server";
import { onlyDigits, isValidCnpj } from "@/lib/format";

// Fonte de dados públicos escolhida: BrasilAPI (https://brasilapi.com.br/api/cnpj/v1/{cnpj})
// Motivo: gratuita, sem chave, agrega dados da Receita Federal de forma já tratada.
// Limitações: sem rate limit documentado, dados podem estar defasados, e não
// retorna o regime tributário efetivo de forma confiável (só opção pelo Simples/MEI).
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const cnpj = onlyDigits(searchParams.get("cnpj"));

  if (!isValidCnpj(cnpj)) {
    return NextResponse.json({ error: "CNPJ inválido." }, { status: 400 });
  }

  let res;
  let lastStatus;
  let lastBody = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, {
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
      },
      cache: "no-store",
    });
    lastStatus = res.status;
    if (res.status === 404) {
      return NextResponse.json({ error: "CNPJ não encontrado na base pública." }, { status: 404 });
    }
    if (res.ok) break;
    lastBody = await res.text().catch(() => "");
    if (attempt === 0) await new Promise((r) => setTimeout(r, 800)); // 1 nova tentativa após falha transitória
  }

  if (!res.ok) {
    const motivo =
      lastStatus === 429
        ? "Limite de consultas da BrasilAPI atingido no momento — aguarde alguns segundos e tente de novo."
        : `A BrasilAPI retornou erro ${lastStatus}: ${lastBody.slice(0, 200) || "sem detalhes"}`;
    return NextResponse.json({ error: `Não foi possível consultar o CNPJ agora. ${motivo}` }, { status: 502 });
  }

  const d = await res.json();
  let regimeInferido = "";
  if (d.opcao_pelo_mei) regimeInferido = "MEI (declarado)";
  else if (d.opcao_pelo_simples) regimeInferido = "Optante pelo Simples (declarado)";
  else regimeInferido = "Sem opção pelo Simples/MEI na base pública";

  return NextResponse.json({
    cnpj,
    razaoSocial: d.razao_social || "",
    nomeFantasia: d.nome_fantasia || "",
    situacaoCadastral: d.descricao_situacao_cadastral || "",
    cnaePrincipal: d.cnae_fiscal_descricao ? `${d.cnae_fiscal} — ${d.cnae_fiscal_descricao}` : d.cnae_fiscal || "",
    cnaesSecundarios: Array.isArray(d.cnaes_secundarios)
      ? d.cnaes_secundarios.map((c) => `${c.codigo} — ${c.descricao}`)
      : [],
    porte: d.descricao_porte || d.porte || "",
    municipio: d.municipio || "",
    uf: d.uf || "",
    regimeInferido,
  });
}
