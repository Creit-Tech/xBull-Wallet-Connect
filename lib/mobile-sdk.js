"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xBullSDK = exports.IRuntimeErrorResponseType = exports.EventTypes = void 0;
var EventTypes;
(function (EventTypes) {
    EventTypes["XBULL_CONNECT"] = "XBULL_CONNECT";
    EventTypes["XBULL_GET_PUBLIC_KEY"] = "XBULL_GET_PUBLIC_KEY";
    EventTypes["XBULL_SIGN_XDR"] = "XBULL_SIGN_XDR";
})(EventTypes = exports.EventTypes || (exports.EventTypes = {}));
var IRuntimeErrorResponseType;
(function (IRuntimeErrorResponseType) {
    IRuntimeErrorResponseType["CONNECTION_REJECTED"] = "CONNECTION_REJECTED";
})(IRuntimeErrorResponseType = exports.IRuntimeErrorResponseType || (exports.IRuntimeErrorResponseType = {}));
class xBullSDK {
    constructor() {
        this.isConnected = false;
    }
    sendEventToContentScript(eventName, payload) {
        return new Promise(resolve => {
            const eventId = (new Date().getTime() + Math.random()).toString(16);
            const eventListener = (event) => {
                if (event.source !== window || !event.data || event.origin !== window.origin) {
                    return;
                }
                const response = event.data;
                if (response.eventId === eventId) {
                    resolve(event);
                    window.removeEventListener('message', eventListener, false);
                }
            };
            window.addEventListener('message', eventListener, false);
            window.webkit.messageHandlers.cordova_iab.postMessage(JSON.stringify({
                type: eventName,
                eventId,
                detail: payload,
            }));
        });
    }
    connect(permissions) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!permissions || (!permissions.canRequestPublicKey && !permissions.canRequestSign)) {
                throw new Error('Value sent is not valid');
            }
            const dispatchEventParams = {
                origin: window.origin,
                host: window.location.host,
                permissions,
            };
            const response = yield this.sendEventToContentScript(EventTypes.XBULL_CONNECT, dispatchEventParams);
            const { detail } = response.data;
            if (!detail || detail.error) {
                throw new Error((detail === null || detail === void 0 ? void 0 : detail.errorMessage) || 'Unexpected error');
            }
            this.isConnected = true;
            return detail.payload;
        });
    }
    getPublicKey() {
        return __awaiter(this, void 0, void 0, function* () {
            const dispatchEventParams = {
                origin: window.origin,
                host: window.location.host,
            };
            const response = yield this.sendEventToContentScript(EventTypes.XBULL_GET_PUBLIC_KEY, dispatchEventParams);
            const { detail } = response.data;
            if (!detail || detail.error) {
                throw new Error((detail === null || detail === void 0 ? void 0 : detail.errorMessage) || 'Unexpected error');
            }
            return detail.payload;
        });
    }
    signXDR(xdr, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const dispatchEventParams = {
                origin: window.origin,
                host: window.location.host,
                network: options === null || options === void 0 ? void 0 : options.network,
                publicKey: options === null || options === void 0 ? void 0 : options.publicKey,
                xdr,
            };
            const response = yield this.sendEventToContentScript(EventTypes.XBULL_SIGN_XDR, dispatchEventParams);
            const { detail } = response.data;
            if (!detail || detail.error) {
                throw new Error((detail === null || detail === void 0 ? void 0 : detail.errorMessage) || 'Unexpected error');
            }
            return detail.payload;
        });
    }
}
exports.xBullSDK = xBullSDK;
//# sourceMappingURL=mobile-sdk.js.map