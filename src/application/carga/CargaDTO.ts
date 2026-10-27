import { CargaQuimica } from '../../domain/carga/CargaQuimica';
import { TipoDeDocumento } from '../../domain/carga/DocumentoDaCarga';

export interface CargaDTO {
  id: string;
  codigo: string;
  produtoId: string;
  quantidade: number;
  unidadeDeMedida: string;
  origem: string;
  destino: string;
  responsavelTecnico: string;
  status: string;
  documentacao: {
    completa: boolean;
    documentos: { tipo: string; apresentado: boolean; apresentadoEm: string | null }[];
  };
  historico: {
    statusAnterior: string | null;
    statusNovo: string;
    motivo: string | null;
    ocorridoEm: string;
  }[];
  dataDeEntrada: string;
  criadoEm: string;
  atualizadoEm: string;
}

export interface RegistrarCargaDTO {
  codigo: string;
  produtoId: string;
  quantidade: number;
  unidadeDeMedida: string;
  origem: string;
  destino: string;
  responsavelTecnico: string;
  documentosApresentados?: TipoDeDocumento[];
  dataDeEntrada?: Date;
}

export function paraCargaDTO(carga: CargaQuimica): CargaDTO {
  const c = carga.toProps();
  return {
    id: c.id,
    codigo: c.codigo,
    produtoId: c.produtoId,
    quantidade: c.quantidade.valor,
    unidadeDeMedida: c.quantidade.unidade,
    origem: c.origem,
    destino: c.destino,
    responsavelTecnico: c.responsavelTecnico,
    status: c.status,
    documentacao: {
      completa: carga.documentacaoCompleta,
      documentos: c.documentos.map((d) => ({
        tipo: d.tipo,
        apresentado: d.apresentado,
        apresentadoEm: d.apresentadoEm?.toISOString() ?? null,
      })),
    },
    historico: c.historico.map((h) => ({
      statusAnterior: h.statusAnterior,
      statusNovo: h.statusNovo,
      motivo: h.motivo,
      ocorridoEm: h.ocorridoEm.toISOString(),
    })),
    dataDeEntrada: c.dataDeEntrada.toISOString(),
    criadoEm: c.criadoEm.toISOString(),
    atualizadoEm: c.atualizadoEm.toISOString(),
  };
}
