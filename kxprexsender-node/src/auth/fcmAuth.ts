import jwt from 'jsonwebtoken';

interface FcmCredentials {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class FcmAuthenticator {
  private credentials: FcmCredentials;
  private cachedToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor(credentials: FcmCredentials) {
    this.credentials = credentials;
  }

  async getAccessToken(): Promise<string> {
    const now = Date.now();

    if (this.cachedToken && now < this.tokenExpiry - 60000) {
      return this.cachedToken;
    }

    const token = await this.createJwt();
    const response = await this.exchangeToken(token);

    this.cachedToken = response.access_token;
    this.tokenExpiry = now + (response.expires_in * 1000);

    return this.cachedToken;
  }

  private async createJwt(): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const expiry = now + 3600;

    const payload = {
      iss: this.credentials.clientEmail,
      sub: this.credentials.clientEmail,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: expiry,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
    };

    const privateKey = this.credentials.privateKey.replace(/\\n/g, '\n');

    return jwt.sign(payload, privateKey, {
      algorithm: 'RS256',
    });
  }

  private async exchangeToken(assertion: string): Promise<TokenResponse> {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`FCM token exchange failed: ${error}`);
    }

    return response.json() as Promise<TokenResponse>;
  }
}
