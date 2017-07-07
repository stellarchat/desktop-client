# Stellar-desktop

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
- You need to create a softlink under the src folder. You can run `ln -s ../node_modules ./node_modules`. In windows, you can run `mklink /d d:\ProjectName\src\node_modules d:\ProjectName\node_modules`
- Run `nw src` or Run `node build-nw.js`


# 恒星离线钱包 🚀

- 密钥以加密文件存在本地，交易本地签名。密钥不上线，安全可靠。
- 支持授信和发行资产。
- 支持发送、兑换、交易功能。在恒星中任意资产均可两两交易。
- 全面支持联邦协议。通过联邦协议可提现到比特币、银行。
- 集成锚点充提服务，在钱包里即可完成充值、提现。
- 支持[fed.network](https://fed.network/)名称服务，可通过~短号发送资产给朋友。
- 可设置恒星通胀地址，帮助自己或他人得到利息。
- 语言支持中英文 :gb:  :cn:。

## 为什么需要这个钱包？

- 官方一直不推出好用的钱包，所以让我们自己创造一个。
- 目前各渠道的钱包不太好用，而且基本没中文，广大中国人民很不满。
- 很多人注重安全。离线钱包密钥加密存电脑，本地签名后提交易，不能更安全了。

## 参考

- 文件加解密参考了 [ripple desktop client](https://github.com/ripple/ripple-client-desktop)。
- 有一些界面参考了 [stellarterm](https://github.com/stellarterm)，不过我们也就用了一些纯前端的HTML和CSS。
- 我们使用 [nwjs](https://nwjs.io) 来创建钱包。业务逻辑都是自己写的，安全第一。

## 运行

- 安装各种依赖包 `npm install`
- 你还要建一个文件夹的软链接，这样src文件夹也能看到外面的node_modules。 在src下面跑一下 `ln -s ../node_modules ./node_modules`。如果在windows上，运行 `mklink /d d:\ProjectName\src\node_modules d:\ProjectName\node_modules`
- 开发可以在安装好nwjs后运行 `nw src`，编译就直接跑  `node build-nw.js`