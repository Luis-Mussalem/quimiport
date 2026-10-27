import { beforeEach, describe, expect, it } from 'vitest';
import { AtualizarProduto } from '../../../src/application/produto/AtualizarProduto';
import { CadastrarProduto } from '../../../src/application/produto/CadastrarProduto';
import { BuscarProduto, ListarProdutos } from '../../../src/application/produto/ConsultarProdutos';
import { InativarProduto } from '../../../src/application/produto/InativarProduto';
import { NaoEncontradoError } from '../../../src/application/shared/ApplicationError';
import { ValidacaoError } from '../../../src/domain/shared/DomainError';
import { ProdutoQuimicoRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/ProdutoQuimicoRepositoryEmMemoria';
import { dadosDeProduto, loggerFalso, umProdutoAtivo, umProdutoInativo } from '../../support/builders';

describe('Casos de uso de produto', () => {
  let repositorio: ProdutoQuimicoRepositoryEmMemoria;
  let logger: ReturnType<typeof loggerFalso>;

  beforeEach(() => {
    repositorio = new ProdutoQuimicoRepositoryEmMemoria();
    logger = loggerFalso();
  });

  it('cadastra o produto, persiste e registra log', async () => {
    const resultado = await new CadastrarProduto(repositorio, logger).executar(
      dadosDeProduto({ nome: 'Acetona', classeDeRisco: '3' }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.status).toBe('ATIVO');
    expect(await repositorio.buscarPorId(resultado.value.id)).not.toBeNull();
    expect(logger.info).toHaveBeenCalledWith('produto.criado', expect.objectContaining({ nome: 'Acetona' }));
  });

  it('não persiste produto sem nome', async () => {
    const resultado = await new CadastrarProduto(repositorio, logger).executar(dadosDeProduto({ nome: '' }));

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBeInstanceOf(ValidacaoError);
    expect(await repositorio.listar()).toHaveLength(0);
  });

  it('não persiste produto sem classe de risco', async () => {
    const resultado = await new CadastrarProduto(repositorio, logger).executar(
      dadosDeProduto({ classeDeRisco: '' }),
    );

    expect(resultado.ok).toBe(false);
    expect(await repositorio.listar()).toHaveLength(0);
  });

  it('atualiza um produto existente', async () => {
    const produto = umProdutoAtivo();
    await repositorio.salvar(produto);

    const resultado = await new AtualizarProduto(repositorio, logger).executar(
      produto.id,
      dadosDeProduto({ descricao: 'Soda cáustica' }),
    );

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.descricao).toBe('Soda cáustica');
  });

  it('retorna não encontrado ao atualizar produto inexistente', async () => {
    const resultado = await new AtualizarProduto(repositorio, logger).executar('nao-existe', dadosDeProduto());

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBeInstanceOf(NaoEncontradoError);
  });

  it('inativa o produto e registra log', async () => {
    const produto = umProdutoAtivo();
    await repositorio.salvar(produto);

    const resultado = await new InativarProduto(repositorio, logger).executar(produto.id);

    expect(resultado.ok).toBe(true);
    expect((await repositorio.buscarPorId(produto.id))?.status).toBe('INATIVO');
    expect(logger.info).toHaveBeenCalledWith('produto.inativado', expect.anything());
  });

  it('filtra a listagem por status', async () => {
    await repositorio.salvar(umProdutoAtivo({ nome: 'Metanol', classeDeRisco: '3' }));
    await repositorio.salvar(umProdutoInativo());

    const listar = new ListarProdutos(repositorio);

    expect(await listar.executar({ status: 'INATIVO' })).toHaveLength(1);
    expect(await listar.executar({ status: 'ATIVO' })).toHaveLength(1);
    expect(await listar.executar()).toHaveLength(2);
  });

  it('busca produto por id', async () => {
    const produto = umProdutoAtivo();
    await repositorio.salvar(produto);

    const buscar = new BuscarProduto(repositorio);

    expect((await buscar.executar(produto.id)).ok).toBe(true);
    expect((await buscar.executar('nao-existe')).ok).toBe(false);
  });
});
