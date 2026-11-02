import { createHash, timingSafeEqual } from 'node:crypto';

export class ApiKeyAuthenticator {
  private readonly apiKeyHashes: Buffer[];

  constructor(apiKeys: string[]) {
    this.apiKeyHashes = apiKeys.filter((apiKey) => Boolean(apiKey.length)).map(this.hashApiKey);
  }

  private hashApiKey(apiKey: string): Buffer {
    return createHash('sha256').update(apiKey).digest();
  }

  public authenticate(apiKey: string | undefined): string | null {
    if (!apiKey) {
      return null;
    }

    const candidateHash = this.hashApiKey(apiKey);
    let matchedHash: Buffer | null = null;
    for (const apiKeyHash of this.apiKeyHashes) {
      if (timingSafeEqual(candidateHash, apiKeyHash)) {
        matchedHash = apiKeyHash;
      }
    }

    return matchedHash ? matchedHash.toString('hex').slice(0, 16) : null;
  }
}
