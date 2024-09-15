import { box, randomBytes } from 'tweetnacl';
import { decodeBase64, decodeUTF8, encodeBase64, encodeUTF8 } from 'tweetnacl-util';
import {
  EventType,
  IConnectParams,
  IConnectRequestData,
  IConnectResponseData,
  IConnectResult,
  InitialResponseListenerData,
  IRejectResponse,
  IRejectResult,
  ISDKConstructor,
  ISignParams, ISignRequestData,
  ISignResponseData,
  ISignResult,
  isResponseError,
  SdkResponse,
} from './interfaces';
import {
  firstValueFrom,
  of,
  Subject,
  Subscription,
  switchMap,
  take,
  takeUntil,
  throwError,
  timer
} from 'rxjs';
import { xBullSDK } from './mobile-sdk';

export class xBullWalletConnect {
  closeCurrentPromises$: Subject<void> = new Subject<void>();
  closeObservables$: Subject<void> = new Subject<void>();

  preferredTarget: Required<ISDKConstructor['preferredTarget']>;

  target?: Window | null;
  targetPublicKey?: string; // this value is encrypted
  readonly walletUrl: string;

  encryptForReceiver: (params: { data: string, receiverPublicKey: Uint8Array }) => { message: string, oneTimeCode: string };
  decryptFromReceiver: (params: { payload: string; oneTimeCode: string; senderPublicKey: string }) => string;
  publicKey: () => Uint8Array;
  session: () => string;

  initialResponse$: Subject<MessageEvent<InitialResponseListenerData>> = new Subject<MessageEvent<InitialResponseListenerData>>();
  initialResponseCompleted$: Subject<void> = new Subject<void>();

  connectResponse$: Subject<MessageEvent<IConnectResponseData | IRejectResponse>> = new Subject<MessageEvent<IConnectResponseData | IRejectResponse>>();
  connectResult$: Subject<IConnectResult | IRejectResult> = new Subject<IConnectResult | IRejectResult>(); // the value is the public key returned from the wallet

  signResponse$: Subject<MessageEvent<ISignResponseData | IRejectResponse>> = new Subject<MessageEvent<ISignResponseData | IRejectResponse>>();
  signResult$: Subject<ISignResult | IRejectResult> = new Subject<ISignResult | IRejectResult>();

  constructor(params?: ISDKConstructor) {
    this.preferredTarget = params?.preferredTarget || 'extension';
    this.walletUrl = params?.url || 'https://wallet.xbull.app/connect';
    const sessionKeypair = box.keyPair();
    const session = encodeBase64(randomBytes(24));

    this.encryptForReceiver = (params: { data: string, receiverPublicKey: Uint8Array }) => {
      const oneTimeCode = randomBytes(24);
      const cipherText = box(
        decodeUTF8(params.data),
        oneTimeCode,
        params.receiverPublicKey,
        sessionKeypair.secretKey
      );

      return {
        message: encodeBase64(cipherText),
        oneTimeCode: encodeBase64(oneTimeCode),
      };
    };

    this.decryptFromReceiver = (params: { payload: string; oneTimeCode: string; senderPublicKey: string }) => {
      const decryptedMessage = box.open(
        decodeBase64(params.payload),
        decodeBase64(params.oneTimeCode),
        decodeBase64(params.senderPublicKey),
        sessionKeypair.secretKey,
      );

      if (!decryptedMessage) {
        throw new Error('Decrypted message is null');
      }

      return encodeUTF8(decryptedMessage);
    }

    this.publicKey = () => sessionKeypair.publicKey;

    this.session = () => session.slice();

    const listener = (ev: any) => {
      switch (ev.data.type as EventType) {
        case EventType.XBULL_INITIAL_RESPONSE:
          this.initialResponse$.next(ev);
          break;

        case EventType.XBULL_CONNECT_RESPONSE:
          this.connectResponse$.next(ev);
          break;

        case EventType.XBULL_SIGN_RESPONSE:
          this.signResponse$.next(ev);
          break;
      }
    };

    window.addEventListener('message', listener);

    this.closeObservables$.asObservable()
      .pipe(take(1))
      .subscribe(() => {
        window.removeEventListener('message', listener);
      });
  }

  closeCurrentPromisesSubscription: Subscription = timer(1000, 1000)
    .pipe(takeUntil(this.closeObservables$))
    .subscribe(() => {
      if (this.target?.closed) {
        this.closeCurrentPromises$.next();
      }
    })

  onInititalResponseSubscription: Subscription = this.initialResponse$
    .pipe(takeUntil(this.closeObservables$))
    .subscribe((ev: MessageEvent<InitialResponseListenerData>) => {
      const decryptedMessage = this.decryptFromReceiver({
        oneTimeCode: ev.data.oneTimeCode,
        payload: ev.data.message,
        senderPublicKey: ev.data.publicKey
      });

      const data = JSON.parse(decryptedMessage);

      if (data.providedSession === this.session()) {
        this.targetPublicKey = ev.data.publicKey;
        this.initialResponseCompleted$.next();
      }
    });

