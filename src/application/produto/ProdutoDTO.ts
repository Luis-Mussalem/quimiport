import { ProdutoQuimico } from '../../domain/produto/ProdutoQuimico';

// Formato de saída do produto: o que sai da aplicação para quem chamou.
export interface ProdutoDTO {
  id: string;
  nome: string;
  descricao: string | null;
  numeroOnu: string | null;
  classeDeRisco: string;
  grupoDeCompatibilidade: string | null;
  status: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface DadosDoProdutoDTO {
  nome: string;
  descricao?: string | null;
  numeroOnu?: string | null;
  classeDeRisco: string;
  grupoDeCompatibilidade?: string | null;
}

export function paraProdutoDTO(produto: ProdutoQuimico): ProdutoDTO {
  const p = produto.toProps();
  return {
    id: p.id,
    nome: p.nome,
    descricao: p.descricao,
    numeroOnu: p.numeroOnu,
    classeDeRisco: p.classeDeRisco,
    grupoDeCompatibilidade: p.grupoDeCompatibilidade,
    status: p.status,
    criadoEm: p.criadoEm.toISOString(),
    atualizadoEm: p.atualizadoEm.toISOString(),
  };
}
