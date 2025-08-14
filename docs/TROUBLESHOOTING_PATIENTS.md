# EO Clínica - Guia de Troubleshooting: Sistema de Pacientes

## 🔧 Guia de Resolução de Problemas

Este documento compila soluções para problemas comuns encontrados no sistema de gestão de pacientes, baseado em casos reais resolvidos durante o desenvolvimento.

**Última Atualização**: 14 de agosto de 2025  
**Versão**: 1.1.2

---

## 🚨 Problemas Mais Comuns

### 1. 📅 **Data de Nascimento com Diferença de 1 Dia**

#### **Sintomas**
- Data inserida: 14/08/1978
- Data exibida: 13/08/1978
- Diferença constante de 1 dia

#### **Causa Raiz**
Conversão incorreta de timezone ao usar `new Date()` com strings de data.

#### **Solução**
```typescript
// ❌ INCORRETO (causa problema de timezone)
dateOfBirth: new Date(patientData.dateOfBirth).toISOString().split('T')[0]

// ✅ CORRETO (evita conversão de timezone)
dateOfBirth: patientData.dateOfBirth ? patientData.dateOfBirth.split('T')[0] : ''
```

#### **Prevenção**
- Sempre use `.split('T')[0]` para datas vindas do banco
- Evite `new Date()` desnecessário em strings ISO
- Configure timezone explicitamente se necessário

---

### 2. 🔄 **Exportação de Pacientes Não Funciona**

#### **Sintomas**
- Clique no botão "Exportar" não gera nenhum arquivo
- Nenhuma mensagem de erro visível
- Console sem informações úteis

#### **Diagnóstico**
```javascript
// Verificar no Console do Browser (F12)
console.log('Botão clicado?') // Deve aparecer ao clicar
console.log('Dados existem?', patients.length) // Verificar se há dados
console.log('Função chamada?') // Verificar se exportPatients() executa
```

#### **Soluções Possíveis**

**Problema 1: Falta de Dados**
```typescript
// Verificar se há pacientes carregados
if (!patients.length) {
  console.log('Nenhum paciente carregado para exportar')
  return
}
```

**Problema 2: Erro de Blob/Download**
```typescript
// Implementação robusta com fallbacks
const downloadCSV = (csvContent: string, fileName: string) => {
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    
    if (typeof document.createElement('a').download !== 'undefined') {
      // Navegadores modernos
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = fileName
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } else {
      // Fallback para navegadores antigos
      window.open(URL.createObjectURL(blob), '_blank')
    }
  } catch (error) {
    console.error('Erro na exportação:', error)
    alert('Erro ao exportar. Tente novamente ou use outro navegador.')
  }
}
```

**Problema 3: Bloqueio do Navegador**
- Alguns navegadores bloqueiam downloads automáticos
- **Solução**: Configurar navegador para permitir downloads do localhost

---

### 3. 🔍 **CPF Duplicado Não Detectado**

#### **Sintomas**
- CPF duplicado é aceito no cadastro
- Verificação em tempo real não funciona
- Endpoint retorna 404

#### **Diagnóstico**
```bash
# Testar endpoint diretamente
curl -X GET "http://localhost:3000/api/v1/users/check-cpf/12345678901"
```

#### **Soluções**

**Problema 1: Servidor Backend Não Atualizado**
```bash
# Reiniciar o backend
pkill -f "tsx.*index-simple"
PORT=3000 npx tsx src/index-simple.ts
```

**Problema 2: CPF com Formatação Diferente**
```typescript
// Backend deve aceitar ambos os formatos
const cleanCpf = cpf.replace(/\D/g, '')
const formattedCpf = cleanCpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')

// Buscar com OR para aceitar qualquer formato
const existingUser = await prisma.user.findFirst({
  where: { 
    OR: [
      { cpf: cpf },      // Como recebido
      { cpf: cleanCpf }, // Só números
      { cpf: formattedCpf } // Formatado
    ],
    deletedAt: null 
  }
})
```

---

### 4. 🎨 **Problemas de Interface (UI/UX)**

#### **Select de Filtros com Baixo Contraste**

**Sintomas**
- Opções do select difíceis de ler
- Cores de fundo e texto similares
- Má experiência do usuário

**Solução**
```css
/* Aplicar cores explícitas com bom contraste */
className="px-3 py-2 border rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary hover:bg-gray-50"

/* Para as opções */
<option value="all" className="text-gray-900 bg-white">Todos</option>
```

#### **Iniciais do Avatar Excessivas**

**Problema**: JTSDC ao invés de JO
**Solução**:
```typescript
// Lógica otimizada para iniciais
const names = patient.user.name.trim().split(' ').filter(n => n.length > 0)
if (names.length >= 2) {
  return (names[0][0] + names[names.length - 1][0]).toUpperCase()
}
return names[0] ? names[0][0].toUpperCase() : 'PN'
```

---

### 5. 💾 **Dados Não Persistem (Contato Emergência, Endereço)**

#### **Sintomas**
- Dados de emergência não salvam
- Endereço não aparece na edição
- Informações médicas se perdem

#### **Causa Raiz**
Backend PATCH atualizava apenas a tabela `users`, ignorando a tabela `patients`.

