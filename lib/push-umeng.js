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
      maxLength : options.maxLength || 500,
      pushUrl : options.pushUrl || 'https://msgapi.umeng.com/api/send',
      queryStatusUrl: options.queryStatusUrl || 'https://msgapi.umeng.com/api/status',
      uploadUrl: options.uploadUrl || 'https://msgapi.umeng.com/upload',
      method: 'POST',
    };
  }

  static md5(val) {
    return crypto.createHash('md5').update(val, 'utf8').digest('hex');
  }

  static createFile(list) {
    let splitStr = '\n';
    let str = list.join(splitStr);
    return str;
  }
  
  async sleep(time) {
    return new Promise((reslove) => {
      setTimeout(() => {
        reslove();
      }, time);
    });
  }

  getSign(postData, url) {
    let  app_master_secret = this.options.appMasterSecret;
    let  method = this.options.method;
    let  post_body = JSON.stringify(postData);
    let sign = UMeng.md5(method+url+post_body+app_master_secret);
    // console.log('md5前：', method+url+post_body+app_master_secret);
    // console.log('md5后', sign);
    return sign;
  }

  // 分批设备列表
  getBathList(list) {
    return  _.chunk(list, this.options.maxLength);
  }
  
  /**
   * @desc 
   * @param {Object} {} 
   */
  async push(data) {
    let list = data.list;

    if( !Array.isArray(list) || list.length < 1 ) {
      console.warn('list 必填');
      return false;
    }

    let title = data.title,
      content = data.content,
      success = data.success || noop,
      fail = data.fail || noop,
      finish = data.finish || noop,
      icon = data.icon,
      sleep = data.sleep || 0;
    // 剔除SDK公用参数.
    delete data.title;
    delete data.content;
    delete data.list;
    delete data.success;
    delete data.fail;
    delete data.icon;
    delete data.sleep;
    delete data.finish;
    
    let num = 0,
      successNum = 0,
      failNum = 0,
      taskIdList =[];
    const deviceList = this.getBathList(list);
    // 消息 具体消息内容(Android最大为1840B)
    const payload = {
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
      try {
        let fileId = await this.uploadFile({list: deviceList[i]});
        let params = _.merge({
          'appkey': this.options.appKey,
          'timestamp': Date.now(),
          'type': 'filecast',
          'file_id': fileId,
          'payload': payload,
          'policy': {
            'expire_time': _moment((Date.now()) + 86400000).format('YYYY-MM-DD HH:mm:ss'),
          },
        }, data);

        axios({
          url: this.options.pushUrl + `?sign=${this.getSign(params, this.options.pushUrl)}`,
          method: this.options.method,
          contentType: 'application/json',
          data: params,
          responseType: 'json',
        })
          .then((res)=>{
            num++;
            successNum++;
            success(res);
            taskIdList.push(res.data.data.task_id);
            if (num == deviceList.length) {
              finish({
                status: 'success',
                maxLength: this.options.maxLength,
                group: deviceList.length,
                success_total: successNum,
                fail_total: failNum,
                taskIdList,
              });
            }
          })
          .catch((err) => {
            throw err;
          });
      } catch (err) {
        num++;
        failNum++;
        fail(err);
        if (num == deviceList.length) {
          finish({
            status: 'success',
            maxLength: this.options.maxLength,
            group: deviceList.length,
            success_total: successNum,
            fail_total: failNum,
            taskIdList,
          });
        }
      }

      if(sleep > 0 && num+1 < deviceList.length) {
        await this.sleep(sleep);
      }
    }
  }

  /**
   * @desc pushList 向指定的一批设备发送消息。
   * @param {object} data {title, content, list, success, fail}
   */
  async pushList(data) {
    let list = data.list;
    if( !Array.isArray(list) || list.length < 1  ) {
      console.warn('list 必填');
      return false;
    }
    let title = data.title,
      content = data.content,
      success = data.success || noop,
      fail = data.fail || noop,
      finish = data.finish || noop,
      icon = data.icon,
      sleep = data.sleep || 0;
    // 剔除SDK公用参数.
    delete data.title;
    delete data.content;
    delete data.list;
    delete data.success;
    delete data.fail;
    delete data.icon;
    delete data.sleep;
    delete data.finish;
    
    let num = 0,
      successNum = 0,
      failNum = 0;
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
      }, data);

      axios({
        url: this.options.pushUrl + `?sign=${this.getSign(params, this.options.pushUrl)}`,
        method: this.options.method,
        contentType: 'application/json',
        data: params,
        responseType: 'json',
      })
        .then((res)=>{
          num++;
          successNum++;
          success(res);
          if (num == deviceList.length) {
            finish({
              status: 'success',
              maxLength: this.options.maxLength,
              group: deviceList.length,
              success_total: successNum,
              fail_total: failNum,
            });
          }
        })
        .catch((err) => {
          num++;
          failNum++;
          fail(err);
          if (num == deviceList.length) {
            finish({
              status: 'success',
              maxLength: this.options.maxLength,
              group: deviceList.length,
              success_total: successNum,
              fail_total: failNum,
            });
          }
        });

      if(sleep > 0 && num+1 < deviceList.length) {
        await this.sleep(sleep);
      }
    }
  }

  async queryPushStatus(data) {
    let success = data.success || noop,
      fail = data.fail || noop;
    let params = _.merge({
      'appkey': this.options.appKey,
      'timestamp': Date.now(),
      'task_id': data.taskId,
    });
    let res = await axios({
      url: this.options.queryStatusUrl + `?sign=${this.getSign(params, this.options.queryStatusUrl)}`,
      method: this.options.method,
      contentType: 'application/json',
      data: params,
      responseType: 'json',
    })
      .then((response)=>{
        success(response.data);
        return response.data;
      })
      .catch((err) => {
        fail(err);
      });
    return res;
  }

  async uploadFile({list}) {
    let params = {
      'appkey': this.options.appKey,
      'timestamp': Date.now(),
      'content': UMeng.createFile(list),
    };
    let res = await axios({
      url: this.options.uploadUrl + `?sign=${this.getSign(params, this.options.uploadUrl)}`,
      method: this.options.method,
      contentType: 'application/json',
      data: params,
      responseType: 'json',
    }).then((response)=>{
      return response.data;
    }).catch((err) => {
      throw err;
    });
    return res.data.file_id;
  }
}

function noop(){}

module.exports = UMeng;