const axios = require('axios');
const _moment = require('moment');
const _ = require('lodash');
const crypto = require('crypto');

class UMeng {
  constructor(options = {}) {
    this.options = {
      ...options,
      appKey : options.appKey || '',
      appMasterSecret : options.appMasterSecret || '',
      appPkgName : options.appPkgName || '',
      pushUrl : options.pushUrl || 'https://msgapi.umeng.com/api/send',
      queryStatusUrl: options.queryStatusUrl || 'https://msgapi.umeng.com/api/status?sign=mysign',
      maxLength : options.maxLength || 500,
      method: 'POST',
    };
  }

  async sleep(time) {
    return new Promise((reslove) => {
      setTimeout(() => {
        reslove();
      }, time);
    });
  }

  getSign(postData) {
    let  app_master_secret = this.options.appMasterSecret;
    let  method = this.options.method;
    let  url =  this.options.pushUrl;
    let  post_body = JSON.stringify(postData);

    let sign = UMeng.md5(method+url+post_body+app_master_secret);
    return sign;
  }

  static md5(data) {
    return crypto.createHash('md5').update(data, 'utf8').digest('hex');
  }

  /**
   * @desc push
   * @param {object} data {title, content, list, success, error}
   */
  async push(data) {
    let list = data.list;
    if( list <= 1 ) {
      return false;
    }
    let title = data.title,
      content = data.content,
      success = data.success || noop,
      error = data.error || noop,
      finish = data.finish || noop,
      icon = data.icon,
      sleep = data.sleep || 0;
    // 剔除SDK公用参数.
    delete data.title;
    delete data.content;
    delete data.list;
    delete data.success;
    delete data.error;
    delete data.icon;
    delete data.sleep;
    delete data.finish;
    
    let n = 0;
    const deviceList = this.getBathList(list);
    // 消息 具体消息内容(Android最大为1840B)
    const payload =   {
      'display_type': 'notification',
      'body': {
        'ticker': data.ticker || title,
        'title': title,
        'text': content,
        'icon': icon,
        'after_open':'go_app'
      }
    };
    for (const i in deviceList) {
      let params = _.merge({
        'appkey': this.options.appKey,
        'timestamp': Date.now(),
        'type': 'listcast',
        'device_tokens': deviceList[i].join(','), // 不能超过500个，多个device_token用英文逗号分隔
        'payload': payload,
        'policy': {
          'expire_time': _moment((Date.now()) + 86400000).format('YYYY-MM-DD HH:mm:ss'),
        },
        'description': '',
      }, data);

      axios({
        url: this.options.pushUrl + `?sign=${this.getSign(params)}`,
        method: this.options.method,
        contentType: 'application/json',
        data: params,
        responseType: 'json',
      })
        .then((res)=>{
          n++;
          success(res);
          if (n == deviceList.length) {
            finish({
              status: 'success',
              maxLength: this.options.maxLength,
              group: deviceList.length
            });
          }
        })
        .catch((err) => {
          n++;
          error(err);
          if (n == deviceList.length) {
            finish({
              status: 'success',
              maxLength: this.options.maxLength,
              group: deviceList.length
            });
          }
        });

      if(sleep > 0 && n+1 < deviceList.length) {
        await this.sleep(sleep);
      }
    }
  }

  // queryPushStatus(data) {
  //   let success = data.success || noop,
  //     error = data.error || noop;
  //   let params = _.merge({
  //     'appkey': this.options.appKey,
  //     'timestamp': Date.now(),
  //     'task_id': data.taskId,
  //   });
  //   axios({
  //     url: this.options.queryStatusUrl + `?sign=${this.getSign(params)}`,
  //     method: this.options.method,
  //     contentType: 'application/json',
  //     data: params,
  //     responseType: 'json',
  //   })
  //     .then((res)=>{
  //       success(res);
  //     })
  //     .catch((err) => {
  //       error(err);
  //     });
  // }

  // 分批设备列表
  getBathList(list) {
    let deviceList= [];
    while ( list.length > 0) {
      deviceList.push(list.splice(0, this.options.maxLength));
    }
    return deviceList;
  }
}

function noop(){}

module.exports = UMeng;