import { beforeEach, describe, expect, it } from 'vitest';
import { ConflitoError } from '../../../src/application/shared/ApplicationError';
import { CargaQuimicaRepositoryEmMemoria } from '../../../src/infrastructure/persistence/in-memory/CargaQuimicaRepositoryEmMemoria';
import { umaCargaEm } from '../../support/builders';

describe('CargaQuimicaRepositoryEmMemoria', () => {
  let repositorio: CargaQuimicaRepositoryEmMemoria;

  beforeEach(() => {
    repositorio = new CargaQuimicaRepositoryEmMemoria();
  });

  it('incrementa a versão a cada gravação', async () => {
    const carga = umaCargaEm('REGISTRADA', 'produto-1');

    await repositorio.salvar(carga);
    const lida = await repositorio.buscarPorId(carga.id);

    expect(carga.versao).toBe(0);
    expect(lida?.versao).toBe(1);
  });

  it('rejeita gravação de uma versão desatualizada (alteração simultânea)', async () => {
    const carga = umaCargaEm('REGISTRADA', 'produto-1');
    await repositorio.salvar(carga);

    // Duas operações leem a mesma carga ao mesmo tempo.
    const primeira = await repositorio.buscarPorId(carga.id);
    const segunda = await repositorio.buscarPorId(carga.id);
    primeira?.alterarStatus('EM_ANALISE');
    segunda?.cancelar('Desistência do importador');

    await repositorio.salvar(primeira!);

    await expect(repositorio.salvar(segunda!)).rejects.toBeInstanceOf(ConflitoError);
    expect((await repositorio.buscarPorId(carga.id))?.status).toBe('EM_ANALISE');
  });
});

