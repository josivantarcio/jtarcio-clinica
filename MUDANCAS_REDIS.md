# Correções Redis - EO Clínica System ## Problema Identificado
- Redis local rodando na porta 6379 causava conflito com Docker
- Container `eo-clinica2_redis_1` falhava ao inicializar
- Erro: `bind: address already in use` ## Solução Implementada ### 1. Mudança de Porta Redis Docker
- **Antes**: Redis Docker na porta 6379 (conflito)
- **Depois**: Redis Docker na porta 6380 (sem conflito)
- **Configuração**: docker-compose.yml alterado para `"6380:6379"` ### 2. Atualizações de Configuração
- **.env**: `REDIS_URL=redis://localhost:6380`
- **.env.example**: `REDIS_URL=redis://localhost:6380` - **PORTS.md**: Documentação atualizada para porta 6380 ### 3. Otimizações Docker
- **Frontend .dockerignore**: Criado para reduzir tamanho do build
- **Backend .dockerignore**: Atualizado para excluir pastas desnecessárias
- **Build otimizado**: Redução significativa no tempo de build ### 4. Scripts de Automação
- **scripts/disable-local-redis.sh**: Desabilita Redis local permanentemente
- **scripts/fix-redis-port.sh**: Script existente atualizado
- **Documentação**: TROUBLESHOOTING.md com solução permanente ## Status Docker Atual ```bash
docker-compose ps
``` | Service | Port | Status | URL |
|---------|------|--------|-----|
| **app** | 3000 | Running | http://localhost:3000 |
| **postgres** | 5432 | Running | localhost:5432 |
| **redis** | 6380 | Running | localhost:6380 |
| **chromadb** | 8000 | Running | http://localhost:8000 |
| **n8n** | 5678 | Running | http://localhost:5678 |
| **pgadmin** | 5050 | Running | http://localhost:5050 | ## Testes Realizados **Redis Docker**: `docker-compose exec -T redis redis-cli ping` → PONG **API Health**: `curl http://localhost:3000/health` → status: ok **Porta 6380**: `nc localhost 6380` → Conexão estabelecida **Sem Conflitos**: Todos os containers inicializaram com sucesso ## Documentação Atualizada - **README.md**: Instruções de setup atualizadas
- **PORTS.md**: Tabela de portas corrigida - **TROUBLESHOOTING.md**: Solução permanente documentada
- **docker-compose.yml**: Configuração de porta corrigida ## Comandos para Usar ```bash
# Inicializar todos os serviços
docker-compose up -d # Verificar status
docker-compose ps # Logs do Redis
docker-compose logs redis # Testar conexão Redis
docker-compose exec -T redis redis-cli ping # Desabilitar Redis local (opcional)
./scripts/disable-local-redis.sh
``` ## Resultado Final - **Redis Docker**: Funcionando na porta 6380
- **Sem Conflitos**: Redis local pode continuar na 6379
- **Sistema Completo**: Todos os serviços funcionando
- **Documentação**: Atualizada e corrigida
- **Arquivo erro.log**: Removido conforme solicitado --- **Status**: **CORRIGIDO E FUNCIONANDO** **Data**: 2025-08-11 **Arquivo erro.log**: **REMOVIDO**