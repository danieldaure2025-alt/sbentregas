# Script para Atualizar Senha do Supabase no .env
# Execute este script no PowerShell

Write-Host "=== Configuração do Supabase ===" -ForegroundColor Cyan
Write-Host ""

# Caminho do arquivo .env
$envFile = "c:\Users\dauer\Downloads\delivery_app_original\nextjs_space\.env"

Write-Host "Por favor, siga os passos abaixo:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Abra o navegador e vá para:" -ForegroundColor White
Write-Host "   https://supabase.com/dashboard/project/xterzyvxukjfzylbgvon/settings/database" -ForegroundColor Green
Write-Host ""
Write-Host "2. Procure por 'Connection string' ou 'Database Password'" -ForegroundColor White
Write-Host ""
Write-Host "3. Você verá algo como:" -ForegroundColor White
Write-Host "   postgres://postgres.xterzyvxukjfzylbgvon:SENHA_AQUI@aws-0..." -ForegroundColor Gray
Write-Host ""
Write-Host "4. Copie APENAS a senha (a parte entre ':' e '@')" -ForegroundColor White
Write-Host ""

# Solicitar a senha
$password = Read-Host "Cole a senha aqui e pressione Enter"

if ([string]::IsNullOrWhiteSpace($password)) {
    Write-Host "Erro: Senha não pode estar vazia!" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Atualizando arquivo .env..." -ForegroundColor Cyan

# Ler o conteúdo do arquivo
$content = Get-Content $envFile -Raw

# Substituir [YOUR-PASSWORD] pela senha real
$content = $content -replace '\[YOUR-PASSWORD\]', $password

# Salvar o arquivo
Set-Content -Path $envFile -Value $content -NoNewline

Write-Host "✓ Arquivo .env atualizado com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Volte para o chat e diga 'pronto' ou 'continuar'" -ForegroundColor White
Write-Host "2. Vou executar as migrations do Prisma" -ForegroundColor White
Write-Host ""
