export declare enum EventTypes {
    XBULL_CONNECT = "XBULL_CONNECT",
    XBULL_GET_PUBLIC_KEY = "XBULL_GET_PUBLIC_KEY",
    XBULL_SIGN_XDR = "XBULL_SIGN_XDR"
}
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
export declare enum IRuntimeErrorResponseType {
    CONNECTION_REJECTED = "CONNECTION_REJECTED"
}
export interface IRuntimeErrorResponse {
    error: true;
    errorType: IRuntimeErrorResponseType;
    errorMessage: string;
}
export declare class xBullSDK {
    isConnected: boolean;
    constructor();
    private sendEventToContentScript;
    connect(permissions: IConnectRequestPayload['permissions']): Promise<IRuntimeConnectResponse['payload']>;
    getPublicKey(): Promise<string>;
    signXDR(xdr: string, options: {
        network?: string;
        publicKey?: string;
    }): Promise<string>;
}
