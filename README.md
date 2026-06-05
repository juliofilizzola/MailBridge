# MailBridge

MailBridge é um microserviço robusto em Node.js projetado para processar o envio de e-mails de forma assíncrona. Ele consome payloads de uma fila AWS SQS e os despacha utilizando diferentes provedores (como SendGrid ou SMTP via Nodemailer), permitindo fácil escalabilidade e alternância entre serviços de entrega.

## 🚀 Como Executar

O projeto pode ser executado de duas formas principais: via Docker (recomendado para desenvolvimento isolado) ou localmente.

### 1. Ambiente Docker (LocalStack)
Esta opção sobe toda a infraestrutura necessária, incluindo um container LocalStack para simular o SQS e a própria aplicação.

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

**Criar a fila no LocalStack (uma vez):**
docker-compose exec localstack_service awslocal sqs create-queue --queue-name mail-bridge-local-queue

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
    No arquivo `src/wokers/emailProviderRegistryMap.ts`, instancie seu provedor e adicione-o ao mapa:
    ```typescript
    import { MyNewProvider } from '@src/providers/MyNewProvider';

    const myNewProvider = new MyNewProvider();

    export const emailProviderRegistryMap: Map<Providers, EmailProvider> = new Map<
      Providers,
      EmailProvider
    >([
      // ... registros existentes
      [Providers.MY_NEW_PROVIDER, myNewProvider],
    ]);
    ```

---

## 📋 Variáveis de Ambiente (.env)

O arquivo `.env` deve conter as seguintes configurações:

*   `AWS_REGION`: Região da AWS (ou us-east-1 para localstack).
*   `SQS_QUEUE_URL`: URL da fila SQS de onde o worker consumirá.
*   `SMTP_*`: Configurações para o provedor Nodemailer.
*   `SENDGRID_API_KEY`: Chave de API para o provedor SendGrid.
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
