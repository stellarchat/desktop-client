[![Travis CI status](https://www.travis-ci.org/stellarchat/desktop-client.svg?branch=master)](https://travis-ci.org/stellarchat/desktop-client)

# RippleFox team is now developing the new version of Foxlet.

Please use the new repository to download the Foxlet client. 

https://github.com/ripplefox/stellarwallet

RippleFox now maintain the both Foxlet client for Stellar and Ripple.

# Foxlet Wallet (A Desktop Client for Stellar)

Foxlet allows you to encrypt your secret key and store it as a file locally on your computer. You can use it on Windows, Linux and Mac.

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
- Contacts support.
- Deposit/withdraw CNY, BTC.
- Participate ICO

## Build yourself

You have to have 8.x.x Node.js installed (latest 8.11.3 recommended). For that you can use either [n](https://www.npmjs.com/package/n) or [nvm](https://github.com/creationix/nvm/blob/master/README.md).

Also, [yarn](https://yarnpkg.com/) is recommended over [npm](https://www.npmjs.com/) due it's strict lockfile and other features.

To build yourself, do the following

```sh
yarn install
yarn build
# Or only one package with "build:linux", "build:mac" or "build:win".
```


## Development

```sh
yarn install
yarn start
# ... do stuff ...
yarn lintfix
```

Foxlet Wallet uses [Electron](http://electronjs.org/) to create an application. Common shortcuts and tips:
- CTRL+SHIFT+I to open development console
- reload UI with CTRL+R to refresh front-end code
- restart `yarn start` process to refresh back-end code

## Ledger

If you have permission problems on Linux, this may help:
```sh
echo 'KERNEL=="hidraw*", SUBSYSTEM=="hidraw", MODE="0664", GROUP="plugdev"' | sudo tee /etc/udev/rules.d/99-hidraw-permissions.rules
```

If you have more problems, make sure that:
1. Ledger is connected.
2. Ledger is unlocked.
3. Ledger has Stellar app installed.
4. Ledger currently is in the Stellar app.
5. Ledger Stellar app settings has "browser support" set to "No".

## Electron version download

[https://github.com/stellarchat/desktop-client/issues/274#issuecomment-406983778](https://github.com/stellarchat/desktop-client/issues/274#issuecomment-406983778)

# Foxlet恒星钱包 🚀

Foxlet钱包也称为恒星桌面钱包或恒星离线钱包。它是一个注重安全的，功能完备的恒星客户端。

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
- 支持设置联系人和[fed.network](https://fed.network/)名称服务，可通过~短号发送资产给朋友。
- 支持恒星ICO活动。

## 说明

目前有两个分支master和nwjs，master已经迁移到了electron，nwjs分支依然用的是nwjs框架。release发布的版本主要是基于nwjs分支，相对来说功能更精减。electron版本添加了对ledger硬件钱包的支持，目前提供由社区的人编译的[下载](https://github.com/stellarchat/desktop-client/issues/274#issuecomment-406983778)。

## 编译

推荐安装8.x版本Node.js。推荐使用node的版本管理工具[n](https://www.npmjs.com/package/n)或[nvm](https://github.com/creationix/nvm/blob/master/README.md)。

另外，我们建议使用更先进的[yarn](https://yarnpkg.com/)而不是 [npm](https://www.npmjs.com/)来进行开发。

请用以下命令进行编译：

```sh
yarn install
yarn build
# Or only one package with "build:linux", "build:mac" or "build:win".
```

## 开发和调试

```sh
yarn install
yarn start
# ... do stuff ...
yarn lintfix
```

Foxlet恒星钱包的master分支是基于[Electron](http://electronjs.org/)。常用的快捷键和使用技巧如下：
- CTRL+SHIFT+I 显示开发控制台
- CTRL+R 重载UI和刷新前端代码
- 重新运行`yarn start`来刷新后端代码
