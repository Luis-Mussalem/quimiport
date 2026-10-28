import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { CasosDeUso } from '../../../application/CasosDeUso';
import { StatusDaCarga } from '../../../domain/carga/StatusDaCarga';
import { valorOuErro } from '../erros';
import { documentar } from '../openapi';
import {
  alterarStatusBody,
  cargaResposta,
  documentoBody,
  filtroDeCargasQuery,
  motivoBody,
  registrarCargaBody,
} from '../schemas/carga';
import { erroResposta, idParams } from '../schemas/comum';

const tags = ['Cargas químicas'];

const respostasDeStatus = {
  200: { descricao: 'Status atualizado', schema: cargaResposta },
  400: { descricao: 'Dados inválidos (ex.: motivo ausente)', schema: erroResposta },
  404: { descricao: 'Carga não encontrada', schema: erroResposta },
  409: { descricao: 'Transição de status não permitida ou carga alterada por outra operação', schema: erroResposta },
  422: { descricao: 'Regra de negócio violada (ex.: documentação obrigatória pendente)', schema: erroResposta },
};

export function rotasDeCargas(casos: CasosDeUso): FastifyPluginAsync {
  return async (app) => {
    // Todos os endpoints de status chegam aqui e, daqui, ao mesmo método
    // do domínio (CargaQuimica.alterarStatus): uma única fonte da verdade.
    const alterarStatus = async (id: string, novoStatus: StatusDaCarga, motivo?: string) =>
      valorOuErro(await casos.alterarStatusDaCarga.executar({ cargaId: id, novoStatus, motivo }));

    app.post(
      '/cargas-quimicas',
      {
        schema: documentar({
          tags,
          summary: 'Registra uma carga química',
          description:
            'O produto associado deve existir e estar ATIVO. A carga começa no status REGISTRADA. ' +
            'Documentos obrigatórios: FDS, FICHA_DE_EMERGENCIA e DECLARACAO_DE_MERCADORIA_PERIGOSA.',
          body: registrarCargaBody,
          respostas: {
            201: { descricao: 'Carga registrada', schema: cargaResposta },
            400: { descricao: 'Dados inválidos (ex.: quantidade <= 0, sem responsável técnico)', schema: erroResposta },
            409: { descricao: 'Já existe uma carga com este código', schema: erroResposta },
            422: { descricao: 'Produto inexistente ou inativo', schema: erroResposta },
          },
        }),
      },
      async (request, reply) => {
        const { dataDeEntrada, ...dados } = registrarCargaBody.parse(request.body);
        const carga = valorOuErro(
          await casos.registrarCarga.executar({
            ...dados,
            dataDeEntrada: dataDeEntrada ? new Date(dataDeEntrada) : undefined,
          }),
        );
        return reply.status(201).send(carga);
      },
    );

    app.get(
      '/cargas-quimicas',
      {
        schema: documentar({
          tags,
          summary: 'Lista as cargas químicas',
          description: 'Filtros opcionais por status e por produto.',
          querystring: filtroDeCargasQuery,
          respostas: {
            200: { descricao: 'Lista de cargas', schema: z.array(cargaResposta) },
            400: { descricao: 'Filtro inválido', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const filtro = filtroDeCargasQuery.parse(request.query);
        return casos.listarCargas.executar(filtro);
      },
    );

    app.get(
      '/cargas-quimicas/:id',
      {
        schema: documentar({
          tags,
          summary: 'Busca uma carga química pelo id',
          description: 'Inclui a situação da documentação e o histórico de status.',
          params: idParams,
          respostas: {
            200: { descricao: 'Carga encontrada', schema: cargaResposta },
            400: { descricao: 'Id inválido', schema: erroResposta },
            404: { descricao: 'Carga não encontrada', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        return valorOuErro(await casos.buscarCarga.executar(id));
      },
    );

    app.patch(
      '/cargas-quimicas/:id/status',
      {
        schema: documentar({
          tags,
          summary: 'Atualiza o status da carga',
          description:
            'Transições permitidas: REGISTRADA → EM_ANALISE | CANCELADA; EM_ANALISE → EM_INSPECAO | CANCELADA; ' +
            'EM_INSPECAO → LIBERADA | BLOQUEADA | CANCELADA; LIBERADA → EM_MOVIMENTACAO | CANCELADA; ' +
            'BLOQUEADA → CANCELADA; EM_MOVIMENTACAO → FINALIZADA. FINALIZADA e CANCELADA são finais. ' +
            'Qualquer outra transição é recusada. BLOQUEADA e CANCELADA exigem motivo.',
          params: idParams,
          body: alterarStatusBody,
          respostas: respostasDeStatus,
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        const { status, motivo } = alterarStatusBody.parse(request.body);
        return alterarStatus(id, status, motivo);
      },
    );

    app.patch(
      '/cargas-quimicas/:id/bloquear',
      {
        schema: documentar({
          tags,
          summary: 'Bloqueia a carga',
          description: 'Só é permitido a partir de EM_INSPECAO. Carga bloqueada não entra em movimentação.',
          params: idParams,
          body: motivoBody,
          respostas: respostasDeStatus,
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        const { motivo } = motivoBody.parse(request.body);
        return alterarStatus(id, 'BLOQUEADA', motivo);
      },
    );

    app.patch(
      '/cargas-quimicas/:id/liberar',
      {
        schema: documentar({
          tags,
          summary: 'Libera a carga',
          description:
            'Só é permitido a partir de EM_INSPECAO e com toda a documentação obrigatória apresentada.',
          params: idParams,
          respostas: respostasDeStatus,
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        return alterarStatus(id, 'LIBERADA');
      },
    );

    app.patch(
      '/cargas-quimicas/:id/cancelar',
      {
        schema: documentar({
          tags,
          summary: 'Cancela a carga',
          description: 'Permitido antes da movimentação. Carga cancelada não pode mais ser alterada.',
          params: idParams,
          body: motivoBody,
          respostas: respostasDeStatus,
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        const { motivo } = motivoBody.parse(request.body);
        return alterarStatus(id, 'CANCELADA', motivo);
      },
    );

    app.patch(
      '/cargas-quimicas/:id/documentos',
      {
        schema: documentar({
          tags,
          summary: 'Registra a apresentação de um documento obrigatório',
          description: 'Permitido enquanto a carga está REGISTRADA, EM_ANALISE ou EM_INSPECAO.',
          params: idParams,
          body: documentoBody,
          respostas: {
            200: { descricao: 'Documento atualizado', schema: cargaResposta },
            400: { descricao: 'Dados inválidos', schema: erroResposta },
            404: { descricao: 'Carga não encontrada', schema: erroResposta },
            422: { descricao: 'Documentação não pode mais ser alterada neste status', schema: erroResposta },
          },
        }),
      },
      async (request) => {
        const { id } = idParams.parse(request.params);
        const { tipo, apresentado } = documentoBody.parse(request.body);
        return valorOuErro(await casos.registrarDocumentoDaCarga.executar({ cargaId: id, tipo, apresentado }));
      },
    );
  };
}
