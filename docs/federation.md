# Federation Protocol

The Stellar federation protocol is a way for Stellar client software to resolve email-like addresses such as name*yourdomain.com. 

However, stellar.toml can do more than expected. We have also support DEPOSIT_SERVER proposal in our desktop client. You can check the reference below.

We also support some new features which can create a dynamic interface for user to transfer their assets.

## Reference

* [Federation Protocol](https://www.stellar.org/developers/learn/concepts/federation.html)

* [DEPOSIT_SERVER proposal](https://gist.github.com/manran/207abf1c45d835ddc1ecf172636b504f)

## New quote type when request

If the response return the extra_fields as below, user could see a dynamic form. After user fill the form, the quote type request should be fired.

The request should contains the account_id, address and the extra_fields value. The quote response should return a send fields as below. 

## New fields in the response

* extra_fields, an array contains the components which could be used to create a dynamic form.

* assets, an array contains which asset could be sent.

* send, an array contains which asset should be sent.

## Example

### Step 1, stand response with extra_fields and assets.

Request:

```
type=name&q=alipay*ripplefox.com
```

Response:

```js
{
	"account_id":"alipay",
	"assets":[{
		"code":"CNY",
		"issuer":"GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX"
	}],
	"extra_fields":[{
		"type":"label",
		"label":"支付宝提现12小时内以账",
		"hint":"We will credit your account in 12 hours."
	},{
		"type":"text",
		"name":"alipayAccount",
		"label":"支付宝账号 (手续费0.3%，至少2元)",
		"hint":"Alipay account(Fee: 0.3%, 5CNY at least)",
		"required":true
	},{
		"type":"text",
		"name":"alipayUser",
		"label":"真实姓名",
		"hint":"The real name of the alipay account",
		"required":true
	},{
		"type":"text",
		"name":"email",
		"label":"电子邮箱 (重要！用于接收凭证和问题处理)",
		"hint":"Your Email. Please contact support@ripplefox.com if you have any queries.","required":true
	}]
}
```

### Step 2, quote response with send

 Request:

```
type=quote
&account_id=alipay
&address=GCCZTDAVNXOGESPKQSH5U63LO6CLPF2VUYV7ESO2UHVJ454A47F57LXQ
&asset_code=CNY&asset_issuer=GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX
&alipayAccount=alice@stellar.org&alipayUser=Jed&email=alice@stellar.org
&amount=1
 ```
 
 Response:

```js
{
	"stellar_address":"alipay*ripplefox.com",
	"account_id":"GAAQVUICYDKE3GIQIEF7WFFJ2SQ2DQWBQ7PM4NXYGPFTCJ4N3P465CNY",
	"memo_type":"text",
	"memo":"50144586A194052",
	"send":[{
		"amount":3,
		"code":"CNY",
		"issuer":"GAREELUB43IRHWEASCFBLKHURCGMHE5IF6XSE7EXDLACYHGRHM43RFOX"
	}]
}
 ```
 