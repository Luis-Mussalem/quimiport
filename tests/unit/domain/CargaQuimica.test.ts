import { describe, expect, it } from 'vitest';
import { CargaQuimica, DadosDaCarga } from '../../../src/domain/carga/CargaQuimica';
import { DOCUMENTOS_OBRIGATORIOS } from '../../../src/domain/carga/DocumentoDaCarga';
import { StatusDaCarga } from '../../../src/domain/carga/StatusDaCarga';
import {
  RegraDeNegocioError,
  TransicaoDeStatusInvalidaError,
  ValidacaoError,
} from '../../../src/domain/shared/DomainError';

const dadosValidos: DadosDaCarga = {
  codigo: 'cq-2026-0001',
  produtoId: 'produto-1',
  quantidade: 1200,
  unidadeDeMedida: 'KG',
  origem: 'Terminal Alemoa',
  destino: 'Armazém 12',
  responsavelTecnico: 'Eng. Maria Souza',
  documentosApresentados: [...DOCUMENTOS_OBRIGATORIOS],
};

function registrar(dados: Partial<DadosDaCarga> = {}): CargaQuimica {
  const resultado = CargaQuimica.registrar({ ...dadosValidos, ...dados });
  if (!resultado.ok) throw resultado.error;
  return resultado.value;
}

// Leva a carga até o status desejado pelo caminho permitido.
function cargaEm(status: StatusDaCarga, dados: Partial<DadosDaCarga> = {}): CargaQuimica {
  const caminhos: Record<StatusDaCarga, [StatusDaCarga, string?][]> = {
    REGISTRADA: [],
    EM_ANALISE: [['EM_ANALISE']],
    EM_INSPECAO: [['EM_ANALISE'], ['EM_INSPECAO']],
    LIBERADA: [['EM_ANALISE'], ['EM_INSPECAO'], ['LIBERADA']],
    BLOQUEADA: [['EM_ANALISE'], ['EM_INSPECAO'], ['BLOQUEADA', 'Embalagem avariada']],
    EM_MOVIMENTACAO: [['EM_ANALISE'], ['EM_INSPECAO'], ['LIBERADA'], ['EM_MOVIMENTACAO']],
    FINALIZADA: [['EM_ANALISE'], ['EM_INSPECAO'], ['LIBERADA'], ['EM_MOVIMENTACAO'], ['FINALIZADA']],
    CANCELADA: [['CANCELADA', 'Desistência do importador']],
  };
  const carga = registrar(dados);
  for (const [proximo, motivo] of caminhos[status]) {
    const resultado = carga.alterarStatus(proximo, motivo);
    if (!resultado.ok) throw resultado.error;
  }
  return carga;
}

