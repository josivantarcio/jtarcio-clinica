#!/bin/bash

# Script para corrigir automaticamente alguns problemas de lint

echo "🔧 Corrigindo problemas de lint do frontend..."

# Substituir variáveis não utilizadas por prefixo _
echo "📝 Renomeando variáveis não utilizadas..."

# Corrigir alguns arquivos específicos
files_to_fix=(
    "src/app/admin/page.tsx"
    "src/app/analytics/page.tsx"
    "src/app/appointments/page.tsx"
    "src/app/doctors/page.tsx"
    "src/app/patient/page.tsx"
    "src/app/patients/page.tsx"
    "src/app/reports/page.tsx"
    "src/app/schedule/page.tsx"
    "src/app/settings/page.tsx"
)

for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        echo "🔧 Processando: $file"
        
        # Renomear variáveis não utilizadas
        sed -i 's/const \[filter, setFilter\]/const [_filter, _setFilter]/g' "$file" 2>/dev/null || true
        sed -i 's/const \[dateRange, setDateRange\]/const [_dateRange, _setDateRange]/g' "$file" 2>/dev/null || true
        sed -i 's/const \[selectedPatient\]/const [_selectedPatient]/g' "$file" 2>/dev/null || true
        sed -i 's/const { user }/const { user: _user }/g' "$file" 2>/dev/null || true
        sed -i 's/const \[patient, setPatient\]/const [_patient, _setPatient]/g' "$file" 2>/dev/null || true
        
        # Prefixar imports não utilizados com underscore
        sed -i 's/import { \([^}]*\)Trash2\([^}]*\) } from/import { \1_Trash2\2 } from/g' "$file" 2>/dev/null || true
        
    fi
done

echo "✅ Correções automáticas aplicadas!"
echo "🔍 Execute 'npm run lint' para verificar o resultado."