# xBull Wallet Connect

This library allows you to connect your site with xBull Wallet in a quick and easy way, this library connects with both extension and website versions.

## Installation

```shell
npm i --save @creit-tech/xbull-wallet-connect
```

Install the latest version available in our repo, we use Github instead of NPM because this way you can check the code before intalling it which in our view is safer.

> We recommend you using version tags when installing the library, this way you have control when doing an `npm i`

## The xBullWalletConnect Class

Yes, we know most people recommend that Classes start with capital case... First you need to create a new instance of the class by doing:
```typescript
const bridge = new xBullWalletConnect();
```

This will generate an object with internal events handlers and keys needed to talk with the xBull Wallet. It's better if you create a new bridge for each connection, each time the bridge is created it has a new keypair and session id, this helps in avoiding receiving messages from unwanted parties.

> NOTE: Each time you create a new bridge, we set observables and events handlers for the instance so is important you close them after you have used the bridge. More about this at the end of this guide

The `xBullWalletConnect` constructor accepts an **optional** object where you can specify the options for this instance:
```typescript

interface ISDKConstructor {
  url?: string;
  preferredTarget?: 'extension' | 'website'; // Default is extension
}
``` 

## Connect with xBull Wallet
```typescript
const publicKey = await bridge.connect();
```

This method will check if the extension is available in the browser, if is not it will automatically launch the webapp version so the user can share the public key.

## Sign a transaction
```typescript
const signedXDR = await bridge.sign({
  xdr: "XDR_TO_SIGN"
});
```

This method will launch the wallet and request the user to sign the transaction, after it's confirmed it will return a string which is the signed XDR. If you want you can specify which user and network should be used to sign the transaction:
```typescript
interface ISignParams {
  xdr: string;
  publicKey?: string;
  network?: string;
}
```

> NOTE: When specifying the account or the network, both values must be supplied.

## Close the connection

Once you have completed interacting with the wallet, you should close the connection by doing this:
```typescript
bridge.closeConnections();
```

If we don't do this the next time we create a new bridge we could have unexpected behaviour because old listener will still be in memory.



## License
![](https://img.shields.io/badge/License-AGPLv3-lightgrey)

xBull Wallet's name is Creit Tech's property. The code of this application is public and should always be public, any kind of modification and distribution of this software must follow the instructions in the `LICENSE.md` file and the statement before.

    xBull Wallet Connect is a software to interact with the Open Source Stellar Wallet: xBull Wallet
    Copyright (C) 2021 Creit Tech

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU Affero General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU Affero General Public License for more details.

    You should have received a copy of the GNU Affero General Public License
    along with this program.  If not, see <https://www.gnu.org/licenses/>.
