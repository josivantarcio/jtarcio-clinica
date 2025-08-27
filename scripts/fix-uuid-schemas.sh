#!/bin/bash

# 🔧 Script para corrigir schemas UUID → CUID em todas as rotas
echo "🔧 Fixing UUID → CUID schema validation in all routes..."

# Lista de arquivos a serem corrigidos
files=(
  "src/routes/specialties.ts"
  "src/routes/appointments.ts" 
  "src/routes/availability.ts"
)

# Padrão antigo (UUID)
old_pattern='{ type: '\''string'\'', format: '\''uuid'\'' }'

# Novo padrão (CUID)
new_pattern='{ type: '\''string'\'', minLength: 20, maxLength: 30, pattern: '\''^c[a-z0-9]+$'\'' } \/\/ CUID format'

# Backup dos arquivos
echo "📋 Creating backups..."
for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    cp "$file" "${file}.backup"
    echo "✅ Backup created: ${file}.backup"
  fi
done

# Aplicar correções
echo "🛠️ Applying CUID fixes..."
for file in "${files[@]}"; do
  if [[ -f "$file" ]]; then
    # Conta ocorrências antes
    before_count=$(grep -c "format: 'uuid'" "$file" || echo 0)
    
    # Aplica correção
    sed -i "s/${old_pattern//\'/\\\'}/${new_pattern//\'/\\\'}/g" "$file"
    
    # Conta ocorrências depois
    after_count=$(grep -c "format: 'uuid'" "$file" || echo 0)
    fixed_count=$((before_count - after_count))
    
    echo "📝 $file: Fixed $fixed_count UUID → CUID schemas"
  else
    echo "⚠️  File not found: $file"
  fi
done

echo "🎉 Schema fixes complete!"
echo "💡 To revert changes: restore from .backup files"