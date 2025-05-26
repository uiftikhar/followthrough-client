## 🔒 **Why Server-Side OAuth is Better**

1. **Security**: Client secrets never exposed to browser
2. **Token Management**: Centralized, encrypted token storage
3. **Session Control**: HTTP-only cookies prevent XSS attacks
4. **API Proxying**: Server validates and proxies Google API calls
5. **Refresh Logic**: Automatic token refresh without client involvement

### **Client-Side Updates**

#### 1. **Updated Google Auth Service**
```typescript
// src/lib/api/google-oauth-service.ts
export class GoogleOAuthService {
  private static readonly API_BASE = process.env.NEXT_PUBLIC_API_URL;

  // Request OAuth URL from server
  static async getAuthUrl(): Promise<string> {
    const response = await fetch(`${this.API_BASE}/auth/google/authorize`, {
      credentials: 'include', // Include session cookies
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Google auth URL');
    }
    
    const { authUrl } = await response.json();
    return authUrl;
  }

  // Check Google connection status
  static async getStatus(): Promise<{
    isConnected: boolean;
    userInfo?: any;
  }> {
    const response = await fetch(`${this.API_BASE}/auth/google/status`, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to get Google status');
    }
    
    return response.json();
  }

  // Revoke Google access
  static async revokeAccess(): Promise<void> {
    const response = await fetch(`${this.API_BASE}/auth/google/revoke`, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to revoke Google access');
    }
  }
}
```

#### 2. **Updated Google Auth Button**
```typescript
// src/components/auth/GoogleAuthButton.tsx
export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState({ isConnected: false, userInfo: null });

  useEffect(() => {
    loadStatus();
  }, []);

  const loadStatus = async () => {
    try {
      const status = await GoogleOAuthService.getStatus();
      setStatus(status);
    } catch (error) {
      console.error('Failed to load Google status:', error);
    }
  };

  const handleAuthorize = async () => {
    try {
      setIsLoading(true);
      const authUrl = await GoogleOAuthService.getAuthUrl();
      window.location.href = authUrl;
    } catch (error) {
      console.error('Failed to initiate authorization:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevoke = async () => {
    try {
      setIsLoading(true);
      await GoogleOAuthService.revokeAccess();
      setStatus({ isConnected: false, userInfo: null });
    } catch (error) {
      console.error('Failed to revoke access:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // ... rest of component
}
```

### **Phase 3: Security Enhancements**

#### 1. **Token Encryption Service**
```typescript
// src/common/services/encryption.service.ts
@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly secretKey: Buffer;

  constructor(private configService: ConfigService) {
    this.secretKey = crypto.scryptSync(
      this.configService.get('ENCRYPTION_KEY'),
      'salt',
      32
    );
  }

  encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.secretKey);
    cipher.setAAD(Buffer.from('google-tokens', 'utf8'));
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
  }

  decrypt(encryptedData: string): string {
    const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    
    const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
    decipher.setAAD(Buffer.from('google-tokens', 'utf8'));
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}
```

#### 2. **Google Auth Guard**
```typescript
// src/auth/guards/google-auth.guard.ts
@Injectable()
export class GoogleAuthGuard implements CanActivate {
  constructor(private googleOAuthService: GoogleOAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    
    const isConnected = await this.googleOAuthService.isConnected(userId);
    
    if (!isConnected) {
      throw new ForbiddenException('Google account not connected');
    }
    
    return true;
  }
}
```

## 🔄 **Migration Steps**

1. **Phase 1**: Implement NestJS OAuth endpoints
2. **Phase 2**: Update client to use server endpoints
3. **Phase 3**: Add encryption and security features
4. **Phase 4**: Implement Google API proxy endpoints
5. **Phase 5**: Remove client-side OAuth logic

## 📦 **Required Dependencies**

```bash
# NestJS Backend
npm install googleapis @google-cloud/oauth2 crypto

# Environment Variables
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback
ENCRYPTION_KEY=your_32_char_encryption_key
```

This approach gives you:
- ✅ **Secure token storage** (encrypted in database)
- ✅ **HTTP-only cookies** (XSS protection)
- ✅ **Server-side token refresh** (automatic)
- ✅ **API rate limiting** (server-controlled)
- ✅ **Centralized logging** (audit trail)
- ✅ **Easy token revocation** (immediate effect)

Would you like me to help you implement any specific part of this plan first?
