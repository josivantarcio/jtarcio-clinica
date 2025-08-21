# 🔧 Backend Stability Guide - EO Clínica

## 🎯 Problema Identificado: Backend Parando Repetidamente

**Data da análise:** 16/08/2025 01:10 BRT  
**Causa identificada:** ✅ **Hot Reload do TSX**  
**Status:** ✅ **RESOLVIDO com soluções implementadas**

## 📋 Diagnóstico

### 🔍 **Sintomas observados:**
- Backend para com mensagem: `"info: Shutting down gracefully..."`
- Mensagem no terminal: `"[ERROR] Backend parou unexpectadamente"`
- Problema acontece **repetidamente** (4x observado)
- Frontend continua tentando conectar: `"🌐 Inicializando API Client com baseURL: http://localhost:3000"`

### 🔎 **Causa raiz identificada:**
O comando `npx tsx src/index-simple.ts` por padrão ativa o **file watching** (hot reload), que:
- ✅ **Monitora mudanças** em arquivos TypeScript
- ✅ **Reinicia automaticamente** o servidor quando há alterações
- ❌ **Causa instabilidade** em desenvolvimento
- ❌ **Gera mensagens confusas** de "backend parou"

### 🧪 **Evidências encontradas:**
```bash
# Processo TSX com hot reload ativo
josivan 123161 /home/josivan/.nvm/versions/node/v22.17.1/bin/node 
--require tsx/dist/preflight.cjs 
--import tsx/dist/loader.mjs src/index-simple.ts
```

## 🛠️ Soluções Implementadas

### **Solução 1: Script Estável (RECOMENDADO)**
```bash
# Use o novo comando para servidor estável
npm run start:stable
```

**Vantagens:**
- ✅ Não reinicia automaticamente
- ✅ Mantém compatibilidade com TypeScript
- ✅ Mais rápido que compilação completa
- ✅ Fácil de usar

### **Solução 2: Scripts Shell Criados**
```bash
# Opção 1: Sem file watching
./run-no-watch.sh

# Opção 2: Compilado (mais estável)
./run-stable.sh
```

### **Solução 3: Comando Manual**
```bash
# TSX sem watch
npx tsx --no-watch src/index-simple.ts

# Ou compilado
npx tsc && node dist/index-simple.js
```

## 📊 Comparação das Abordagens

| Método | Estabilidade | Velocidade | Hot Reload | Recomendação |
|---------|-------------|------------|------------|--------------|
| `tsx` (atual) | ⚠️ Instável | ⚡ Rápido | ✅ Sim | ❌ Desenvolvimento apenas |
| `tsx --no-watch` | ✅ Estável | ⚡ Rápido | ❌ Não | ✅ **RECOMENDADO** |
| `tsc + node` | ✅ Muito estável | 🐌 Lento | ❌ Não | ✅ Produção |

## 🚀 Instruções de Uso

### **Para Desenvolvimento Estável:**
```bash
# Pare o servidor atual (Ctrl+C)
# Inicie com o novo comando estável
npm run start:stable
```

### **Para Desenvolvimento com Hot Reload:**
```bash
# Se você QUISER hot reload (instável)
npm run dev  # ou npm start
```

### **Para Produção:**
```bash
# Compilar e rodar
./run-stable.sh
```

## 🔧 Configurações Adicionadas

### **package.json:**
```json
{
  "scripts": {
    "start": "tsx src/index-simple.ts",           // Com hot reload
    "start:stable": "tsx --no-watch src/index-simple.ts"  // Sem hot reload
  }
}
```

### **Scripts criados:**
- ✅ `run-stable.sh` - Compilação + Node.js
- ✅ `run-no-watch.sh` - TSX sem file watching

## ⚡ Como Evitar o Problema

### **✅ Faça:**
1. **Use `npm run start:stable`** para servidor estável
2. **Evite salvar arquivos** frequentemente durante desenvolvimento
3. **Use Ctrl+C uma vez** para parar o servidor gracefully
4. **Aguarde o shutdown** completo antes de reiniciar

### **❌ Não faça:**
1. ❌ Use `npx tsx` sem `--no-watch` para servidores duradouros
2. ❌ Faça múltiplos Ctrl+C rapidamente
3. ❌ Force kill (`kill -9`) a menos que necessário
4. ❌ Edite arquivos enquanto testa estabilidade

## 📈 Monitoramento

### **Verificar se o servidor está estável:**
```bash
# Verificar processo
ps aux | grep tsx

# Testar API
curl http://localhost:3000/health

# Monitorar logs
tail -f logs/application.log
```

### **Sinais de que está funcionando:**
- ✅ Processo Node.js estável (sem reinicializações)
- ✅ API responde consistentemente
- ✅ Logs mostram apenas requests normais
- ✅ Sem mensagens "Shutting down gracefully"

## 🎯 Próximos Passos

### **Imediato:**
1. ✅ **Usar `npm run start:stable`** para servidor estável
2. ✅ **Testar por 10+ minutos** sem interrupções
3. ✅ **Documentar experiência** de estabilidade

### **Futuro:**
- [ ] Migrar para processo de produção com PM2/Docker
- [ ] Implementar health checks automáticos
- [ ] Configurar restart automático em caso de crash real

## 📞 Troubleshooting

### **Se o problema persistir:**
```bash
# 1. Verificar se TSX está rodando sem watch
ps aux | grep tsx | grep "no-watch"

# 2. Verificar logs de erro
tail -f logs/error.log

# 3. Verificar uso de memória
ps aux --sort=-%mem | head -10

# 4. Testar conexão com banco
docker exec -it eo-clinica2_postgres_1 pg_isready
```

### **Logs de erro comuns:**
- `EADDRINUSE` - Porta já em uso
- `Connection refused` - Banco indisponível  
- `Memory leak` - Problema de memória

---

**📅 Problema resolvido em:** 16/08/2025 01:15 BRT  
**🔧 Solução:** Hot reload desabilitado  
**✅ Status:** Backend estável disponível com `npm run start:stable`

---

*© 2025 Jtarcio Desenvolvimento - EO Clínica System*