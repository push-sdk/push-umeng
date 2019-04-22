# push-umeng

> 友盟推送Node服务

根据友盟提供的推送服务实现的 Node 版SDK。支持友盟通知栏推送功能，欢迎大家使用。


[小米推送](https://www.npmjs.com/package/push-xiaomi)

[魅族推送](https://www.npmjs.com/package/push-meizu)

[华为推送](https://www.npmjs.com/package/push-huawei)

#
```
npm install push-umeng --save-dev
```

## 实例
```javascript
const UMeng = require('push-umeng');
const umeng = new UMeng({
  appId: 'appId',
  appSecret: 'appSecret',
  appPkgName: '应用包名'
});

umeng.push({
  title: '标题',
  content: '内容',
  list: ['pushId'], 
  success(res){}, // 成功回调
  error(err){} // 失败回调
});
```

> 因为友盟api最多支持500台机器推送，如果 list 长度超过500，则内部会发起 Math.ceil(n / 500) 条请求, 同时也会有 Math.ceil(n / 500) 条回调。

## 参数

| key | value |
|:----|:----|
|appId|appID|
|$appSecret|appSecret|
|appPkgName|应用包名|
|pushUrl|推送URL 默认 https://api.push.hicloud.com/pushsend.do|
|grant_type|友盟接口参数 默认 'grant_type'|
|maxLength|友盟推送限制长度 默认500|
|title|标题|
|content|内容|
|list|设备列表|

[友盟U-PUSH API官方文档](https://developer.umeng.com/docs/66632/detail/68343)