#Stellar-desktop

## Why we need the desktop client?

- Many people do not like to use other clients, they only trust official client.
- The official client account-viewer is not friendly use. And it does not support Chinese language.
- Keep secret key local can make it safe.

## Reference

- The file encrypt/decrypt part can refer the [ripple desktop client](https://github.com/ripple/ripple-client-desktop).
- Some page layout we refer [stellarterm](https://github.com/stellarterm), it is a good web client. We only refer some HTML and CSS.
- We use [nwjs](https://nwjs.io) to create the client. All stellar relate logic is written by our own.

## build

- Run `npm install`
- You need to create a softlink under the src folder. On windows, you can run `ln -s ../node_modules ./node_modules`
- Run `nw src` or Run `node build-nw.js`
