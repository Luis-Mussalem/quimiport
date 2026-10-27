import { ProdutoQuimico } from '../../domain/produto/ProdutoQuimico';
import { ProdutoQuimicoRepository } from '../../domain/produto/ProdutoQuimicoRepository';
import { ok, Result } from '../../domain/shared/Result';
import { ErroDeCasoDeUso } from '../shared/ApplicationError';
import { Logger } from '../shared/Logger';
import { DadosDoProdutoDTO, paraProdutoDTO, ProdutoDTO } from './ProdutoDTO';

export class CadastrarProduto {
  constructor(
    private readonly produtos: ProdutoQuimicoRepository,
    private readonly logger: Logger,
  ) {}

  async executar(dados: DadosDoProdutoDTO): Promise<Result<ProdutoDTO, ErroDeCasoDeUso>> {
    const resultado = ProdutoQuimico.criar(dados);
    if (!resultado.ok) return resultado;

    const produto = resultado.value;
    await this.produtos.salvar(produto);

    this.logger.info('produto.criado', {
      produtoId: produto.id,
      nome: produto.nome,
      classeDeRisco: produto.classeDeRisco,
    });
    return ok(paraProdutoDTO(produto));
  }
}
