// weapp-adapter - 模拟浏览器API环境

// 模拟window对象
const window = {
  innerWidth: canvas.width,
  innerHeight: canvas.height,
  devicePixelRatio: wx.getSystemInfoSync().devicePixelRatio || 1,
  addEventListener: function() {},
  removeEventListener: function() {},
  setTimeout: setTimeout,
  clearTimeout: clearTimeout,
  setInterval: setInterval,
  clearInterval: clearInterval
};

// 模拟document对象
const document = {
  createElement: function(tag) {
    if (tag === 'canvas') {
      return canvas;
    }
    return {};
  },
  addEventListener: function() {},
  removeEventListener: function() {}
};

// 模拟navigator对象
const navigator = {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) AppleWebKit/602.1.50 (KHTML, like Gecko) CriOS/56.0.2924.75 Mobile/14E5239e Safari/602.1',
  platform: 'iPhone'
};

// 模拟XMLHttpRequest
class XMLHttpRequest {
  constructor() {
    this.onreadystatechange = null;
    this.readyState = 0;
    this.status = 0;
    this.responseText = '';
  }
  open(method, url) {
    this.method = method;
    this.url = url;
    this.readyState = 1;
  }
  send(data) {
    this.readyState = 4;
    this.status = 200;
    this.responseText = '';
    if (this.onreadystatechange) {
      this.onreadystatechange();
    }
  }
}

// 模拟WebGLRenderingContext
const WebGLRenderingContext = canvas.getContext('webgl').constructor;

// 模拟其他必要的API
const performance = {
  now: function() {
    return Date.now();
  }
};

// 暴露到全局作用域
global.window = window;
global.document = document;
global.navigator = navigator;
global.XMLHttpRequest = XMLHttpRequest;
global.WebGLRenderingContext = WebGLRenderingContext;
global.performance = performance;
global.canvas = canvas;
global.self = global;

// 导出模块
module.exports = {
  window,
  document,
  navigator,
  XMLHttpRequest,
  performance
};