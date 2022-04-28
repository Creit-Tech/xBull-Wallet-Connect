import { xBullWalletConnect } from '../src';

window.onload = function() {
  console.log('test html loaded')
  const connection = new xBullWalletConnect({ url: 'https://wallet.xbull.app/connect', preferredTarget: 'website' });

  const publicKeyInput = document.querySelector('#publicKey');
  if (!publicKeyInput) {
    return;
  }

  document.querySelector('#actionButton')?.addEventListener('click', async () => {
    console.log('Connect button clicked');
    const pk = await connection.connect({
      canRequestPublicKey: true,
      canRequestSign: true,
    });

    publicKeyInput.setAttribute('value', pk);
  });

  document.querySelector('#signButton')?.addEventListener('click', async () => {
    console.log('Sign button clicked')

    const xdr = (document.querySelector('#xdrToSign') as HTMLInputElement)?.value

    if (!xdr) {
      return;
    }

    const signedXdr = await connection.sign({ xdr });
    console.log(signedXdr);
  });

  document.querySelector('#closeButton')?.addEventListener('click', async () => {
    console.log('Close button clicked');

    connection.closeConnections();
  });
}