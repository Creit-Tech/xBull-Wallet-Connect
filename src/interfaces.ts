export enum EventType {
  XBULL_CONNECT = 'XBULL_CONNECT',
  XBULL_GET_PUBLIC_KEY = 'XBULL_GET_PUBLIC_KEY',
  XBULL_SIGN_XDR = 'XBULL_SIGN_XDR',
  XBULL_GET_NETWORK = 'XBULL_GET_NETWORK',


  XBULL_INITIAL_RESPONSE = 'XBULL_INITIAL_RESPONSE',
  XBULL_CONNECT_RESPONSE = 'XBULL_CONNECT_RESPONSE',
  XBULL_SIGN = 'XBULL_SIGN',
  XBULL_SIGN_RESPONSE = 'XBULL_SIGN_RESPONSE',
}

export interface ISDKConstructor {
  url?: string;
  preferredTarget?: 'extension' | 'website'; // Default is extension
}

export interface IConnectParams {
  canRequestPublicKey: boolean;
  canRequestSign: boolean;
}

export interface IConnectResult {
  success: true;
  publicKey: string;
}

export interface ISignParams {
  xdr: string;
  publicKey?: string;
  network?: string;
}

export interface ISignResult {
  success: true;
  xdr: string;
}

export interface IRejectResult {
  success: false;
  message?: string;
}

// REQUESTS TO WALLET
export interface IConnectRequestData {
  type: EventType.XBULL_CONNECT;
  message: string; // IConnectParams JSON version
  oneTimeCode: string;
}

export interface ISignRequestData {
  type: EventType.XBULL_SIGN;
  message: string; // IConnectParams JSON version
  oneTimeCode: string;
}

// RESPONSES FROM WALLET
interface BaseResponse {
  type: EventType;
  message?: string; // base64 encrypted string response
  oneTimeCode?: string; // base64 string
}

// All values are base64 encrypted values
export interface InitialResponseListenerData extends Required<BaseResponse> {
  type: EventType.XBULL_INITIAL_RESPONSE;
  publicKey: string;
}

export interface IConnectResponseData extends Required<BaseResponse> {
  type: EventType.XBULL_CONNECT_RESPONSE;
  success: true;
}

export interface ISignResponseData extends Required<BaseResponse> {
  type: EventType.XBULL_SIGN_RESPONSE;
  success: true;
}

export interface IRejectResponse extends Pick<BaseResponse, 'type'> {
  success: false;
}

export type SdkResponse<T> = T | { error: SdkError };

export function isResponseError<T>(response: SdkResponse<T>): response is { error: SdkError } {
  return !!(response as any).error;
}

interface SdkError {
  message: string;    // general description message returned to the client app
  code: number;       // unique error code
  ext?: Array<string>;  // optional extended details
}

/**
 * @deprecated
 */
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

export interface IGetNetworkRequestPayload {
  origin: string;
  host: string;
}

export interface ISignXDRRequestPayload {
  origin: string;
  host: string;
  xdr: string;
  xdrType: 'Transaction' | 'AuthEntry';
  publicKey?: string;
  network?: string;
}
// ----- SDK and Content script types END

// ----- Background and Content script types
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
  payload: {
    signedXdr: string;
    signerAddress: string;
  };
}

export interface IRuntimeGetNetworkResponse {
  error: false;
  payload: {
    network: string,
    networkPassphrase: string
  };
}

export interface IRuntimeErrorResponse {
  error: true;
  errorMessage: string;
  code?: number;
}

export type RuntimeResponse = IRuntimeConnectResponse
  | IRuntimeGetPublicKeyResponse
  | IRuntimeSignXDRResponse
  | IRuntimeErrorResponse
  | IRuntimeGetNetworkResponse;
// ----- Background and Content script types END
