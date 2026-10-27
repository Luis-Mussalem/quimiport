import { vi } from 'vitest';
import { CargaQuimica, DadosDaCarga } from '../../src/domain/carga/CargaQuimica';
import { DOCUMENTOS_OBRIGATORIOS } from '../../src/domain/carga/DocumentoDaCarga';
import { StatusDaCarga } from '../../src/domain/carga/StatusDaCarga';
import { DadosDoProduto, ProdutoQuimico } from '../../src/domain/produto/ProdutoQuimico';

// Test Data Builders: montam cenários válidos com poucos parâmetros,
// para que cada teste mostre só o que importa para ele.

export function dadosDeProduto(dados: Partial<DadosDoProduto> = {}): DadosDoProduto {
  return {
    nome: 'Hidróxido de Sódio',
    numeroOnu: 'UN1823',
    classeDeRisco: '8',
    ...dados,
  };
}

export function umProdutoAtivo(dados: Partial<DadosDoProduto> = {}): ProdutoQuimico {
  const resultado = ProdutoQuimico.criar(dadosDeProduto(dados));
  if (!resultado.ok) throw resultado.error;
  return resultado.value;
}

export function umProdutoInativo(dados: Partial<DadosDoProduto> = {}): ProdutoQuimico {
  const produto = umProdutoAtivo(dados);
  produto.inativar();
  return produto;
}

export function dadosDeCarga(produtoId: string, dados: Partial<DadosDaCarga> = {}): DadosDaCarga {
  return {
    codigo: 'CQ-0001',
    produtoId,
    quantidade: 20,
    unidadeDeMedida: 'T',
    origem: 'Navio MSC Aurora',
    destino: 'Terminal Alemoa',
    responsavelTecnico: 'Eng. Carlos Lima',
    documentosApresentados: [...DOCUMENTOS_OBRIGATORIOS],
    ...dados,
  };
}

// Caminho permitido do status REGISTRADA até cada status.
const CAMINHO_ATE: Record<StatusDaCarga, [StatusDaCarga, string?][]> = {
  REGISTRADA: [],
  EM_ANALISE: [['EM_ANALISE']],
  EM_INSPECAO: [['EM_ANALISE'], ['EM_INSPECAO']],
  LIBERADA: [['EM_ANALISE'], ['EM_INSPECAO'], ['LIBERADA']],
  BLOQUEADA: [['EM_ANALISE'], ['EM_INSPECAO'], ['BLOQUEADA', 'Embalagem avariada']],
  EM_MOVIMENTACAO: [['EM_ANALISE'], ['EM_INSPECAO'], ['LIBERADA'], ['EM_MOVIMENTACAO']],
  FINALIZADA: [['EM_ANALISE'], ['EM_INSPECAO'], ['LIBERADA'], ['EM_MOVIMENTACAO'], ['FINALIZADA']],
  CANCELADA: [['CANCELADA', 'Desistência do importador']],
};

export function umaCargaEm(
  status: StatusDaCarga,
  produtoId: string,
  dados: Partial<DadosDaCarga> = {},
): CargaQuimica {
  const registrada = CargaQuimica.registrar(dadosDeCarga(produtoId, dados));
  if (!registrada.ok) throw registrada.error;
  const carga = registrada.value;

  for (const [proximo, motivo] of CAMINHO_ATE[status]) {
    const resultado = carga.alterarStatus(proximo, motivo);
    if (!resultado.ok) throw resultado.error;
  }
  return carga;
}

export function loggerFalso() {
  return {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  };
}
