import { randomUUID } from 'node:crypto';
import {
  RegraDeNegocioError,
  TransicaoDeStatusInvalidaError,
  ValidacaoError,
} from '../shared/DomainError';
import { fail, ok, Result } from '../shared/Result';
import { DOCUMENTOS_OBRIGATORIOS, DocumentoDaCarga, TipoDeDocumento } from './DocumentoDaCarga';
import { Quantidade } from './Quantidade';
import { RegistroDeStatus } from './RegistroDeStatus';
import { isStatusTerminal, StatusDaCarga, TRANSICOES_PERMITIDAS } from './StatusDaCarga';

export interface CargaQuimicaProps {
  id: string;
  codigo: string;
  produtoId: string;
  quantidade: Quantidade;
  origem: string;
  destino: string;
  responsavelTecnico: string;
  documentos: DocumentoDaCarga[];
  status: StatusDaCarga;
  dataDeEntrada: Date;
  criadoEm: Date;
  atualizadoEm: Date;
  historico: RegistroDeStatus[];
  // Versão gravada da carga (0 = ainda não foi salva). Usada pelo repositório
  // para detectar duas alterações simultâneas na mesma carga.
  versao: number;
}

export interface DadosDaCarga {
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

// Status em que a documentação ainda pode ser complementada.
const STATUS_QUE_ACEITAM_DOCUMENTOS: readonly StatusDaCarga[] = [
  'REGISTRADA',
  'EM_ANALISE',
  'EM_INSPECAO',
];

const STATUS_QUE_EXIGEM_MOTIVO: readonly StatusDaCarga[] = ['BLOQUEADA', 'CANCELADA'];

function campoObrigatorio(valor: string | undefined, nome: string): Result<string> {
  const texto = valor?.trim() ?? '';
  if (!texto) return fail(new ValidacaoError(`O campo ${nome} é obrigatório`));
  return ok(texto);
}

export class CargaQuimica {
  private constructor(private props: CargaQuimicaProps) {}

  // A verificação de produto ativo (RN-02) é do caso de uso, pois depende
  // de outro agregado. Aqui ficam só as regras da própria carga.
  static registrar(dados: DadosDaCarga, agora = new Date()): Result<CargaQuimica> {
    const codigo = campoObrigatorio(dados.codigo, 'código');
    if (!codigo.ok) return codigo;
    const produtoId = campoObrigatorio(dados.produtoId, 'produto');
    if (!produtoId.ok) return produtoId;
    const responsavelTecnico = campoObrigatorio(dados.responsavelTecnico, 'responsável técnico');
    if (!responsavelTecnico.ok) return responsavelTecnico;
    const origem = campoObrigatorio(dados.origem, 'origem');
    if (!origem.ok) return origem;
    const destino = campoObrigatorio(dados.destino, 'destino');
    if (!destino.ok) return destino;

    const quantidade = Quantidade.criar(dados.quantidade, dados.unidadeDeMedida);
    if (!quantidade.ok) return quantidade;

    if (dados.dataDeEntrada && Number.isNaN(dados.dataDeEntrada.getTime())) {
      return fail(new ValidacaoError('A data de entrada é inválida'));
    }

    const apresentados = new Set(dados.documentosApresentados ?? []);
    const documentos = DOCUMENTOS_OBRIGATORIOS.map((tipo) => ({
      tipo,
      apresentado: apresentados.has(tipo),
      apresentadoEm: apresentados.has(tipo) ? agora : null,
    }));

    return ok(
      new CargaQuimica({
        id: randomUUID(),
        codigo: codigo.value.toUpperCase(),
        produtoId: produtoId.value,
        quantidade: quantidade.value,
        origem: origem.value,
        destino: destino.value,
        responsavelTecnico: responsavelTecnico.value,
        documentos,
        status: 'REGISTRADA',
        dataDeEntrada: dados.dataDeEntrada ?? agora,
        criadoEm: agora,
        atualizadoEm: agora,
        historico: [
          { id: randomUUID(), statusAnterior: null, statusNovo: 'REGISTRADA', motivo: null, ocorridoEm: agora },
        ],
        versao: 0,
      }),
    );
  }

