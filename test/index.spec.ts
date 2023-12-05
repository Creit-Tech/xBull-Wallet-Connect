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
  })
})