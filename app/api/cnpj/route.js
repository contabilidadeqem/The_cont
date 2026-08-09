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

  const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
  if (res.status === 404) {
    return NextResponse.json({ error: "CNPJ não encontrado na base pública." }, { status: 404 });
  }
  if (!res.ok) {
    return NextResponse.json({ error: "Não foi possível consultar o CNPJ agora." }, { status: 502 });
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
