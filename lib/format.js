export function onlyDigits(v) {
  return (v || "").replace(/\D/g, "");
}

export function formatCnpj(v) {
  const d = onlyDigits(v).slice(0, 14);
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/\.(\d{3})(\d)/, ".$1/$2")
    .replace(/(\d{4})(\d)/, "$1-$2");
}

export function isValidCnpj(v) {
  const c = onlyDigits(v);
  if (c.length !== 14 || /^(\d)\1{13}$/.test(c)) return false;
  const calc = (len) => {
    let sum = 0;
    let pos = len - 7;
    for (let i = len; i >= 1; i--) {
      sum += parseInt(c[len - i], 10) * pos--;
      if (pos < 2) pos = 9;
    }
    const r = sum % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(12);
  const d2 = calc(13);
  return d1 === parseInt(c[12], 10) && d2 === parseInt(c[13], 10);
}

export function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDataCurta(iso) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

export function newQuestion(texto, origem, parentId = null) {
  return {
    id: genId(),
    texto,
    origem, // 'ia' | 'manual' | 'followup'
    status: "pendente", // 'pendente' | 'respondida' | 'pulada'
    resposta: "",
    analisadoResposta: "",
    parentId,
  };
}

export function buildPerfilResumo(client) {
  return {
    regimeTributario: client.regimeTributarioConfirmado,
    setorAtuacao: client.setorAtuacao || client.cnaePrincipal || "não informado",
    cnaePrincipal: client.cnaePrincipal,
    porte: client.porte,
    localidade: client.municipio ? `${client.municipio}/${client.uf}` : "não informada",
    razaoSocial: client.razaoSocial,
  };
}
