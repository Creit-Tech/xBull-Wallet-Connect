import { box, randomBytes } from 'tweetnacl';
import { xBullWalletConnect } from '../src';
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util';

describe('SDK Specs', () => {

  describe('encryptForReceiver', () => {
    test('should return a payload that can be decrypted by the recipient private key', () => {
      const receiverKeypair = box.keyPair();
      const connection = new xBullWalletConnect();
      const sessionPublicKey = connection.publicKey();
      const messageToSend = 'This is a test message';
      const { message, oneTimeCode } = connection.encryptForReceiver({
        data: messageToSend,
        receiverPublicKey: receiverKeypair.publicKey,
      });

      expect(typeof message).toBe('string');
      expect(messageToSend).not.toEqual(message);

      const decryptedMessage = box.open(
        decodeBase64(message),
        decodeBase64(oneTimeCode),
        sessionPublicKey,
        receiverKeypair.secretKey,
      );

      if (!decryptedMessage) {
        throw new Error();
      }

      expect(encodeUTF8(decryptedMessage)).toBe(messageToSend);
    });

    test('Should decrypt the message sent from the receiver', () => {
      const senderKeypair = box.keyPair();
      const connection = new xBullWalletConnect();
      const sessionPublicKey = connection.publicKey();
      const messageToSend = 'This is a test message';

      const oneTimeCode = randomBytes(24);
      const cipherText = box(
        decodeUTF8(messageToSend),
        oneTimeCode,
        sessionPublicKey,
        senderKeypair.secretKey
      );

      const decryptedMessage = connection.decryptFromReceiver({
        oneTimeCode: encodeBase64(oneTimeCode),
        payload: encodeBase64(cipherText),
        senderPublicKey: encodeBase64(senderKeypair.publicKey),
      });

      expect(decryptedMessage).toBe(messageToSend);
    })
    });

    test('should throw error when getNetwork is called without extension SDK', async () => {
      const connection = new xBullWalletConnect();
      await expect(connection.getNetwork()).rejects.toThrow('getNetwork is currently only supported when using the extension target');
    });

    test('should return network info when extension SDK provides it', async () => {
      const mockNetwork = { network: 'TESTNET', networkPassphrase: 'Test SDF Network ; September 2015' };
      (global as any).window = (global as any).window || {};
      (global as any).window.xBullSDK = {
        getNetwork: jest.fn().mockResolvedValue(mockNetwork),
      };

      const connection = new xBullWalletConnect({ preferredTarget: 'extension' });
      const result = await connection.getNetwork();
      expect(result).toEqual(mockNetwork);

      delete (global as any).window.xBullSDK;
    });
  });
});