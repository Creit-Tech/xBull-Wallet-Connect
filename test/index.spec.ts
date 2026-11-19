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

  describe('shared message listener', () => {
    // The window `message` listener is global, so with more than one live instance a frame
    // sealed for another session cannot be opened here. Throwing out of the subscription is
    // not a handled failure: rxjs rethrows it in a bare timer task, which reaches
    // window.onerror and surfaces as "Decrypted message is null" in the host application.
    test('ignores a frame sealed for another session instead of throwing, and still serves the addressed one', async () => {
      const addressed = new xBullWalletConnect();
      const otherSession = new xBullWalletConnect();
      const walletKeypair = box.keyPair();
      const oneTimeCode = randomBytes(24);
      const cipherText = box(
        decodeUTF8(JSON.stringify({ providedSession: addressed.session() })),
        oneTimeCode,
        addressed.publicKey(),
        walletKeypair.secretKey
      );

      if (!cipherText) {
        throw new Error('Test fixture could not seal the frame');
      }

      const escalated: unknown[] = [];
      const realSetTimeout = (globalThis as { setTimeout: (cb: () => void, ms?: number) => unknown }).setTimeout;

      // rxjs escalates the subscriber throw with setTimeout(() => { throw err }). In jsdom
      // globalThis is the window, so this hook is the same task window.onerror would run.
      (globalThis as { setTimeout: unknown }).setTimeout = (handler: () => void, ms?: number) =>
        realSetTimeout(() => {
          try {
            handler();
          } catch (error) {
            escalated.push(error);
          }
        }, ms);

      try {
        window.postMessage(
          {
            type: 'XBULL_INITIAL_RESPONSE',
            oneTimeCode: encodeBase64(oneTimeCode),
            message: encodeBase64(cipherText),
            publicKey: encodeBase64(walletKeypair.publicKey),
          },
          '*'
        );

        // The message event, the subscription and the escalated rethrow land in later tasks.
        for (let tick = 0; tick < 5; tick++) {
          await new Promise<void>((resolve) => realSetTimeout(() => resolve(), 0));
        }

        expect(escalated).toEqual([]);
        expect(addressed.targetPublicKey).toBe(encodeBase64(walletKeypair.publicKey));
        expect(otherSession.targetPublicKey).toBeUndefined();
      } finally {
        (globalThis as { setTimeout: unknown }).setTimeout = realSetTimeout;
        addressed.closeConnections();
        otherSession.closeConnections();
      }
    })
  })
})