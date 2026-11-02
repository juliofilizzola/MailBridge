# MailBridge

MailBridge é um microserviço robusto em Node.js projetado para processar o envio de e-mails de forma assíncrona. Ele consome payloads de uma fila AWS SQS e os despacha utilizando diferentes provedores (como SendGrid ou SMTP via Nodemailer), permitindo fácil escalabilidade e alternância entre serviços de entrega.

## 🚀 Como Executar

O projeto pode ser executado de duas formas principais: via Docker (recomendado para desenvolvimento isolado) ou localmente.

### 1. Ambiente Docker (LocalStack)
Esta opção sobe toda a infraestrutura necessária, incluindo um container LocalStack para simular o SQS e a própria aplicação.

Antes de subir, copie `.env.exemple` para `.env` e ajuste os valores (no Docker, use `localstack_service` ao invés de `localhost`).

**Via Makefile (Linux/macOS):**
```bash
make up
```

**Via PowerShell (Windows):**
```powershell
./make.ps1 up
```

**Comando Docker direto:**
```bash
docker-compose up -d --build
```

**Criar as filas no LocalStack (uma vez):**
```bash
docker-compose exec localstack_service awslocal sqs create-queue --queue-name mail-bridge-local-queue
docker-compose exec localstack_service awslocal sqs create-queue --queue-name mail-bridge-local-dlq
```

### 2. Ambiente Local (Desenvolvimento)
Ideal para depuração rápida do código.

1.  **Instale as dependências:**
    ```bash
    yarn install
    ```
2.  **Configure o `.env`:** Certifique-se de que as variáveis de ambiente apontam para um SQS/SMTP válido.
3.  **Execute em modo dev:**
    ```bash
    yarn dev
    ```

---

## 🔄 Fluxo

```
Cliente ──POST /v1/emails──▶ API (API key + rate limit + validação) ──▶ SQS ──▶ Worker ──▶ SendGrid | Gmail | SMTP
                                                                           │
                                               falha transitória: backoff exponencial (ChangeMessageVisibility)
                                               falha permanente ou tentativas esgotadas: DLQ (SQS_DLQ_URL)
```

**Enviar um e-mail:**
```bash
curl -X POST http://localhost:3000/v1/emails   -H "x-api-key: chave_local_1" -H "Content-Type: application/json"   -d '{"targetProvider":"sendgrid","emailData":{"senderAddress":"no-reply@exemplo.com","recipientAddress":"user@exemplo.com","subject":"Oi","body":"Texto","html":"<p>Texto</p>"}}'
```

Respostas: `202` enfileirado (`messageId`), `401` API key inválida, `422` payload inválido (lista `issues`), `429` rate limit (`Retry-After`), `413` body maior que 256 KB.

`APP_ROLE` permite rodar API e worker no mesmo processo (`all`) ou separados (`api` / `worker`) para escalar cada um.

## 🧪 Testes

```bash
yarn test
yarn typecheck
```

---

## 🛠️ Adicionando um Novo Provider

O MailBridge foi desenhado seguindo o princípio Open/Closed. Para adicionar um novo provedor de e-mail (ex: AWS SES, Mailgun), siga estes passos:

1.  **Crie a Implementação:**
    Crie um novo arquivo em `src/providers/` (ex: `MyNewProvider.ts`) que implemente a interface `EmailProvider`:
    ```typescript
    import { EmailProvider, EmailPayload } from '@src/interface/types';

    export class MyNewProvider implements EmailProvider {
      async sendEmail(payload: EmailPayload): Promise<void> {
        // Lógica de integração com a API do provedor
      }
    }
    ```

2.  **Atualize o Enum:**
    Adicione o nome do novo provedor em `src/enums/providers.ts`:
    ```typescript
    export enum Providers {
      SENDGRID = 'sendgrid',
      NODEMAILER = 'nodemailer',
      MY_NEW_PROVIDER = 'my-new-provider', // Adicione aqui
    }
    ```

3.  **Registre o Provider:**
    No arquivo `src/workers/emailProviderRegistryMap.ts`, dentro de `buildEmailProviderRegistry`, registre o provedor somente quando as credenciais existirem:
    ```typescript
    import { MyNewProvider } from '@src/providers/MyNewProvider';

    const myNewApiKey = optional(env.MY_NEW_PROVIDER_API_KEY);
    if (myNewApiKey) {
      registry.set(Providers.MY_NEW_PROVIDER, new MyNewProvider(myNewApiKey));
    }
    ```

4.  **Classifique os erros:** lance `PermanentError` (`@src/commons/errors`) para falhas que não adianta repetir (ex.: HTTP 4xx). Qualquer outro erro é tratado como transitório e entra no retry.

---

## 📋 Variáveis de Ambiente (.env)

O arquivo `.env` deve conter as seguintes configurações:

*   `AWS_REGION`: Região da AWS (ou us-east-1 para localstack).
*   `SQS_QUEUE_URL`: URL da fila SQS de onde o worker consumirá.
*   `SMTP_*`: Configurações para o provedor Nodemailer.
*   `SENDGRID_API_KEY`: Chave de API para o provedor SendGrid.
*   `GMAIL_USER` + `GMAIL_APP_PASSWORD` (ou `GMAIL_CLIENT_ID` / `GMAIL_CLIENT_SECRET` / `GMAIL_REFRESH_TOKEN`): provedor Gmail.
*   `API_KEYS`: chaves aceitas pela API, separadas por vírgula.
*   `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW_SECONDS`: limite por API key.
*   `SQS_DLQ_URL`: fila de dead-letter (recomendado em produção; sem ela mensagens que esgotam o retry são descartadas com log de erro).
*   `MAX_RECEIVE_ATTEMPTS` / `RETRY_BASE_DELAY_SECONDS` / `RETRY_MAX_DELAY_SECONDS`: política de retry.
*   `APP_ROLE`: `api`, `worker` ou `all`.
*   `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`: Credenciais AWS.

---

## 🛠 Comandos Úteis

| Comando | Descrição |
| :--- | :--- |
| `make up` | Sobe infraestrutura e app (Docker) |
| `make down` | Derruba infraestrutura e limpa volumes |
| `make logs` | Visualiza logs dos containers |
| `yarn dev` | Inicia o worker localmente |
| `yarn lint` | Executa análise estática do código |
| `yarn format` | Formata o código com Prettier |
