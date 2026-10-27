import { randomUUID } from 'node:crypto';
import { ValidacaoError } from '../shared/DomainError';
import { fail, ok, Result } from '../shared/Result';
import { ClasseDeRisco, isClasseDeRisco } from './ClasseDeRisco';
import { StatusDoProduto } from './StatusDoProduto';

export interface ProdutoQuimicoProps {
  id: string;
  nome: string;
  descricao: string | null;
  numeroOnu: string | null;
  classeDeRisco: ClasseDeRisco;
  grupoDeCompatibilidade: string | null;
  status: StatusDoProduto;
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface DadosDoProduto {
  nome: string;
  descricao?: string | null;
  numeroOnu?: string | null;
  classeDeRisco: string;
  grupoDeCompatibilidade?: string | null;
}

// Aceita "UN1203" ou só os 4 dígitos ("1203"), inclusive códigos simulados.
const NUMERO_ONU = /^(UN)?\d{4}$/;

type DadosValidados = Pick<
  ProdutoQuimicoProps,
  'nome' | 'descricao' | 'numeroOnu' | 'classeDeRisco' | 'grupoDeCompatibilidade'
>;

function validar(dados: DadosDoProduto): Result<DadosValidados> {
  const nome = dados.nome?.trim() ?? '';
  if (!nome) {
    return fail(new ValidacaoError('O nome do produto é obrigatório'));
  }
  if (nome.length > 150) {
    return fail(new ValidacaoError('O nome do produto deve ter no máximo 150 caracteres'));
  }

  if (!dados.classeDeRisco) {
    return fail(new ValidacaoError('A classe de risco é obrigatória'));
  }
  if (!isClasseDeRisco(dados.classeDeRisco)) {
    return fail(new ValidacaoError(`Classe de risco inválida: ${dados.classeDeRisco}`));
  }

  let numeroOnu: string | null = null;
  if (dados.numeroOnu) {
    const valor = dados.numeroOnu.trim().toUpperCase();
    if (!NUMERO_ONU.test(valor)) {
      return fail(new ValidacaoError('O número ONU deve ter o formato UN0000'));
    }
    numeroOnu = valor.startsWith('UN') ? valor : `UN${valor}`;
  }

  return ok({
    nome,
    descricao: dados.descricao?.trim() || null,
    numeroOnu,
    classeDeRisco: dados.classeDeRisco,
    grupoDeCompatibilidade: dados.grupoDeCompatibilidade?.trim().toUpperCase() || null,
  });
}

export class ProdutoQuimico {
  private constructor(private props: ProdutoQuimicoProps) {}

  static criar(dados: DadosDoProduto, agora = new Date()): Result<ProdutoQuimico> {
    const validacao = validar(dados);
    if (!validacao.ok) return validacao;

    return ok(
      new ProdutoQuimico({
        id: randomUUID(),
        ...validacao.value,
        status: 'ATIVO',
        criadoEm: agora,
        atualizadoEm: agora,
      }),
    );
  }

  // Reconstrói um produto já existente (ex.: vindo do banco), sem gerar novo id.
  static restaurar(props: ProdutoQuimicoProps): ProdutoQuimico {
    return new ProdutoQuimico({ ...props });
  }

  atualizar(dados: DadosDoProduto, agora = new Date()): Result<void> {
    const validacao = validar(dados);
    if (!validacao.ok) return validacao;

    this.props = { ...this.props, ...validacao.value, atualizadoEm: agora };
    return ok();
  }

  // Inativação lógica: o produto continua existindo para as cargas antigas.
  inativar(agora = new Date()): void {
    if (this.props.status === 'INATIVO') return;
    this.props.status = 'INATIVO';
    this.props.atualizadoEm = agora;
  }

  get id(): string {
    return this.props.id;
  }

  get nome(): string {
    return this.props.nome;
  }

  get classeDeRisco(): ClasseDeRisco {
    return this.props.classeDeRisco;
  }

  get status(): StatusDoProduto {
    return this.props.status;
  }

  get estaAtivo(): boolean {
    return this.props.status === 'ATIVO';
  }

  toProps(): Readonly<ProdutoQuimicoProps> {
    return { ...this.props };
  }
}
