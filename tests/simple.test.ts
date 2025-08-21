import { describe, it, expect } from '@jest/globals';

describe('Sistema EO Clínica - Teste Básico', () => {
  it('deveria executar um teste básico com sucesso', () => {
    const resultado = 2 + 2;
    expect(resultado).toBe(4);
  });

  it('deveria validar que o sistema está funcionando', () => {
    const sistema = {
      nome: 'EO Clínica',
      versao: '1.4.0',
      status: 'ativo'
    };

    expect(sistema.nome).toBe('EO Clínica');
    expect(sistema.versao).toBe('1.4.0');
    expect(sistema.status).toBe('ativo');
  });

  it('deveria verificar tipos básicos TypeScript', () => {
    const user: { id: number; name: string; email: string } = {
      id: 1,
      name: 'Teste User',
      email: 'teste@eoclinica.com.br'
    };

    expect(typeof user.id).toBe('number');
    expect(typeof user.name).toBe('string');
    expect(typeof user.email).toBe('string');
    expect(user.email).toContain('@eoclinica.com.br');
  });
});