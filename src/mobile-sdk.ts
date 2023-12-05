/**
 * This "mobile-sdk" is used when we are using this library within a inAppBrowser from xBull Signer
 */

export enum EventTypes {
  XBULL_CONNECT = 'XBULL_CONNECT',
  XBULL_GET_PUBLIC_KEY = 'XBULL_GET_PUBLIC_KEY',
  XBULL_SIGN_XDR = 'XBULL_SIGN_XDR',
}

// ----- SDK and Content script types
export interface ISitePermissions {
  canRequestPublicKey: boolean;
  canRequestSign: boolean;
}

export interface IConnectRequestPayload {
  origin: string;
  host: string;
  permissions: ISitePermissions;
}

export interface IGetPublicKeyRequestPayload {
  origin: string;
  host: string;
}

export interface ISignXDRRequestPayload {
  origin: string;
  host: string;
  xdr: string;
  publicKey?: string;
  network?: string;
}
// ----- SDK and Content script types END

export interface IRuntimeConnectResponse {
  error: false;
  payload: ISitePermissions;
}

export interface IRuntimeGetPublicKeyResponse {
  error: false;
  payload: string;
}

export interface IRuntimeSignXDRResponse {
  error: false;
  payload: string;
}

export enum IRuntimeErrorResponseType {
  CONNECTION_REJECTED = 'CONNECTION_REJECTED',
}

export interface IRuntimeErrorResponse {
  error: true;
  errorType: IRuntimeErrorResponseType;
  errorMessage: string;
}
// ----- Background and Content script types END

export class xBullSDK {
  isConnected = false;

  constructor() {}

  // ts-expect-error - any is expected
  private sendEventToContentScript<T, R>(eventName: EventTypes, payload: T): Promise<any> {
    return new Promise<CustomEvent<R>>(resolve => {
      // We use this id to create a random event listener and avoid mixing messages
      const eventId = (new Date().getTime() + Math.random()).toString(16);

      const eventListener = (event: any) => {
        if (event.source !== window || !event.data || event.origin !== window.origin) {
          return;
        }

        const response = event.data as { detail: R; eventId: string; returnFromCS?: boolean };

        if (response.eventId === eventId) {
          resolve(event);
          window.removeEventListener('message', eventListener, false);
        }
      };

      window.addEventListener('message', eventListener, false);

      (window as any).webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify({
        type: eventName,
        eventId,
        detail: payload,
      }));
    });
  }
  async connect(permissions: IConnectRequestPayload['permissions']): Promise<IRuntimeConnectResponse['payload']> {
    if (!permissions || (!permissions.canRequestPublicKey && !permissions.canRequestSign)) {
      throw new Error('Value sent is not valid');
    }

    const dispatchEventParams: IConnectRequestPayload = {
      origin: window.origin,
      host: window.location.host,
      permissions,
    };

    // tslint:disable-next-line:max-line-length
    const response = await this.sendEventToContentScript<
      IConnectRequestPayload,
      IRuntimeConnectResponse | IRuntimeErrorResponse
    >(EventTypes.XBULL_CONNECT, dispatchEventParams);
    const { detail } = response.data;

    if (!detail || detail.error) {
      throw new Error(detail?.errorMessage || 'Unexpected error');
    }

    this.isConnected = true;

    return detail.payload;
  }

  async getPublicKey(): Promise<string> {
    const dispatchEventParams: IGetPublicKeyRequestPayload = {
      origin: window.origin,
      host: window.location.host,
    };

    const response = await this.sendEventToContentScript<
      IGetPublicKeyRequestPayload,
      IRuntimeGetPublicKeyResponse | IRuntimeErrorResponse
    >(EventTypes.XBULL_GET_PUBLIC_KEY, dispatchEventParams);

    const { detail } = response.data;

    if (!detail || detail.error) {
      throw new Error(detail?.errorMessage || 'Unexpected error');
    }

    return detail.payload;
  }

  async signXDR(xdr: string, options: { network?: string; publicKey?: string }): Promise<string> {
    const dispatchEventParams: ISignXDRRequestPayload = {
      origin: window.origin,
      host: window.location.host,
      network: options?.network,
      publicKey: options?.publicKey,
      xdr,
    };

    const response = await this.sendEventToContentScript<
      ISignXDRRequestPayload,
      IRuntimeSignXDRResponse | IRuntimeErrorResponse
    >(EventTypes.XBULL_SIGN_XDR, dispatchEventParams);

    const { detail } = response.data;

    if (!detail || detail.error) {
      throw new Error(detail?.errorMessage || 'Unexpected error');
    }

    return detail.payload;
  }
}
