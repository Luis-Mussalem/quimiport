import { CargaQuimicaRepository } from '../domain/carga/CargaQuimicaRepository';
import { ProdutoQuimicoRepository } from '../domain/produto/ProdutoQuimicoRepository';
import { AlterarStatusDaCarga } from './carga/AlterarStatusDaCarga';
import { BuscarCarga, ListarCargas } from './carga/ConsultarCargas';
import { RegistrarCarga } from './carga/RegistrarCarga';
import { RegistrarDocumentoDaCarga } from './carga/RegistrarDocumentoDaCarga';
import { AtualizarProduto } from './produto/AtualizarProduto';
import { CadastrarProduto } from './produto/CadastrarProduto';
import { BuscarProduto, ListarProdutos } from './produto/ConsultarProdutos';
import { InativarProduto } from './produto/InativarProduto';
import { Logger } from './shared/Logger';

export interface CasosDeUso {
  cadastrarProduto: CadastrarProduto;
  listarProdutos: ListarProdutos;
  buscarProduto: BuscarProduto;
  atualizarProduto: AtualizarProduto;
  inativarProduto: InativarProduto;
  registrarCarga: RegistrarCarga;
  listarCargas: ListarCargas;
  buscarCarga: BuscarCarga;
  alterarStatusDaCarga: AlterarStatusDaCarga;
  registrarDocumentoDaCarga: RegistrarDocumentoDaCarga;
}

export interface Repositorios {
  produtos: ProdutoQuimicoRepository;
  cargas: CargaQuimicaRepository;
}

// Monta todos os casos de uso a partir de quaisquer repositórios que
// cumpram os contratos: Prisma na aplicação, memória nos testes.
export function criarCasosDeUso({ produtos, cargas }: Repositorios, logger: Logger): CasosDeUso {
  return {
    cadastrarProduto: new CadastrarProduto(produtos, logger),
    listarProdutos: new ListarProdutos(produtos),
    buscarProduto: new BuscarProduto(produtos),
    atualizarProduto: new AtualizarProduto(produtos, logger),
    inativarProduto: new InativarProduto(produtos, logger),
    registrarCarga: new RegistrarCarga(cargas, produtos, logger),
    listarCargas: new ListarCargas(cargas),
    buscarCarga: new BuscarCarga(cargas),
    alterarStatusDaCarga: new AlterarStatusDaCarga(cargas, logger),
    registrarDocumentoDaCarga: new RegistrarDocumentoDaCarga(cargas, logger),
  };
}