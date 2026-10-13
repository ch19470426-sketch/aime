import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Testes automáticos do AIMÊ (npm test). Rodam as ROTAS REAIS de src/app/api, com o banco, o armazenamento, o Asaas e o
// e-mail simulados (tests/helpers.ts) e uma sessão de teste (tests/setup.ts). Não tocam em nenhum serviço de verdade.
export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    testTimeout: 20000,
  },
})
