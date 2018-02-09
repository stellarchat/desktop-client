[![Travis CI status](https://www.travis-ci.org/stellarchat/desktop-client.svg?branch=master)](https://travis-ci.org/stellarchat/desktop-client)

# Stellar Desktop Client

The desktop client allows you to encrypt your secret key and store it as a file locally on your computer. You can use it on Windows, Linux and Mac.

## Key Features

- No registration. Secret key and login information stored locally.
- Offline transaction signing. Protect the secret key from exposure to the Internet.
- Send/receive/convert lumens, assets and tokens.
- Buy/sell lumens, assets and tokens.
- Merge account.
- Create your own tokens.
- View balances and history.
- Manage trust lines, account data, inflation destination.
- Federation protocol support.
- Deposit/withdraw CNY, BTC.
- Participate ICO

## Build

You should have Node.js (4.8.x recommended) installed. If not, install it ([Node version manager](https://github.com/creationix/nvm) is recommended).

You need to install [nwjs](https://nwjs.io) if you want to do development.  

- Run `npm install`
- You need to create a softlink under the src folder, so it can find the node_modules files. You can run `ln -s ../node_modules ./src/node_modules`. In windows, you can run `mklink /d d:\ProjectName\src\node_modules d:\ProjectName\node_modules`
- Run `nw src` to develop or run `node build-nw.js` to build


# 恒星桌面钱包 🚀

恒星桌面钱包也称为恒星离线钱包。它是一个注重安全的，功能完备的恒星客户端。

## 主要功能

- 无需注册，密钥以加密文件存在本地。
- 交易本地签名。密钥不会暴露到因特网。
- 支持发送、兑换任意资产。
- 支持交易任意资产。（恒星中任意资产均可两两交易）。
- 支持合并账号。
- 支持创建新资产。
- 查询资产和历史记录。
- 管理授信、账户数据；可设置恒星通胀地址，帮助自己或他人得到利息。
- 全面支持联邦协议。通过联邦协议可提现到比特币、银行。
- 集成锚点充提服务，在钱包里即可完成充值、提现。
- 支持[fed.network](https://fed.network/)名称服务，可通过~短号发送资产给朋友。
- 支持恒星ICO活动。

## 为什么需要这个钱包？

- 官方一直不推出好用的钱包，所以让我们自己创造一个。
- 目前各渠道的钱包不太好用，而且基本没中文，广大中国人民很不满。
- 很多人注重安全。离线钱包密钥加密存电脑，本地签名后提交易，不能更安全了。

## 参考

- 文件加解密参考了 [ripple desktop client](https://github.com/ripple/ripple-client-desktop)。
- 有一些界面参考了 [stellarterm](https://github.com/stellarterm)，不过我们也就用了一些纯前端的HTML和CSS。
- 我们使用 [nwjs](https://nwjs.io) 来创建钱包。业务逻辑都是自己写的，安全第一。

## 开发和运行

Node.js是必须的(建议4.8.x)。没有安装的话，推荐使用[Node version manager](https://github.com/creationix/nvm)。

要在本地开发还需要安装[nwjs](https://nwjs.io)，装SDK版本。 

- 安装各种依赖包 `npm install`
- 你还要建一个文件夹的软链接，这样src文件夹也能看到外面的node_modules。 跑一下 `ln -s ../node_modules ./src/node_modules`。如果在windows上，运行 `mklink /d d:\ProjectName\src\node_modules d:\ProjectName\node_modules`
- 开发运行 `nw src`，编译运行  `node build-nw.js`