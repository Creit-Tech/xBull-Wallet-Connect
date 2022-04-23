import { xBullConnect } from '../src';

window.onload = function() {
  console.log('test html loaded')
  const connection = new xBullConnect({ url: 'http://localhost:4200/connect' });

  const publicKeyInput = document.querySelector('#publicKey');
  if (!publicKeyInput) {
    return;
  }

  document.querySelector('#actionButton')?.addEventListener('click', async () => {
    console.log('test button clicked')
    const pk = await connection.connect({
      canRequestPublicKey: true,
      canRequestSign: true,
    });

    publicKeyInput.setAttribute('value', pk);
  });
}