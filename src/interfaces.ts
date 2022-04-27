
export enum EventType {
  XBULL_INITIAL_RESPONSE = 'XBULL_INITIAL_RESPONSE',
  XBULL_CONNECT = 'XBULL_CONNECT',
  XBULL_CONNECT_RESPONSE = 'XBULL_CONNECT_RESPONSE',
  XBULL_SIGN = 'XBULL_SIGN',
  XBULL_SIGN_RESPONSE = 'XBULL_SIGN_RESPONSE',
}

export interface ISDKConstructor {
  url: string;
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
