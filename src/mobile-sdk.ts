import {
  EventType,
  IConnectRequestPayload,
  IGetNetworkRequestPayload,
  IGetPublicKeyRequestPayload,
  IRuntimeConnectResponse,
  IRuntimeErrorResponse, IRuntimeGetNetworkResponse,
  IRuntimeGetPublicKeyResponse, IRuntimeSignMessageResponse,
  IRuntimeSignXDRResponse, ISignMessageRequestPayload,
  ISignXDRRequestPayload,
  SdkResponse,
} from './interfaces';

export class xBullSDK {
  isConnected = false;

  constructor() {}

  private sendEventToContentScript<T, R>(eventName: EventType, payload: T, nonce: string): Promise<{ data: { detail: R; eventId: string; returnFromCS?: boolean } }> {
    return new Promise<{ data: { detail: R; eventId: string; returnFromCS?: boolean } }>(resolve => {
      const eventListener = (event: any) => {
        if (event.source !== window || !event.data || event.origin !== window.origin) {
          return;
        }

        const response = event.data as { detail: R; eventId: string; returnFromCS?: boolean };

        if (response.eventId === nonce) {
          resolve(event);
          window.removeEventListener('message', eventListener, false);
        }
      };

      window.addEventListener('message', eventListener, false);

      (window as any).webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify({
        type: eventName,
        eventId: nonce,
        detail: payload,
      }));
    });
  }

  /**
   * This function ask the user to confirm they want to accept request from this website,
   * this function is automatically called when using other functions.
   */
  async enableConnection(): Promise<void> {
    const dispatchEventParams: IConnectRequestPayload = {
      origin: window.origin,
      host: window.location.host,
      permissions: { canRequestPublicKey: true, canRequestSign: true },
    };

    const response = await this.sendEventToContentScript<
      IConnectRequestPayload,
      IRuntimeConnectResponse | IRuntimeErrorResponse
    >(EventType.XBULL_CONNECT, dispatchEventParams, crypto.randomUUID());
    const { detail } = response.data;

    if (!detail || detail.error) {
      throw {
        code: detail?.code || -1,
        message: detail?.errorMessage || 'Unexpected error',
      };
    }

    this.isConnected = true;
  }

  /**
   * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md#signtransaction
   */
  async getAddress(): Promise<SdkResponse<{ address: string }>> {
    try {
      await this.enableConnection();
    } catch (e: any) {
      return {
        error: {
          code: e?.code || -1,
          message: e?.message || 'Unexpected error',
        }
      };
    }

    const dispatchEventParams: IGetPublicKeyRequestPayload = {
      origin: window.origin,
      host: window.location.host,
    };

    const response = await this.sendEventToContentScript<
      IGetPublicKeyRequestPayload,
      IRuntimeGetPublicKeyResponse | IRuntimeErrorResponse
    >(EventType.XBULL_GET_PUBLIC_KEY, dispatchEventParams, crypto.randomUUID());

    const { detail } = response.data;

    if (!detail || detail.error) {
      return {
        error: {
          code: detail?.code || -1,
          message: detail?.errorMessage || 'Unexpected error',
        }
      };
    }

    return { address: detail.payload };
  }

  /**
   * https://github.com/stellar/stellar-protocol/blob/master/ecosystem/sep-0043.md#signtransaction
   */
  async signTransaction(params: {
    xdr: string,
    opts?: {
      networkPassphrase?: string,
      address?: string;
      submit?: boolean;
      submitUrl?: string;
    };
  }): Promise<SdkResponse<{ signedTxXdr: string; signerAddress: string; }>> {
    if (params.opts?.submit || params.opts?.submitUrl) {
      return {
        error: {
          code: -1,
          message: 'Parameters `submit` and `submitUrl` are not supported',
        },
      };
    }

    try {
      await this.enableConnection();
    } catch (e: any) {
      return {
        error: {
          code: e?.code || -1,
          message: e?.message || 'Unexpected error',
        }
      };
    }

    const dispatchEventParams: ISignXDRRequestPayload = {
      origin: window.origin,
      host: window.location.host,
      network: params.opts?.networkPassphrase,
      publicKey: params.opts?.address,
      xdr: params.xdr,
      xdrType: 'Transaction',
    };

    const response = await this.sendEventToContentScript<
      ISignXDRRequestPayload,
      IRuntimeSignXDRResponse | IRuntimeErrorResponse
    >(EventType.XBULL_SIGN_XDR, dispatchEventParams, crypto.randomUUID());

    const { detail } = response.data;

    if (!detail || detail.error) {
      return {
        error: {
          code: detail?.code || -1,
          message: detail?.errorMessage || 'Unexpected error',
        }
      };
    }

    return {
      signedTxXdr: detail.payload.signedXdr,
      signerAddress: detail.payload.signerAddress,
    };
  }

  async signMessage(
    message: string,
    opts?: {
      networkPassphrase?: string,
      address?: string;
    }
  ): Promise<SdkResponse<{ signedMessage: string; signerAddress: string; }>> {
    if (!message) return {
      error: {
        code: -1,
        message: 'The message must be defined.'
      }
    }

    try {
      await this.enableConnection();
    } catch (e: any) {
      return {
        error: {
          code: e?.code || -1,
          message: e?.message || 'Unexpected error',
        }
      };
    }

    const dispatchEventParams: ISignMessageRequestPayload = {
      origin: window.origin,
      host: window.location.host,
      message: message,
      publicKey: opts?.address,
      network: opts?.networkPassphrase,
    };

    const response = await this.sendEventToContentScript<
      ISignMessageRequestPayload,
      IRuntimeSignMessageResponse | IRuntimeErrorResponse
    >(EventType.XBULL_SIGN_MESSAGE, dispatchEventParams, crypto.randomUUID());

    const { detail } = response.data;

    if (!detail || detail.error) {
      return {
        error: {
          code: detail?.code || -1,
          message: detail?.errorMessage || 'Unexpected error',
        }
      };
    }

    return {
      signedMessage: detail.payload.signedMessage,
      signerAddress: detail.payload.signerAddress,
    };
  }

  /**
   * This method returns the information of the currently selected network
   */
  async getNetwork(): Promise<SdkResponse<{ network: string; networkPassphrase: string; }>> {
    try {
      await this.enableConnection();
    } catch (e: any) {
      return {
        error: {
          code: e?.code || -1,
          message: e?.message || 'Unexpected error',
        }
      };
    }

    const dispatchEventParams: IGetNetworkRequestPayload = {
      origin: window.origin,
      host: window.location.host,
    };

    const response = await this.sendEventToContentScript<
      IGetNetworkRequestPayload,
      IRuntimeGetNetworkResponse | IRuntimeErrorResponse
    >(EventType.XBULL_GET_NETWORK, dispatchEventParams, crypto.randomUUID());

    const { detail } = response.data;

    if (!detail || detail.error) {
      return {
        error: {
          code: detail?.code || -1,
          message: detail?.errorMessage || 'Unexpected error',
        }
      };
    }

    return {
      network: detail.payload.network,
      networkPassphrase: detail.payload.networkPassphrase,
    };
  }
}
