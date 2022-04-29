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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.xBullWalletConnect = void 0;
const tweetnacl_1 = require("tweetnacl");
const tweetnacl_util_1 = require("tweetnacl-util");
const interfaces_1 = require("./interfaces");
const rxjs_1 = require("rxjs");
class xBullWalletConnect {
    constructor(params) {
        this.closeCurrentPromises$ = new rxjs_1.Subject();
        this.closeObservables$ = new rxjs_1.Subject();
        this.initialResponse$ = new rxjs_1.Subject();
        this.initialResponseCompleted$ = new rxjs_1.Subject();
        this.connectResponse$ = new rxjs_1.Subject();
        this.connectResult$ = new rxjs_1.Subject();
        this.signResponse$ = new rxjs_1.Subject();
        this.signResult$ = new rxjs_1.Subject();
        this.closeCurrentPromisesSubscription = (0, rxjs_1.timer)(1000, 1000)
            .pipe((0, rxjs_1.takeUntil)(this.closeObservables$))
            .subscribe(() => {
            var _a;
            if ((_a = this.target) === null || _a === void 0 ? void 0 : _a.closed) {
                this.closeCurrentPromises$.next();
            }
        });
        this.onInititalResponseSubscription = this.initialResponse$
            .pipe((0, rxjs_1.takeUntil)(this.closeObservables$))
            .subscribe((ev) => {
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
        this.onConnectResponseSubscription = this.connectResponse$
            .pipe((0, rxjs_1.takeUntil)(this.closeObservables$))
            .subscribe((ev) => {
            if (!this.targetPublicKey) {
                this.connectResult$.next({ success: false, message: 'Wallet encryption public key is not provided, request rejected.' });
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
            const data = JSON.parse(decryptedMessage);
            this.connectResult$.next({ success: true, publicKey: data.publicKey });
        });
        this.onSignResponseSubscription = this.signResponse$
            .pipe((0, rxjs_1.takeUntil)(this.closeObservables$))
            .subscribe((ev) => {
            if (!this.targetPublicKey) {
                this.signResult$.next({ success: false, message: 'Wallet encryption public key is not provided, request rejected.' });
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
            const data = JSON.parse(decryptedMessage);
            this.signResult$.next({ success: true, xdr: data.xdr });
        });
        this.preferredTarget = (params === null || params === void 0 ? void 0 : params.preferredTarget) || 'extension';
        this.walletUrl = (params === null || params === void 0 ? void 0 : params.url) || 'https://wallet.xbull.app/connect';
        const sessionKeypair = tweetnacl_1.box.keyPair();
        const session = (0, tweetnacl_util_1.encodeBase64)((0, tweetnacl_1.randomBytes)(24));
        this.encryptForReceiver = (params) => {
            const oneTimeCode = (0, tweetnacl_1.randomBytes)(24);
            const cipherText = (0, tweetnacl_1.box)((0, tweetnacl_util_1.decodeUTF8)(params.data), oneTimeCode, params.receiverPublicKey, sessionKeypair.secretKey);
            return {
                message: (0, tweetnacl_util_1.encodeBase64)(cipherText),
                oneTimeCode: (0, tweetnacl_util_1.encodeBase64)(oneTimeCode),
            };
        };
        this.decryptFromReceiver = (params) => {
            const decryptedMessage = tweetnacl_1.box.open((0, tweetnacl_util_1.decodeBase64)(params.payload), (0, tweetnacl_util_1.decodeBase64)(params.oneTimeCode), (0, tweetnacl_util_1.decodeBase64)(params.senderPublicKey), sessionKeypair.secretKey);
            if (!decryptedMessage) {
                throw new Error('Decrypted message is null');
            }
            return (0, tweetnacl_util_1.encodeUTF8)(decryptedMessage);
        };
        this.publicKey = () => sessionKeypair.publicKey;
        this.session = () => session.slice();
        const listener = (ev) => {
            switch (ev.data.type) {
                case interfaces_1.EventType.XBULL_INITIAL_RESPONSE:
                    this.initialResponse$.next(ev);
                    break;
                case interfaces_1.EventType.XBULL_CONNECT_RESPONSE:
                    this.connectResponse$.next(ev);
                    break;
                case interfaces_1.EventType.XBULL_SIGN_RESPONSE:
                    this.signResponse$.next(ev);
                    break;
            }
        };
        window.addEventListener('message', listener);
        this.closeObservables$.asObservable()
            .pipe((0, rxjs_1.take)(1))
            .subscribe(() => {
            window.removeEventListener('message', listener);
        });
    }
    openWallet() {
        if (!!this.target && !this.target.closed) {
            this.target.close();
            this.target = null;
            this.closeCurrentPromises$.next();
        }
        this.target = window.open(`${this.walletUrl}?public=${encodeURIComponent((0, tweetnacl_util_1.encodeBase64)(this.publicKey()))}&session=${encodeURIComponent(this.session())}`, 'xBull_Wallet_app', 'width=380,height=640,left=100,top=100');
        return (0, rxjs_1.firstValueFrom)(this.initialResponseCompleted$
            .pipe((0, rxjs_1.takeUntil)(this.closeCurrentPromises$))
            .pipe((0, rxjs_1.takeUntil)(this.closeObservables$)));
    }
    closeWallet() {
        var _a;
        if (!!this.target) {
            (_a = this.target) === null || _a === void 0 ? void 0 : _a.close();
            this.target = null;
        }
    }
    connect(params = { canRequestPublicKey: true, canRequestSign: true }) {
        return __awaiter(this, void 0, void 0, function* () {
            const extensionSdk = window.xBullSDK;
            if (!!extensionSdk && this.preferredTarget === 'extension') {
                yield extensionSdk.connect(params);
                return extensionSdk.getPublicKey();
            }
            else {
                yield this.openWallet();
                if (!this.target || !this.targetPublicKey) {
                    throw new Error(`xBull Wallet is not open, we can't connect with it`);
                }
                const { message, oneTimeCode } = this.encryptForReceiver({
                    data: JSON.stringify(params),
                    receiverPublicKey: (0, tweetnacl_util_1.decodeBase64)(this.targetPublicKey),
                });
                const payload = {
                    type: interfaces_1.EventType.XBULL_CONNECT,
                    message,
                    oneTimeCode,
                };
                this.target.postMessage(payload, '*');
                const result = this.connectResult$
                    .asObservable()
                    .pipe((0, rxjs_1.switchMap)(result => {
                    if (!result.success) {
                        this.closeWallet();
                        return (0, rxjs_1.throwError)(() => new Error(result.message));
                    }
                    else {
                        this.closeWallet();
                        return (0, rxjs_1.of)(result.publicKey);
                    }
                }))
                    .pipe((0, rxjs_1.take)(1))
                    .pipe((0, rxjs_1.takeUntil)(this.closeCurrentPromises$))
                    .pipe((0, rxjs_1.takeUntil)(this.closeObservables$));
                return (0, rxjs_1.firstValueFrom)(result);
            }
        });
    }
    sign(params) {
        return __awaiter(this, void 0, void 0, function* () {
            const extensionSdk = window.xBullSDK;
            if (!!extensionSdk && this.preferredTarget === 'extension') {
                const { xdr } = params, rest = __rest(params, ["xdr"]);
                return extensionSdk.signXDR(xdr, rest);
            }
            else {
                yield this.openWallet();
                if (!this.target || !this.targetPublicKey) {
                    throw new Error(`xBull Wallet is not open, we can't connect with it`);
                }
                if (typeof params.xdr !== 'string') {
                    throw new Error('XDR provided needs to be a string value');
                }
                const { message, oneTimeCode } = this.encryptForReceiver({
                    data: JSON.stringify(params),
                    receiverPublicKey: (0, tweetnacl_util_1.decodeBase64)(this.targetPublicKey),
                });
                const payload = {
                    type: interfaces_1.EventType.XBULL_SIGN,
                    message,
                    oneTimeCode,
                };
                this.target.postMessage(payload, '*');
                const result = this.signResult$
                    .asObservable()
                    .pipe((0, rxjs_1.switchMap)(result => {
                    if (!result.success) {
                        this.closeWallet();
                        return (0, rxjs_1.throwError)(() => new Error(result.message));
                    }
                    else {
                        this.closeWallet();
                        return (0, rxjs_1.of)(result.xdr);
                    }
                }))
                    .pipe((0, rxjs_1.take)(1))
                    .pipe((0, rxjs_1.takeUntil)(this.closeCurrentPromises$))
                    .pipe((0, rxjs_1.takeUntil)(this.closeObservables$));
                return (0, rxjs_1.firstValueFrom)(result);
            }
        });
    }
    closeConnections() {
        this.closeObservables$.next();
        this.closeCurrentPromises$.next();
        this.closeObservables$.complete();
        this.closeCurrentPromises$.complete();
    }
}
exports.xBullWalletConnect = xBullWalletConnect;
//# sourceMappingURL=index.js.map