import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY
  if (!secret) {
    throw new Error('APP_ENCRYPTION_KEY is not defined in environment variables')
  }
  // Se la chiave è una stringa hex o base64 o passphrase, la normalizziamo a 32 bytes
  return crypto.createHash('sha256').update(secret).digest()
}

export function encryptApiKey(plainTextKey: string): string {
  const iv = crypto.randomBytes(12)
  const key = getKey()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let encrypted = cipher.update(plainTextKey, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const authTag = cipher.getAuthTag().toString('hex')

  // Format: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag}:${encrypted}`
}

export function decryptApiKey(cipherText: string): string {
  const parts = cipherText.split(':')
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted key format')
  }

  const iv = Buffer.from(parts[0], 'hex')
  const authTag = Buffer.from(parts[1], 'hex')
  const encrypted = parts[2]
  const key = getKey()

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let decrypted = decipher.update(encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')

  return decrypted
}
