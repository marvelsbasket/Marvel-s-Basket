import { EncryptionUtil } from './encryption.util';

describe('EncryptionUtil', () => {
  const secretKey = 'my-custom-test-encryption-key-32b-length!';
  const sampleAccountNumber = '1234567890123456';

  it('should encrypt and decrypt correctly with the same secret', () => {
    const encrypted = EncryptionUtil.encrypt(sampleAccountNumber, secretKey);
    expect(encrypted).not.toBe(sampleAccountNumber);
    expect(encrypted.split(':')).toHaveLength(3);

    const decrypted = EncryptionUtil.decrypt(encrypted, secretKey);
    expect(decrypted).toBe(sampleAccountNumber);
  });

  it('should fail decryption if ciphertext is tampered with', () => {
    const encrypted = EncryptionUtil.encrypt(sampleAccountNumber, secretKey);
    const parts = encrypted.split(':');
    parts[2] = parts[2].slice(0, -2) + 'aa'; // alter last byte
    const tampered = parts.join(':');

    expect(() => EncryptionUtil.decrypt(tampered, secretKey)).toThrow();
  });

  it('should mask bank account numbers preserving only the last 4 digits', () => {
    expect(EncryptionUtil.maskAccountNumber('1234567890123456')).toBe('••••••••••••3456');
    expect(EncryptionUtil.maskAccountNumber('987654321')).toBe('•••••4321');
    expect(EncryptionUtil.maskAccountNumber('')).toBe('');
  });
});