describe('CargaQuimica', () => {
  describe('registro', () => {
    it('registra a carga com status REGISTRADA e histórico inicial', () => {
      const carga = registrar();

      const props = carga.toProps();
      expect(props.status).toBe('REGISTRADA');
      expect(props.codigo).toBe('CQ-2026-0001');
      expect(props.quantidade.valor).toBe(1200);
      expect(props.documentos).toHaveLength(DOCUMENTOS_OBRIGATORIOS.length);
      expect(carga.historico).toHaveLength(1);
      expect(carga.historico[0]?.statusNovo).toBe('REGISTRADA');
    });

    it.each([0, -10])('rejeita quantidade %s', (quantidade) => {
      const resultado = CargaQuimica.registrar({ ...dadosValidos, quantidade });

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
      expect(resultado.error.message).toMatch(/maior que zero/);
    });

    it('rejeita carga sem responsável técnico', () => {
      const resultado = CargaQuimica.registrar({ ...dadosValidos, responsavelTecnico: ' ' });

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error.message).toMatch(/responsável técnico/);
    });

    it('rejeita carga sem produto associado', () => {
      const resultado = CargaQuimica.registrar({ ...dadosValidos, produtoId: '' });

      expect(resultado.ok).toBe(false);
    });
  });

  describe('atualização de status', () => {
    it('percorre o fluxo completo até FINALIZADA registrando o histórico', () => {
      const carga = cargaEm('FINALIZADA');

      expect(carga.status).toBe('FINALIZADA');
      expect(carga.historico.map((h) => h.statusNovo)).toEqual([
        'REGISTRADA',
        'EM_ANALISE',
        'EM_INSPECAO',
        'LIBERADA',
        'EM_MOVIMENTACAO',
        'FINALIZADA',
      ]);
    });

    it('rejeita transição proibida e mantém o status atual', () => {
      const carga = registrar();

      const resultado = carga.alterarStatus('LIBERADA');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(TransicaoDeStatusInvalidaError);
      expect(carga.status).toBe('REGISTRADA');
      expect(carga.historico).toHaveLength(1);
    });

    it('não finaliza carga em inspeção sem passar por LIBERADA', () => {
      const carga = cargaEm('EM_INSPECAO');

      const resultado = carga.alterarStatus('FINALIZADA');

      expect(resultado.ok).toBe(false);
      expect(carga.status).toBe('EM_INSPECAO');
    });

    it('exige motivo para bloquear', () => {
      const carga = cargaEm('EM_INSPECAO');

      const resultado = carga.bloquear('  ');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
    });
  });

  describe('liberação', () => {
    it('libera carga em inspeção com documentação completa', () => {
      const carga = cargaEm('EM_INSPECAO');

      expect(carga.liberar().ok).toBe(true);
      expect(carga.status).toBe('LIBERADA');
    });

    it('não libera carga sem a documentação obrigatória', () => {
      const carga = cargaEm('EM_INSPECAO', { documentosApresentados: ['FDS'] });

      const resultado = carga.liberar();

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(RegraDeNegocioError);
      expect(resultado.error.message).toMatch(/FICHA_DE_EMERGENCIA/);
      expect(carga.status).toBe('EM_INSPECAO');
    });

    it('libera depois que a documentação pendente é apresentada', () => {
      const carga = cargaEm('EM_INSPECAO', { documentosApresentados: [] });
      for (const tipo of DOCUMENTOS_OBRIGATORIOS) {
        carga.registrarDocumento(tipo, true);
      }

      expect(carga.liberar().ok).toBe(true);
    });

    it('não libera carga cancelada', () => {
      const carga = cargaEm('CANCELADA');

      const resultado = carga.liberar();

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(TransicaoDeStatusInvalidaError);
    });
  });

  describe('bloqueio e movimentação', () => {
    it('não movimenta carga bloqueada', () => {
      const carga = cargaEm('BLOQUEADA');

      const resultado = carga.movimentar();

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(TransicaoDeStatusInvalidaError);
      expect(carga.status).toBe('BLOQUEADA');
    });

    it('não libera carga bloqueada', () => {
      const carga = cargaEm('BLOQUEADA');

      expect(carga.liberar().ok).toBe(false);
    });

    it('movimenta carga liberada', () => {
      const carga = cargaEm('LIBERADA');

      expect(carga.movimentar().ok).toBe(true);
      expect(carga.status).toBe('EM_MOVIMENTACAO');
    });
  });

  describe('cancelamento', () => {
    it.each<StatusDaCarga>(['REGISTRADA', 'EM_ANALISE', 'EM_INSPECAO', 'LIBERADA', 'BLOQUEADA'])(
      'cancela carga %s registrando o motivo',
      (status) => {
        const carga = cargaEm(status);

        const resultado = carga.cancelar('Documentação divergente');

        expect(resultado.ok).toBe(true);
        expect(carga.status).toBe('CANCELADA');
        expect(carga.historico.at(-1)?.motivo).toBe('Documentação divergente');
      },
    );

    it.each<StatusDaCarga>(['EM_MOVIMENTACAO', 'FINALIZADA', 'CANCELADA'])(
      'não cancela carga %s',
      (status) => {
        const carga = cargaEm(status);

        expect(carga.cancelar('Qualquer motivo').ok).toBe(false);
      },
    );

    it('não altera mais nada depois de cancelada', () => {
      const carga = cargaEm('CANCELADA');

      const resultado = carga.alterarStatus('EM_ANALISE');

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error.message).toMatch(/status final/);
    });
  });

  describe('documentação', () => {
    it('não permite alterar documentos depois da liberação', () => {
      const carga = cargaEm('LIBERADA');

      const resultado = carga.registrarDocumento('FDS', false);

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(RegraDeNegocioError);
    });
  });
});
