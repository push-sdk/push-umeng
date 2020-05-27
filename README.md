# push-umeng

> 友盟推送Node服务

根据友盟提供的推送服务实现的 Node 版SDK。支持友盟通知栏推送功能，欢迎大家使用。


[小米推送](https://www.npmjs.com/package/push-xiaomi)

[魅族推送](https://www.npmjs.com/package/push-meizu)

[华为推送](https://www.npmjs.com/package/push-huawei)

[oppo推送](https://www.npmjs.com/package/push-oppo)

[iOS推送](https://www.npmjs.com/package/push-ios)

#
```
npm install push-umeng --save-dev
```

## 实例
```javascript
const UMeng = require('push-umeng');
const umeng = new UMeng({
  appKey: 'appKey',
  appMasterSecret: 'appMasterSecret',
});

// 文件推送
umeng.push({
  title: '标题',
  content: '内容',
  list: ['device_token'], 
  success(response){}, // 成功回调
  fail(error){} // 失败回调
});

// 列播推送
umeng.pushList({
  title: '标题',
  content: '内容',
  list: ['device_token'], 
  success(response){}, // 成功回调
  fail(error){} // 失败回调
});

// 单播推送
umeng.pushSingle({
  title: '标题',
  content: '内容',
  device_token: 'device_token', 
  success(response){}, // 成功回调
  fail(error){} // 失败回调
});
```

## new UMeng()

| key | value |
|:----|:----|
|appKey| 必填： 友盟后台中取得|
|appMasterSecret|必填： 友盟后台中取得|
|pushUrl|推送URL 默认 https://msgapi.umeng.com/api/send |
|maxLength| push推送限制长度（此为文件播限制长度）默认50000 |
|pushListMaxLength| pushList推送限制长度（此为列播限制长度）默认500 |

## 方法

### push() 参数（通用）
> 此为文件播，可用 <a href="#method_queryPushStatus>queryPushStatus</a>查询消息状态

| key | desc | 备注 |
|:----|:----|:----|
|title|标题| |
|content|内容| |
|list|设备列表| |
|success(response){}|单次推送成功处理| response为友盟接口返回信息 |
|fail(error){}|单次推送失败处理| |
|finish(data){}|所有推送完成（成功/失败）| data参数<a href="#push_finish_data">详见</a> |
|sleep|推送间隔时间| |

> 因友盟任务类型消息才能查询消息状态，为满足可以推送自定义设备且查询推送消息状态，因此使用文件播方式推送。

#### <a name="push_finish_data">finish(data) 回调数据</a>
```
{
  status: 'success',
  maxLength,
  group,
  success_total,
  fail_total,
  taskIdList, // 仅push方法有此数据
}
```

### push 友盟更多参数
```
{
    ...
    "payload": {    // 必填，JSON格式，具体消息内容(Android最大为1840B)
        "display_type":"xx",    // 必填，消息类型: notification(通知)、message(消息)
        "body": {    // 必填，消息体。
                // 当display_type=message时，body的内容只需填写custom字段。
                // 当display_type=notification时，body包含如下参数:
            // 通知展现内容:
            "ticker":"xx",    // 必填，通知栏提示文字
            "title":"xx",    // 必填，通知标题
            "text":"xx",    // 必填，通知文字描述 

            // 自定义通知图标:
            "icon":"xx",    // 可选，状态栏图标ID，R.drawable.[smallIcon]，
            // 如果没有，默认使用应用图标。
            // 图片要求为24*24dp的图标，或24*24px放在drawable-mdpi下。
            // 注意四周各留1个dp的空白像素
            "largeIcon":"xx",    // 可选，通知栏拉开后左侧图标ID，R.drawable.[largeIcon]，
            // 图片要求为64*64dp的图标，
            // 可设计一张64*64px放在drawable-mdpi下，
            // 注意图片四周留空，不至于显示太拥挤
            "img": "xx",    // 可选，通知栏大图标的URL链接。该字段的优先级大于largeIcon。
                            // 该字段要求以http或者https开头。

            // 自定义通知声音:
            "sound": "xx",    // 可选，通知声音，R.raw.[sound]。
                            // 如果该字段为空，采用SDK默认的声音，即res/raw/下的
                            // umeng_push_notification_default_sound声音文件。如果
                            // SDK默认声音文件不存在，则使用系统默认Notification提示音。

            // 自定义通知样式:
            "builder_id": xx,    // 可选，默认为0，用于标识该通知采用的样式。使用该参数时，
                                // 开发者必须在SDK里面实现自定义通知栏样式。

            // 通知到达设备后的提醒方式，注意，"true/false"为字符串
            "play_vibrate":"true/false",    // 可选，收到通知是否震动，默认为"true"
            "play_lights":"true/false",        // 可选，收到通知是否闪灯，默认为"true"
            "play_sound":"true/false",        // 可选，收到通知是否发出声音，默认为"true"

            // 点击"通知"的后续行为，默认为打开app。
            "after_open": "xx",    // 可选，默认为"go_app"，值可以为:
                                //   "go_app": 打开应用
                                //   "go_url": 跳转到URL
                                //   "go_activity": 打开特定的activity
                                //   "go_custom": 用户自定义内容。
            "url": "xx",    // 当after_open=go_url时，必填。
                            // 通知栏点击后跳转的URL，要求以http或者https开头
            "activity":"xx",    // 当after_open=go_activity时，必填。
                                // 通知栏点击后打开的Activity
            "custom":"xx"/{}    // 当display_type=message时, 必填
                                // 当display_type=notification且
                                // after_open=go_custom时，必填
                                // 用户自定义内容，可以为字符串或者JSON格式。
        },
        extra:{    // 可选，JSON格式，用户自定义key-value。只对"通知"
                // (display_type=notification)生效。
                // 可以配合通知到达后，打开App/URL/Activity使用。
            "key1": "value1",
            "key2": "value2",
            ...
        }
    },
    "policy":{    // 可选，发送策略
        "start_time":"xx",    // 可选，定时发送时，若不填写表示立即发送。
                            // 定时发送时间不能小于当前时间
                            // 格式: "yyyy-MM-dd HH:mm:ss"。 
                            // 注意，start_time只对任务类消息生效。
        "expire_time":"xx",    // 可选，消息过期时间，其值不可小于发送时间或者
                            // start_time(如果填写了的话)，
                            // 如果不填写此参数，默认为3天后过期。格式同start_time
        "max_send_num": xx,    // 可选，发送限速，每秒发送的最大条数。最小值1000
                            // 开发者发送的消息如果有请求自己服务器的资源，可以考虑此参数。
        "out_biz_no": "xx"    // 可选，开发者对消息的唯一标识，服务器会根据这个标识避免重复发送。
                            // 有些情况下（例如网络异常）开发者可能会重复调用API导致
                            // 消息多次下发到客户端。如果需要处理这种情况，可以考虑此参数。
                            // 注意, out_biz_no只对任务类消息生效。
    },
    "production_mode":"true/false",    // 可选，正式/测试模式。默认为true
                                    // 测试模式只会将消息发给测试设备。测试设备需要到web上添加。
                                    // Android: 测试设备属于正式设备的一个子集。
    "description": "xx",    // 可选，发送消息描述，建议填写。  
    //系统弹窗，只有display_type=notification生效
    "mipush": "true/false",    // 可选，默认为false。当为true时，表示MIUI、EMUI、Flyme系统设备离线转为系统下发
    "mi_activity": "xx",    // 可选，mipush值为true时生效，表示走系统通道时打开指定页面acitivity的完整包路径。
}
```

### pushList 列播

| key | desc | 备注 |
|:----|:----|:----|
|title|标题| |
|content|内容| |
|list|设备列表| |
|success(response){}|单次推送成功处理| response为友盟接口返回信息 |
|fail(error){}|单次推送失败处理| |
|finish(data){}|所有推送完成（成功|失败）| data参数<a href="#push_finish_data">详见</a> |
|sleep|推送间隔时间| |

> 因为友盟列播api最大支持500台机器推送，如果 list 长度超过500，则内部会发起 _.chunk(n / 500) 条请求, 同时也会有 _.chunk(n / 500) 条回调。
> 在new UMeng时pushListMaxLength设置长度上线。


### <a name="method_queryPushStatus">queryPushStatus</a> 

查询push的消息状态，友盟仅任务类型推送(文件播)可查询消息状态。

| key | desc | 备注 |
|:----|:----|:----|
|taskId| 查询id（在push中返回）| String or Array |
|success(response){}|单次查询成功处理| response为友盟接口返回信息 |
|fail(error){}|单次查询失败处理| |
|finish(data){}| 全部查询完成处理| |


当taskId未Array时，finish()中回调参数如下：

| key | desc | 备注 |
|:----|:----|:----|
|success_total| 查询成功总数 |  |
|fail_total| 查询失败总数|  |
|successResList| 查询成功的res列表 | Array[res] |
|failIdList| 查询失败的taskd列表 | Array[String]  |



[友盟U-PUSH API官方文档](https://developer.umeng.com/docs/66632/detail/68343)