  onConnectResponseSubscription: Subscription = this.connectResponse$
    .pipe(takeUntil(this.closeObservables$))
    .subscribe((ev: MessageEvent<IConnectResponseData | IRejectResponse>) => {
      if (!this.targetPublicKey) {
        this.connectResult$.next({ success: false, message: 'Wallet encryption public key is not provided, request rejected.' })
        return;
      }

      if (!ev.data.success) {
        this.connectResult$.next({ success: false, message: 'Request rejected from the wallet' });
        return;
      }

      const decryptedMessage = this.decryptFromReceiver({
        oneTimeCode: ev.data.oneTimeCode,
        payload: ev.data.message,
        senderPublicKey: this.targetPublicKey,
      });

      const data: { publicKey: string } = JSON.parse(decryptedMessage);

      this.connectResult$.next({ success: true, publicKey: data.publicKey });
    });

  onSignResponseSubscription: Subscription = this.signResponse$
    .pipe(takeUntil(this.closeObservables$))
    .subscribe((ev: MessageEvent<ISignResponseData | IRejectResponse>) => {
      if (!this.targetPublicKey) {
        this.signResult$.next({ success: false, message: 'Wallet encryption public key is not provided, request rejected.' })
        return;
      }

      if (!ev.data.success) {
        this.signResult$.next({ success: false, message: 'Request rejected from the wallet' });
        return;
      }

      const decryptedMessage = this.decryptFromReceiver({
        oneTimeCode: ev.data.oneTimeCode,
        payload: ev.data.message,
        senderPublicKey: this.targetPublicKey,
      });

      const data: { xdr: string } = JSON.parse(decryptedMessage);

      this.signResult$.next({ success: true, xdr: data.xdr });
    });

  openWallet() {
    if (!!this.target && !this.target.closed) {
      this.target.close();
      this.target = null;
      this.closeCurrentPromises$.next();
    }

    this.target = window.open(
      `${this.walletUrl}?public=${encodeURIComponent(encodeBase64(this.publicKey()))}&session=${encodeURIComponent(this.session())}`,
      'xBull_Wallet_app',
      'width=380,height=640,left=100,top=100'
    );

    return firstValueFrom(
      this.initialResponseCompleted$
        .pipe(takeUntil(this.closeCurrentPromises$))
        .pipe(takeUntil(this.closeObservables$))
    );
  }

  closeWallet() {
    if (!!this.target) {
      this.target?.close();
      this.target = null;
    }
  }

  async connect(params: IConnectParams = { canRequestPublicKey: true, canRequestSign: true }): Promise<string> {
    const extensionSdk: xBullSDK = !!(window as any)?.webkit?.messageHandlers?.cordova_iab ? new xBullSDK() : (window as any).xBullSDK;
    if (!!extensionSdk && this.preferredTarget === 'extension') {
      const response: SdkResponse<{ address: string }> = await extensionSdk.getAddress();

      if (isResponseError(response)) {
        throw response.error;
      } else {
        return response.address;
      }
    } else {

      await this.openWallet();

      if (!this.target || !this.targetPublicKey) {
        throw new Error(`xBull Wallet is not open, we can't connect with it`);
      }

      const { message, oneTimeCode } = this.encryptForReceiver({
        data: JSON.stringify(params),
        receiverPublicKey: decodeBase64(this.targetPublicKey),
      })

      const payload: IConnectRequestData = {
        type: EventType.XBULL_CONNECT,
        message,
        oneTimeCode,
      };

      this.target.postMessage(payload, '*');

      const result = this.connectResult$
        .asObservable()
        .pipe(switchMap(result => {
          if (!result.success) {
            this.closeWallet();
            return throwError(() => new Error(result.message));
          } else {
            this.closeWallet();
            return of(result.publicKey);
          }
        }))
        .pipe(take(1))
        .pipe(takeUntil(this.closeCurrentPromises$))
        .pipe(takeUntil(this.closeObservables$));

      return firstValueFrom(result);

    }
  }

  async sign(params: ISignParams): Promise<string> {
    const extensionSdk: xBullSDK = !!(window as any)?.webkit?.messageHandlers?.cordova_iab ? new xBullSDK() : (window as any).xBullSDK;
    if (!!extensionSdk && this.preferredTarget === 'extension') {
      const response = await extensionSdk.signTransaction({
        xdr: params.xdr,
        opts: {
          networkPassphrase: params.network,
          address: params.publicKey,
        }
      });

      if (isResponseError(response)) {
        throw response.error;
      } else {
        return response.signedTxXdr;
      }
    } else {
      await this.openWallet();

      if (!this.target || !this.targetPublicKey) {
        throw new Error(`xBull Wallet is not open, we can't connect with it`);
      }

      if (typeof params.xdr !== 'string') {
        throw new Error('XDR provided needs to be a string value');
      }

      const { message, oneTimeCode } = this.encryptForReceiver({
        data: JSON.stringify(params),
        receiverPublicKey: decodeBase64(this.targetPublicKey),
      });

      const payload: ISignRequestData = {
        type: EventType.XBULL_SIGN,
        message,
        oneTimeCode,
      };

      this.target.postMessage(payload, '*');

      const result = this.signResult$
        .asObservable()
        .pipe(switchMap(result => {
          if (!result.success) {
            this.closeWallet();
            return throwError(() => new Error(result.message));
          } else {
            this.closeWallet();
            return of(result.xdr);
          }
        }))
        .pipe(take(1))
        .pipe(takeUntil(this.closeCurrentPromises$))
        .pipe(takeUntil(this.closeObservables$));

      return firstValueFrom(result);
    }
  }

  closeConnections() {
    this.closeObservables$.next();
    this.closeCurrentPromises$.next();
    this.closeObservables$.complete();
    this.closeCurrentPromises$.complete();
  }
}
