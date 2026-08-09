"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatCnpj, onlyDigits } from "@/lib/format";

export default function HomePage() {
  const [clients, setClients] = useState([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(() => {
      fetch(`/api/clients?q=${encodeURIComponent(query)}`, { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => setClients(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, 250);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query]);

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Carteira de clientes</p>
          <h1 className="title">Perfis cadastrados</h1>
        </div>
        <Link className="btn btn-primary" href="/novo">+ Novo cliente</Link>
      </header>

      <input
        className="search"
        placeholder="Buscar por razão social, nome fantasia ou CNPJ"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {loading ? (
        <p style={{ color: "#8B9A93" }}>Carregando…</p>
      ) : clients.length === 0 ? (
        <div className="empty">
          <p className="empty-title">{query ? "Nada encontrado" : "Nenhum cliente cadastrado ainda"}</p>
          <p className="empty-sub">{query ? "Ajuste a busca ou cadastre um novo cliente." : "Cadastre o primeiro cliente informando o CNPJ."}</p>
        </div>
      ) : (
        <div className="grid">
          {clients.map((c) => (
            <Link key={c.cnpj} className="client-card" href={`/clientes/${onlyDigits(c.cnpj)}`}>
              <div className="stamp">{formatCnpj(c.cnpj)}</div>
              <div className="client-name">{c.razaoSocial || "Razão social não informada"}</div>
              {c.nomeFantasia && <div className="client-fantasia">{c.nomeFantasia}</div>}
              <div className="client-meta">
                <span>{c.municipio ? `${c.municipio}/${c.uf}` : "Localidade não informada"}</span>
                <span className="dot">•</span>
                <span>{c.regimeTributarioConfirmado}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
