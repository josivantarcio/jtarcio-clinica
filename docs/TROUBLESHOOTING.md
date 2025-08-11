# 🔧 Guia de Solução de Problemas - EO Clínica

## 🚨 Problemas Comuns e Soluções

### 1. Erro de Login: "Request failed with status code 404"

**Sintomas:**
- Login falha com erro 404 no frontend  
- Console mostra erro: `AxiosError: Request failed with status code 404`
- Endpoint `/api/v1/auth/profile` não encontrado

**Causa:**
- Endpoint de perfil incorreto (`/profile` vs `/me`)
- Banco de dados sem usuários (sem seeds executados)

**Solução:**
```bash
# 1. Executar seeds do banco de dados
npm run db:seed

# 2. Usar credenciais corretas
# Email: admin@eoclinica.com.br
# Senha: Admin123!
```

**Status:** ✅ **Corrigido na versão 1.0.3**

### 2. Erro: "Port already in use" / "Porta já está em uso"

**Sintomas:**
- Container falha ao iniciar
- Erro: `bind: address already in use`
- Serviços não conseguem se conectar
- Especificamente comum com Redis (porta 6379)

**Soluções:**

#### Solução Rápida:
```bash
# Use o script automático que limpa as portas
./scripts/start-complete.sh
```

#### Solução Manual:
```bash
# 1. Verificar o que está usando as portas
sudo ss -tulpn | grep :3000   # Backend
sudo ss -tulpn | grep :3001   # Frontend  
sudo ss -tulpn | grep :6379   # Redis
sudo ss -tulpn | grep :5432   # PostgreSQL

# 2. Parar processo Redis local (se existir)
sudo systemctl stop redis-server
sudo service redis stop

# 3. Matar processos específicos por porta
sudo lsof -ti:6379 | xargs sudo kill -9
sudo lsof -ti:3000 | xargs sudo kill -9
sudo lsof -ti:3001 | xargs sudo kill -9

# 4. Parar todos os containers Docker
docker-compose down --volumes --remove-orphans

# 5. Limpar sistema Docker (opcional)
docker system prune -f
docker network prune -f

# 6. Desabilitar Redis local permanentemente (RECOMENDADO)
./scripts/disable-local-redis.sh

# 7. Reiniciar serviços
docker-compose up -d
```

**✅ SOLUÇÃO PERMANENTE APLICADA:**
- Redis Docker agora usa porta 6380 externamente
- Redis local pode continuar rodando na 6379 sem conflitos  
- Configurações atualizadas em .env e .env.example

### 2. Erro: "Network needs to be recreated"

**Sintomas:**
- `Network "eo-clinica2_clinic-network" needs to be recreated`
- Erro IPv4/IPv6 changes

**Solução:**
```bash
# 1. Parar todos os containers
docker-compose down --volumes --remove-orphans

# 2. Remover redes órfãs
docker network prune -f

# 3. Limpar cache do Docker
docker system prune -f

# 4. Reiniciar
docker-compose up -d
```

### 3. Frontend redirecionando automaticamente para /dashboard

**Sintomas:**
- Ao acessar http://localhost:3001, vai direto para /dashboard
- Estado de autenticação persistido incorretamente

**Solução:**
```bash
# No navegador, abra o Console (F12) e execute:
localStorage.clear()
window.location.reload()

# Ou clique no botão "🗑️ Limpar Cache" na página inicial
```

### 4. Banco de dados não conecta

**Sintomas:**
- Erro de conexão com PostgreSQL
- Migrations falham
- App não consegue acessar o banco

**Solução:**
```bash
# 1. Verificar se o PostgreSQL está rodando
docker-compose ps postgres

# 2. Verificar logs do PostgreSQL
docker-compose logs postgres

# 3. Aguardar o banco ficar pronto
until docker-compose exec postgres pg_isready -U clinic_user -d eo_clinica_db; do
    echo "Aguardando PostgreSQL..."
    sleep 2
done

# 4. Executar migrations manualmente
docker-compose exec app npm run db:migrate
docker-compose exec app npm run db:seed
```

### 5. Dependências não instaladas ou desatualizadas

**Sintomas:**
- Módulos não encontrados
- Versões incompatíveis
- Build falha

**Solução:**
```bash
# Backend
npm install
npm run db:generate

# Frontend
cd frontend
npm install

# Limpar cache do npm se necessário
npm cache clean --force
```

### 6. Husky hooks não funcionam

**Sintomas:**
- `fatal: not a git repository`
- Hooks não executam

**Solução:**
```bash
# Inicializar git se necessário
git init

# Reinstalar Husky
npm install
npx husky install

# Tornar hooks executáveis
chmod +x .husky/pre-commit
```

### 7. Containers falham ao construir

**Sintomas:**
- Build fails durante docker-compose up
- Imagens não encontradas

**Solução:**
```bash
# 1. Forçar rebuild das imagens
docker-compose build --no-cache

# 2. Se ainda falhar, construir uma por vez
docker-compose build app
docker-compose build frontend

# 3. Verificar Dockerfiles
# Verificar se os arquivos de dependências existem
ls package.json frontend/package.json
```

### 8. Redis/ChromaDB/N8N não iniciam

**Sintomas:**
- `Cannot start service redis: ports are not available`
- Serviços auxiliares falham ao iniciar
- Erro de bind de portas 6379, 8000, 5678

**Solução:**
```bash
# 1. Verificar se há serviços locais rodando
sudo systemctl status redis-server
sudo systemctl status redis

# 2. Parar serviços locais conflitantes
sudo systemctl stop redis-server
sudo systemctl disable redis-server  # Opcional: impedir inicialização automática

# 3. Verificar portas ocupadas
sudo netstat -tlnp | grep -E ':6379|:8000|:5678'

# 4. Limpar containers órfãos específicos
docker container prune -f

# 5. Usar script completo de inicialização
./scripts/start-complete.sh
```

## 🛠️ Comandos Úteis para Debug

### Verificar Status Geral:
```bash
# Status dos containers
docker-compose ps

# Logs de todos os serviços
docker-compose logs

# Logs específicos
docker-compose logs app
docker-compose logs frontend

# Uso de recursos
docker stats
```

### Verificar Conectividade:
```bash
# Testar API
curl http://localhost:3000/health

# Testar Frontend
curl http://localhost:3001

# Testar banco dentro do container
docker-compose exec postgres psql -U clinic_user -d eo_clinica_db -c "SELECT version();"
```

### Limpeza Completa (Reset):
```bash
# ⚠️ ATENÇÃO: Isso remove TODOS os dados
docker-compose down --volumes --remove-orphans
docker system prune -a -f
docker volume prune -f
docker network prune -f

# Reiniciar do zero
docker-compose up -d
```

## 📞 Suporte

Se os problemas persistirem:

1. **Verificar logs detalhados:**
   ```bash
   docker-compose logs --details --timestamps
   ```

2. **Verificar recursos do sistema:**
   ```bash
   df -h  # Espaço em disco
   free -h  # Memória RAM
   ```

3. **Versões do ambiente:**
   ```bash
   docker --version
   docker-compose --version
   node --version
   npm --version
   ```

4. **Criar uma issue** com:
   - Output dos comandos acima
   - Logs dos containers
   - Sistema operacional
   - Passos para reproduzir o problema

---

**© 2025 Jtarcio Desenvolvimento**
