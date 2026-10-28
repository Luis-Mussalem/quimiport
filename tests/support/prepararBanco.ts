import { execSync } from 'node:child_process';

// Roda uma vez antes dos testes: aplica as migrations no schema de teste.
// Sem TEST_DATABASE_URL os testes de banco são pulados.
export default function prepararBanco(): void {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) return;

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  });
}