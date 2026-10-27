import { CargaQuimica } from '../../domain/carga/CargaQuimica';
import { CargaQuimicaRepository } from '../../domain/carga/CargaQuimicaRepository';
import { ProdutoQuimicoRepository } from '../../domain/produto/ProdutoQuimicoRepository';
import { RegraDeNegocioError } from '../../domain/shared/DomainError';
import { fail, ok, Result } from '../../domain/shared/Result';
import { ConflitoError, ErroDeCasoDeUso } from '../shared/ApplicationError';
import { Logger } from '../shared/Logger';
import { CargaDTO, paraCargaDTO, RegistrarCargaDTO } from './CargaDTO';

export class RegistrarCarga {
  constructor(
    private readonly cargas: CargaQuimicaRepository,
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async executar(dados: RegistrarCargaDTO): Promise<Result<CargaDTO, ErroDeCasoDeUso>> {
    // 1. Regras da própria carga (campos obrigatórios, quantidade > 0).
    const resultado = CargaQuimica.registrar(dados);
    if (!resultado.ok) return resultado;
    const carga = resultado.value;

    // 2. Regras que dependem de outro agregado (RN-01, RN-02, RN-10).
    const produto = await this.produtos.buscarPorId(carga.toProps().produtoId);
    if (!produto) {
      return fail(new RegraDeNegocioError(`Produto associado ${dados.produtoId} não existe`));
    }
    if (!produto.estaAtivo) {
      this.logger.warn('carga.registro_rejeitado', {
        motivo: 'produto_inativo',
        produtoId: produto.id,
        codigo: carga.codigo,
      });
      return fail(
        new RegraDeNegocioError(`O produto ${produto.nome} está inativo e não pode ser usado em novas cargas`),
      );
    }

    // 3. O código da carga é único.
    if (await this.cargas.buscarPorCodigo(carga.codigo)) {
      return fail(new ConflitoError(`Já existe uma carga com o código ${carga.codigo}`));
    }

    await this.cargas.salvar(carga);
    this.logger.info('carga.registrada', {
      cargaId: carga.id,
      codigo: carga.codigo,
      produtoId: produto.id,
      documentacaoCompleta: carga.documentacaoCompleta,
    });
    return ok(paraCargaDTO(carga));
  }
}