#### **Solução Implementada**
```typescript
// No backend - src/index-simple.ts
fastify.patch('/api/v1/users/:id', async (request, reply) => {
  // 1. Atualizar dados básicos na tabela users
  const user = await prisma.user.update({ /* ... */ })
  
  // 2. Atualizar dados específicos na tabela patients
  if (updateData.emergencyContactName !== undefined || 
      updateData.emergencyContactPhone !== undefined ||
      updateData.allergies !== undefined ||
      updateData.medications !== undefined ||
      updateData.address !== undefined) {
    
    await prisma.patient.update({
      where: { userId: id },
      data: {
        emergencyContactName: updateData.emergencyContactName,
        emergencyContactPhone: updateData.emergencyContactPhone,
        allergies: updateData.allergies ? 
          updateData.allergies.split(',').map(s => s.trim()).filter(Boolean) : 
          undefined,
        medications: updateData.medications ? 
          updateData.medications.split(',').map(s => s.trim()).filter(Boolean) : 
          undefined,
        address: updateData.address
      }
    })
  }
})
```

---

### 6. 🔒 **Validação de CPF Falha**

#### **CPF Válidos Para Teste**
```
111.444.777-35  ✅ Válido
123.456.789-09  ✅ Válido
000.000.001-91  ✅ Válido
```

#### **CPF Inválidos (Devem Ser Rejeitados)**
```
111.111.111-11  ❌ Padrão inválido
123.456.789-01  ❌ Dígito verificador incorreto
000.000.000-00  ❌ Padrão inválido
```

#### **Implementação da Validação**
```typescript
export function validateCPF(cpf: string): boolean {
  if (!cpf) return false
  
  // Remove formatação
  const cleanCpf = cpf.replace(/\D/g, '')
  
  // Verifica tamanho
  if (cleanCpf.length !== 11) return false
  
  // Verifica padrões inválidos conhecidos
  const invalidPatterns = [
    '00000000000', '11111111111', '22222222222', // etc...
  ]
  if (invalidPatterns.includes(cleanCpf)) return false

  // Validação do primeiro dígito verificador
  let sum = 0
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (11 - i)
  }
  let remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf.substring(9, 10))) return false

  // Validação do segundo dígito verificador
  sum = 0
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cleanCpf.substring(i - 1, i)) * (12 - i)
  }
  remainder = (sum * 10) % 11
  if (remainder === 10 || remainder === 11) remainder = 0
  if (remainder !== parseInt(cleanCpf.substring(10, 11))) return false

  return true
}
```

---

## 🔧 Ferramentas de Debug

### **1. Logs de Backend**
```bash
# Verificar logs do servidor
tail -f logs/combined.log

# Ou se rodando diretamente
PORT=3000 npx tsx src/index-simple.ts
```

### **2. Debug do Frontend**
```javascript
// No Console do Browser (F12)

// Verificar dados carregados
console.log('Pacientes:', window.patients)

// Testar função de exportação
window.exportPatients = exportPatients
window.exportPatients()

// Verificar estado do formulário
console.log('Form data:', formData)
```

### **3. Testes de API**
```bash
# Testar endpoints diretamente
curl -X GET "http://localhost:3000/api/v1/users" | jq
curl -X GET "http://localhost:3000/api/v1/users/check-cpf/12345678901"
```

---

## 🚀 Performance e Otimização

### **1. Debounce na Validação CPF**
```typescript
// Evitar muitas requisições durante digitação
const timeoutId = setTimeout(() => {
  checkCpfDuplicate(value)
}, 500) // 500ms de delay
```

### **2. Otimização da Exportação**
```typescript
// Processar em chunks para listas grandes
const chunkSize = 1000
for (let i = 0; i < patients.length; i += chunkSize) {
  const chunk = patients.slice(i, i + chunkSize)
  processChunk(chunk)
}
```

### **3. Cache de Validações**
```typescript
// Cache para evitar revalidações desnecessárias
const cpfCache = new Map()

function validateCPFCached(cpf: string): boolean {
  if (cpfCache.has(cpf)) {
    return cpfCache.get(cpf)
  }
  
  const isValid = validateCPF(cpf)
  cpfCache.set(cpf, isValid)
  return isValid
}
```

---

## 📱 Compatibilidade de Navegadores

### **Exportação CSV**
- ✅ Chrome 80+
- ✅ Firefox 75+
- ✅ Safari 13+ (com fallback)
- ✅ Edge 80+

### **Validação em Tempo Real**
- ✅ Todos os navegadores modernos
- ⚠️ IE11 (requer polyfill para Promise)

### **Fallbacks Implementados**
```typescript
// Para navegadores sem suporte a download
if (typeof link.download === 'undefined') {
  // Abrir em nova aba
  window.open(URL.createObjectURL(blob), '_blank')
}
```

---

## 🔍 Checklist de Troubleshooting

### **Antes de Reportar um Bug**
- [ ] Verificar console do browser (F12)
- [ ] Testar em modo incógnito
- [ ] Limpar cache do navegador
- [ ] Verificar se backend está rodando
- [ ] Testar endpoint diretamente via curl
- [ ] Verificar logs do servidor
- [ ] Confirmar versão do sistema (v1.1.2+)

### **Informações Para Debug**
```
- Navegador e versão
- Sistema operacional  
- URL da página com problema
- Passos para reproduzir
- Mensagens de erro no console
- Screenshot do problema
- Dados de entrada que causaram erro
```

---

## 📞 Escalação de Problemas

### **Nível 1: Problemas de Interface**
- Reiniciar navegador
- Limpar cache
- Testar em outro navegador

### **Nível 2: Problemas de Dados**
- Verificar backend logs
- Testar endpoints via API
- Verificar banco de dados

### **Nível 3: Problemas de Sistema**
- Reiniciar serviços
- Verificar Docker containers
- Analisar logs de sistema

---

**EO Clínica - Troubleshooting Guide**  
**Versão**: 1.1.2  
**Status**: ✅ Atualizado com soluções testadas  
**Suporte**: Todos os problemas documentados foram resolvidos  

*Última atualização: 14 de agosto de 2025*