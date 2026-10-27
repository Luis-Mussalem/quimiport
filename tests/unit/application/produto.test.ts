import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AtualizarProduto } from '../../../src/application/produto/AtualizarProduto';
import { CadastrarProduto } from '../../../src/application/produto/CadastrarProduto';
import { BuscarProduto, ListarProdutos } from '../../../src/application/produto/ConsultarProdutos';
import { InativarProduto } from '../../../src/application/produto/InativarProduto';
import { NaoEncontradoError } from '../../../src/application/shared/ApplicationError';
import { ValidacaoError } from '../../../src/domain/shared/DomainError';
import { ProdutoQuimicoRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/ProdutoQuimicoRepositoryEmMemoria';

const acetona = { nome: 'Acetona', numeroOnu: 'UN1090', classeDeRisco: '3' };

describe('Casos de uso de produto', () => {
  let repositorio: ProdutoQuimicoRepositoryEmMemoria;
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };

  beforeEach(() => {
    repositorio = new ProdutoQuimicoRepositoryEmMemoria();
    vi.clearAllMocks();
  });

  it('cadastra o produto, persiste e registra log', async () => {
    const resultado = await new CadastrarProduto(repositorio, logger).executar(acetona);

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.status).toBe('ATIVO');
    expect(await repositorio.buscarPorId(resultado.value.id)).not.toBeNull();
    expect(logger.info).toHaveBeenCalledWith('produto.criado', expect.objectContaining({ nome: 'Acetona' }));
  });

  it('não persiste produto sem nome', async () => {
    const resultado = await new CadastrarProduto(repositorio, logger).executar({ ...acetona, nome: '' });

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBeInstanceOf(ValidacaoError);
    expect(await repositorio.listar()).toHaveLength(0);
  });

  it('não persiste produto sem classe de risco', async () => {
    const resultado = await new CadastrarProduto(repositorio, logger).executar({ ...acetona, classeDeRisco: '' });

    expect(resultado.ok).toBe(false);
    expect(await repositorio.listar()).toHaveLength(0);
  });

  it('atualiza um produto existente', async () => {
    const criado = await new CadastrarProduto(repositorio, logger).executar(acetona);
    if (!criado.ok) throw criado.error;

    const resultado = await new AtualizarProduto(repositorio, logger).executar(criado.value.id, {
      ...acetona,
      descricao: 'Solvente',
    });

    expect(resultado.ok).toBe(true);
    if (!resultado.ok) return;
    expect(resultado.value.descricao).toBe('Solvente');
  });

  it('retorna não encontrado ao atualizar produto inexistente', async () => {
    const resultado = await new AtualizarProduto(repositorio, logger).executar('nao-existe', acetona);

    expect(resultado.ok).toBe(false);
    if (resultado.ok) return;
    expect(resultado.error).toBeInstanceOf(NaoEncontradoError);
  });

  it('inativa o produto e filtra a listagem por status', async () => {
    const criado = await new CadastrarProduto(repositorio, logger).executar(acetona);
    await new CadastrarProduto(repositorio, logger).executar({ nome: 'Metanol', classeDeRisco: '3' });
    if (!criado.ok) throw criado.error;

    const resultado = await new InativarProduto(repositorio, logger).executar(criado.value.id);

    expect(resultado.ok).toBe(true);
    const listar = new ListarProdutos(repositorio);
    expect(await listar.executar({ status: 'INATIVO' })).toHaveLength(1);
    expect(await listar.executar({ status: 'ATIVO' })).toHaveLength(1);
    expect(await listar.executar()).toHaveLength(2);
  });

  it('busca produto por id', async () => {
    const criado = await new CadastrarProduto(repositorio, logger).executar(acetona);
    if (!criado.ok) throw criado.error;

    const buscar = new BuscarProduto(repositorio);

    expect((await buscar.executar(criado.value.id)).ok).toBe(true);
    expect((await buscar.executar('nao-existe')).ok).toBe(false);
  });
});
