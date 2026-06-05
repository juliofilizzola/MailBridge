param (
    [string]$Target = "help"
)

# Variáveis
$DC = "docker-compose"
$YARN = "yarn"

switch ($Target) {
    "help" {
        Write-Host "Comandos disponíveis no MailBridge (Windows):" -ForegroundColor Cyan
        Write-Host "  .\make.ps1 up          - Sobe a infraestrutura (LocalStack + Worker)"
        Write-Host "  .\make.ps1 down        - Derruba a infraestrutura e limpa volumes"
        Write-Host "  .\make.ps1 restart     - Reinicia a infraestrutura do zero"
        Write-Host "  .\make.ps1 logs        - Acompanha os logs dos containers"
        Write-Host "  .\make.ps1 install     - Instala as dependências (frozen-lockfile)"
        Write-Host "  .\make.ps1 dev         - Roda a aplicação localmente"
        Write-Host "  .\make.ps1 build       - Compila o código TypeScript"
        Write-Host "  .\make.ps1 test-publish- Publica uma mensagem na fila via script"
        Write-Host "  .\make.ps1 lint        - Verifica erros com ESLint"
        Write-Host "  .\make.ps1 lint-fix    - Corrige formatação e imports"
        Write-Host "  .\make.ps1 format      - Força formatação com Prettier"
        Write-Host "  .\make.ps1 audit       - Verifica vulnerabilidades"
        Write-Host "  .\make.ps1 clean       - Remove as pastas dist/ e node_modules/"
    }
    "up" { Invoke-Expression "$DC up -d --build" }
    "down" { Invoke-Expression "$DC down -v --remove-orphans" }
    "restart" {
        Invoke-Expression "$DC down -v --remove-orphans"
        Invoke-Expression "$DC up -d --build"
    }
    "logs" { Invoke-Expression "$DC logs -f" }
    "install" { Invoke-Expression "$YARN install --frozen-lockfile" }
    "dev" { Invoke-Expression "$YARN dev" }
    "build" { Invoke-Expression "$YARN build" }
    "test-publish" { Invoke-Expression "$YARN publish:test" }
    "lint" { Invoke-Expression "$YARN lint" }
    "lint-fix" { Invoke-Expression "$YARN lint:fix" }
    "format" { Invoke-Expression "$YARN format" }
    "audit" { Invoke-Expression "$YARN security:check" }
    "clean" {
        Write-Host "Limpando diretórios..." -ForegroundColor Yellow
        if (Test-Path "dist") { Remove-Item -Recurse -Force "dist" }
        if (Test-Path "node_modules") { Remove-Item -Recurse -Force "node_modules" }
        Write-Host "Limpeza concluída!" -ForegroundColor Green
    }
    default {
        Write-Host "Comando '$Target' não encontrado." -ForegroundColor Red
        Invoke-Expression ".\make.ps1 help"
    }
}
