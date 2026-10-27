import { describe, expect, it } from 'vitest';
import { ProdutoQuimico } from '../../../src/domain/produto/ProdutoQuimico';
import { ValidacaoError } from '../../../src/domain/shared/DomainError';

const dadosValidos = {
  nome: 'Ácido Sulfúrico',
  descricao: 'Ácido forte, corrosivo',
  numeroOnu: '1830',
  classeDeRisco: '8',
  grupoDeCompatibilidade: null,
};

describe('ProdutoQuimico', () => {
  describe('cadastro', () => {
    it('cria um produto ativo com dados válidos', () => {
      const resultado = ProdutoQuimico.criar(dadosValidos);

      expect(resultado.ok).toBe(true);
      if (!resultado.ok) return;
      const produto = resultado.value.toProps();
      expect(produto.id).toBeTruthy();
      expect(produto.nome).toBe('Ácido Sulfúrico');
      expect(produto.status).toBe('ATIVO');
      expect(produto.numeroOnu).toBe('UN1830');
      expect(produto.criadoEm).toEqual(produto.atualizadoEm);
    });

    it('rejeita produto sem nome', () => {
      const resultado = ProdutoQuimico.criar({ ...dadosValidos, nome: '   ' });

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
      expect(resultado.error.message).toMatch(/nome/);
    });

    it('rejeita produto sem classe de risco', () => {
      const resultado = ProdutoQuimico.criar({ ...dadosValidos, classeDeRisco: '' });

      expect(resultado.ok).toBe(false);
      if (resultado.ok) return;
      expect(resultado.error).toBeInstanceOf(ValidacaoError);
      expect(resultado.error.message).toMatch(/classe de risco/);
    });

    it('rejeita classe de risco que não existe na classificação ONU', () => {
      const resultado = ProdutoQuimico.criar({ ...dadosValidos, classeDeRisco: '10' });

      expect(resultado.ok).toBe(false);
    });

    it('rejeita número ONU em formato inválido', () => {
      const resultado = ProdutoQuimico.criar({ ...dadosValidos, numeroOnu: 'ABC' });

      expect(resultado.ok).toBe(false);
    });
  });

  describe('atualização e inativação', () => {
    const criarProduto = () => {
      const resultado = ProdutoQuimico.criar(dadosValidos, new Date('2026-01-01'));
      if (!resultado.ok) throw resultado.error;
      return resultado.value;
    };

    it('atualiza os dados e a data de atualização', () => {
      const produto = criarProduto();
      const agora = new Date('2026-02-01');

      const resultado = produto.atualizar({ ...dadosValidos, nome: 'Ácido Sulfúrico 98%' }, agora);

      expect(resultado.ok).toBe(true);
      expect(produto.nome).toBe('Ácido Sulfúrico 98%');
      expect(produto.toProps().atualizadoEm).toEqual(agora);
    });

    it('não aplica a atualização quando os dados são inválidos', () => {
      const produto = criarProduto();

      const resultado = produto.atualizar({ ...dadosValidos, nome: '' });

      expect(resultado.ok).toBe(false);
      expect(produto.nome).toBe('Ácido Sulfúrico');
    });

    it('inativa o produto sem apagá-lo', () => {
      const produto = criarProduto();

      produto.inativar();

      expect(produto.status).toBe('INATIVO');
      expect(produto.estaAtivo).toBe(false);
    });
  });
});
