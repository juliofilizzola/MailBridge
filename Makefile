.PHONY: help install up down restart logs dev build lint lint-fix format audit clean

# --- Variáveis ---
DC = docker-compose
YARN = yarn

# --- Comando Padrão ---
help: ## Mostra a lista de todos os comandos disponíveis
	@echo "Comandos disponíveis no MailBridge:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  make \033[36m%-15s\033[0m %s\n", $$1, $$2}'

# --- Infraestrutura (Docker & LocalStack) ---
up: ## Sobe a infraestrutura (LocalStack + Worker) em background
	$(DC) up -d --build

down: ## Derruba a infraestrutura, limpa os volumes e containers órfãos
	$(DC) down -v --remove-orphans

restart: down up ## Reinicia a infraestrutura do zero

logs: ## Acompanha os logs de todos os containers em tempo real
	$(DC) logs -f

# --- Desenvolvimento (Node.js & Yarn) ---
install: ## Instala as dependências de forma segura pelo lockfile
	$(YARN) install --frozen-lockfile

dev: ## Roda a aplicação localmente no terminal
	$(YARN) dev

build: ## Compila o código TypeScript para CommonJS na pasta dist/
	$(YARN) build

# --- Qualidade e Segurança ---
lint: ## Verifica erros no código com ESLint
	$(YARN) lint

lint-fix: ## Corrige os erros de formatação e imports com ESLint
	$(YARN) lint:fix

format: ## Força a formatação de todo o código com Prettier
	$(YARN) format

audit: ## Verifica vulnerabilidades de segurança nas dependências
	$(YARN) security:check

clean: ## Remove as pastas dist/ e node_modules/ da máquina
	rm -rf dist node_modules