  static restaurar(props: CargaQuimicaProps): CargaQuimica {
    return new CargaQuimica({
      ...props,
      documentos: [...props.documentos],
      historico: [...props.historico],
    });
  }

  // Única porta de entrada para mudança de status. bloquear(), liberar(),
  // cancelar() etc. só delegam para cá, então a regra fica em um lugar só.
  alterarStatus(novoStatus: StatusDaCarga, motivo?: string, agora = new Date()): Result<void> {
    const atual = this.props.status;

    if (isStatusTerminal(atual)) {
      return fail(
        new TransicaoDeStatusInvalidaError(
          `A carga está ${atual} (status final) e não pode mais ser alterada`,
        ),
      );
    }

    const permitidos = TRANSICOES_PERMITIDAS[atual];
    if (!permitidos.includes(novoStatus)) {
      return fail(
        new TransicaoDeStatusInvalidaError(
          `Transição de ${atual} para ${novoStatus} não é permitida. ` +
            `A partir de ${atual} são permitidos: ${permitidos.join(', ')}`,
        ),
      );
    }

    if (novoStatus === 'LIBERADA' && !this.documentacaoCompleta) {
      return fail(
        new RegraDeNegocioError(
          `A carga não pode ser liberada sem a documentação obrigatória. Pendentes: ${this.documentosPendentes.join(', ')}`,
        ),
      );
    }

    const motivoInformado = motivo?.trim() || null;
    if (STATUS_QUE_EXIGEM_MOTIVO.includes(novoStatus) && !motivoInformado) {
      return fail(new ValidacaoError(`É obrigatório informar o motivo para mudar para ${novoStatus}`));
    }

    this.props.status = novoStatus;
    this.props.atualizadoEm = agora;
    this.props.historico.push({
      id: randomUUID(),
      statusAnterior: atual,
      statusNovo: novoStatus,
      motivo: motivoInformado,
      ocorridoEm: agora,
    });
    return ok();
  }

  liberar(agora = new Date()): Result<void> {
    return this.alterarStatus('LIBERADA', undefined, agora);
  }

  bloquear(motivo: string, agora = new Date()): Result<void> {
    return this.alterarStatus('BLOQUEADA', motivo, agora);
  }

  cancelar(motivo: string, agora = new Date()): Result<void> {
    return this.alterarStatus('CANCELADA', motivo, agora);
  }

  movimentar(agora = new Date()): Result<void> {
    return this.alterarStatus('EM_MOVIMENTACAO', undefined, agora);
  }

  registrarDocumento(tipo: TipoDeDocumento, apresentado: boolean, agora = new Date()): Result<void> {
    if (!STATUS_QUE_ACEITAM_DOCUMENTOS.includes(this.props.status)) {
      return fail(
        new RegraDeNegocioError(
          `A documentação não pode ser alterada com a carga ${this.props.status}`,
        ),
      );
    }

    this.props.documentos = this.props.documentos.map((documento) =>
      documento.tipo === tipo
        ? { tipo, apresentado, apresentadoEm: apresentado ? agora : null }
        : documento,
    );
    this.props.atualizadoEm = agora;
    return ok();
  }

  get documentosPendentes(): TipoDeDocumento[] {
    return this.props.documentos.filter((d) => !d.apresentado).map((d) => d.tipo);
  }

  get documentacaoCompleta(): boolean {
    return this.documentosPendentes.length === 0;
  }

  get id(): string {
    return this.props.id;
  }

  get codigo(): string {
    return this.props.codigo;
  }

  get status(): StatusDaCarga {
    return this.props.status;
  }

  get versao(): number {
    return this.props.versao;
  }

  get historico(): readonly RegistroDeStatus[] {
    return [...this.props.historico];
  }

  toProps(): Readonly<CargaQuimicaProps> {
    return {
      ...this.props,
      documentos: [...this.props.documentos],
      historico: [...this.props.historico],
    };
  }
}
