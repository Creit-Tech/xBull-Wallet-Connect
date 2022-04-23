
export enum EventType {
  XBULL_INITIAL_RESPONSE = 'XBULL_INITIAL_RESPONSE',
  XBULL_CONNECT = 'XBULL_CONNECT',
  XBULL_CONNECT_RESPONSE = 'XBULL_CONNECT_RESPONSE',
}

export interface ISDKConstructor {
  url: string;
}

export interface IConnectParams {
  canRequestPublicKey: boolean;
  canRequestSign: boolean;
}

// REQUESTS TO WALLET
export interface IConnectRequestData {
  type: EventType.XBULL_CONNECT;
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

export interface IRejectResponse extends Pick<BaseResponse, 'type'> {
  success: false;
}
