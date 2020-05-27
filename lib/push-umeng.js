const axios = require('axios');
const _moment = require('moment');
const _ = require('lodash');
const crypto = require('crypto');

class UMeng {
  constructor(options = {}) {
    if (!options.appKey) throw new Error('UMeng appKey 不能为空');
    if (!options.appMasterSecret) throw new Error('UMeng appMasterSecret 不能为空');

    this.options = {
      ...options,
      maxLength: options.maxLength || 50000,
      pushListMaxLength: options.pushListMaxLength || 500,
      pushUrl: options.pushUrl || 'https://msgapi.umeng.com/api/send',
      queryStatusUrl: options.queryStatusUrl || 'https://msgapi.umeng.com/api/status',
      uploadUrl: options.uploadUrl || 'https://msgapi.umeng.com/upload',
      method: 'POST',
      expireTime: 86400000, // 1天，单位：毫秒
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

  /**
   * @desc 友盟获取签名。
   * @param {*} postData 请求的参数
   * @param {*} url 请求的url
   * @return {String} 
   */
  getSign(postData, url) {
    let app_master_secret = this.options.appMasterSecret;
    let method = this.options.method;
    let post_body = JSON.stringify(postData);
    let sign = UMeng.md5(method + url + post_body + app_master_secret);
    return sign;
  }

  /**
   * @desc 根据maxLength来将设备分批
   * @memberof UMeng
   */
  getBathList(list, maxLength) {
    return _.chunk(list, maxLength);
  }

  /**
   * @desc 采用文件播的方式推送消息，支持状态查询，支持大批量的（大于500），限制1小时300次。
   * @param {Object} {} 
   */
  async push(data) {
    let list = data.list;

    if (!Array.isArray(list) || list.length < 1) {
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
    // 剔除SDK公用参数.【公用参数】与其他push-sdk定义的公用字段名。
    delete data.title;
    delete data.content;
    delete data.list;
    delete data.success;
    delete data.fail;
    delete data.icon;
    delete data.sleep;
    delete data.finish;

    // 计数
    let num = 0,
      successNum = 0,
      failNum = 0,
      taskIdList = [];
    // 设备分片
    const deviceList = this.getBathList(list, this.options.maxLength);
    // 通用消息体
    const payload = {
      'display_type': 'notification',
      'body': {
        'ticker': data.ticker || title,
        'title': title,
        'text': content,
        'icon': icon,
        'after_open': 'go_app'
      }
    };
    for (const i in deviceList) {
      // 上传文件，获取fileId.
      this.uploadFile({ list: deviceList[i] })
        .then((res) => {
          let { data: { file_id: fileId } } = res.data;
          // 合并data参数，将非公用的参数；_.merge()递归合并
          let params = _.merge({
            'appkey': this.options.appKey,
            'timestamp': Date.now(),
            'type': 'filecast',
            'file_id': fileId,
            'payload': payload,
            'policy': {
              'expire_time': _moment((Date.now()) + this.options.expireTime).format('YYYY-MM-DD HH:mm:ss'),
            },
          }, data);
          return axios({
            url: this.options.pushUrl + `?sign=${this.getSign(params, this.options.pushUrl)}`,
            method: this.options.method,
            contentType: 'application/json',
            data: params,
            responseType: 'json',
          });
        })
        .then((res) => {
          successNum += deviceList[i].length;
          success(res);
          taskIdList.push(res.data.data.task_id);
          return true;
        })
        .catch((err) => {
          failNum += deviceList[i].length;
          // 假如是HTTP 400错误，是友盟特定的错误返回。
          if( _.hasIn(err, 'response.status') && err.response.status == '400' ) {
            fail(err.response.data);
          } else {
            fail(err);
          }
          return false;
        })
        // Promise.prototype.finally()在ES2018引入，在catch后使用then替代finally.
        .then((result) => {
          num++;
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
        });
      if (sleep > 0 && num + 1 < deviceList.length) {
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

    if (!Array.isArray(list)) {
      console.warn('list 必填');
      return false;
    }
    // 单个用户改为调用pushSingle.
    if(list.length <= 1) {
      data.device_token = data.list[0];
      delete data.list;
      return this.pushSingle(data);
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

    // 计数
    let num = 0,
      successNum = 0,
      failNum = 0;
    const deviceList = this.getBathList(list, this.options.pushListMaxLength);
    // 通用消息体
    const payload = {
      'display_type': 'notification',
      'body': {
        'ticker': data.ticker || title,
        'title': title,
        'text': content,
        'icon': icon,
        'after_open': 'go_app'
      }
    };
    for (const i in deviceList) {
      // 合并data参数，将非公用的参数；_.merge()递归合并
      let params = _.merge({
        'appkey': this.options.appKey,
        'timestamp': Date.now(),
        'type': 'listcast',
        'device_tokens': deviceList[i].join(','), // 不能超过500个，多个device_token用英文逗号分隔
        'payload': payload,
        'policy': {
          'expire_time': _moment((Date.now()) + this.options.expireTime).format('YYYY-MM-DD HH:mm:ss'),
        },
      }, data);

      axios({
        url: this.options.pushUrl + `?sign=${this.getSign(params, this.options.pushUrl)}`,
        method: this.options.method,
        contentType: 'application/json',
        data: params,
        responseType: 'json',
      })
        .then((res) => {
          successNum++;
          success(res);
          return true;
        })
        .catch((err) => {
          failNum++;
          fail(err);
          return false;
        })
        // Promise.prototype.finally()在ES2018引入，在catch后使用then替代finally.
        .then((result) => {
          num++;
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

      if (sleep > 0 && num + 1 < deviceList.length) {
        await this.sleep(sleep);
      }
    }
  }

  /**
   * @desc pushSingle 向指定的一台设备发送消息。
   * @param {object} data {title, content, device_token, success, fail}
   */
  async pushSingle(data) {
    let title = data.title,
      content = data.content,
      device_token = data.device_token,
      success = data.success || noop,
      fail = data.fail || noop,
      finish = data.finish || noop,
      icon = data.icon,
      sleep = data.sleep || 0;

    if (!device_token) {
      // 兼容传了list的情况
      if(Array.isArray(data.list) && data.list.length == 1) {
        device_token = data.list[0]
      } else {
        throw new Error('pushSingle data.device_token必填');
      }
    }
    
    // 剔除SDK公用参数.
    delete data.title;
    delete data.content;
    delete data.device_token;
    delete data.list;
    delete data.success;
    delete data.fail;
    delete data.icon;
    delete data.sleep;
    delete data.finish;

    // 计数
    let successNum = 0,
      failNum = 0;

    // 通用消息体
    const payload = {
      'display_type': 'notification',
      'body': {
        'ticker': data.ticker || title,
        'title': title,
        'text': content,
        'icon': icon,
        'after_open': 'go_app'
      }
    };

    // 合并data参数，将非公用的参数；_.merge()递归合并
    let params = _.merge({
      'appkey': this.options.appKey,
      'timestamp': Date.now(),
      'type': 'unicast',
      'device_tokens': device_token, // 表示指定的单个设备
      'payload': payload,
      'policy': {
        'expire_time': _moment((Date.now()) + this.options.expireTime).format('YYYY-MM-DD HH:mm:ss'),
      },
    }, data);

    await axios({
      url: this.options.pushUrl + `?sign=${this.getSign(params, this.options.pushUrl)}`,
      method: this.options.method,
      contentType: 'application/json',
      data: params,
      responseType: 'json',
    })
      .then((res) => {
        const data = res.data;
        if (data.ret == "SUCCESS") {
          success(data);
          successNum = 1;
        } else {
          fail(data);
          failNum = 1;
        }
        return data;
      })
      .catch((err) => {
        fail(err);
        failNum = 1;
      });
    
    let result = {
      status: 'success',
      maxLength: this.options.maxLength,
      group: 1,
      success_total: successNum,
      fail_total: failNum,
    };
    finish(result);
    return result;
  }

  async queryPushStatus(data) {
    let success = data.success || noop,
      fail = data.fail || noop,
      finish = data.finish || noop,
      open_count = 0,
      sent_count = 0,
      dismiss_count = 0;

    if (Array.isArray(data.taskId)) {
      // 数组（1个or多个taskId）
      let successResList = [];
      let failIdList = [];
      for (let i = 0, length = data.taskId.length; i < length; i++) {
        let taskId = data.taskId[i];
        await this._action_queryPushState({ taskId: taskId })
          .then(res => {
            success(res);
            if (res.ret == 'SUCCESS') {
              open_count += Number(res.data.open_count);
              sent_count += Number(res.data.sent_count);
              dismiss_count += Number(res.data.dismiss_count);
            }
            return res;
          }).catch(err => {
            fail(err);
            failIdList.push(taskId);
          });

      }

      let result = {
        code: 200,
        data: {
          open_count,
          sent_count,
          dismiss_count
        }
      };
      finish(result);
      return result;
    } else {
      // 字符串（单个taskId）
      let res = await this._action_queryPushState({ taskId: data.taskId })
        .then(res => {
          success(res);
          finish(res);
          return res;
        }).catch(err => {
          fail(err);
          throw err;
        });
      return res;
    }
  }

  async uploadFile({ list }) {
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
    }).then((res) => {
      return res;
    });
    return res;
  }

  // 请求查询消息状态
  async _action_queryPushState({ taskId }) {
    let params = _.merge({
      'appkey': this.options.appKey,
      'timestamp': Date.now(),
      'task_id': taskId,
    });
    return axios({
      url: this.options.queryStatusUrl + `?sign=${this.getSign(params, this.options.queryStatusUrl)}`,
      method: this.options.method,
      contentType: 'application/json',
      data: params,
      responseType: 'json',
    }).then(res => res.data);
  }
}

function noop() { }

module.exports = UMeng;