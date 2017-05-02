# Federation Protocol

The Stellar federation protocol is a way for Stellar client software to resolve email-like addresses such as name*yourdomain.com. 

However, stellar.toml can do more than expected. We have also support DEPOSIT_SERVER proposal in our desktop client. You can check the reference below.

We also support some new features which can create a dynamic interface for user to transfer their assets.

## Reference

* [Federation Protocol](https://www.stellar.org/developers/learn/concepts/federation.html)

* [DEPOSIT_SERVER proposal](https://gist.github.com/manran/207abf1c45d835ddc1ecf172636b504f)

## New fields in the response

* extra_fields 

* assets

```js
{
	"extra_fields" : []
	"assets" : []
}
```

