'use strict';

var cp = require('child_process');
var assert = require('assert');
var test = require('testit');
var Promise = require('promise');
var getBrowser = require('./get-browser');

var LOCAL = !process.env.CI && process.argv[2] !== 'sauce';
var location;
if (LOCAL) {
  LOCAL = cp.fork(require.resolve('./server.js'));
  location = 'http://localhost:1338/demo-page.html';
} else {
  location = 'http://rawgithub.com/ForbesLindesay/cabbie/master/test/demo-page.html';
}

function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, require('ms')(time + ''));
  });
}

test('it throws an error if you try and get a browser with an invalid mode', function () {
  try {
    var browser = getBrowser({mode: 'foo'});
  } catch (ex) {
    assert(ex instanceof Error);
  }
});

function testBrowser(browser, promise) {
  test('it lets you specify a sauce job name', function () {
    return promise(browser
                   .sauceJobUpdate({
                     name: 'synchronous',
                     build: process.env.TRAVIS_JOB_ID
                   }));
  });
  test('it lets you set timeouts', function () {
    return promise(browser.setTimeouts({
      'implicit': '10s',
      'async': '10s'
    }));
  });
  test('it lets you navigate to a domain', function () {
    return promise(browser.navigateTo(location)).then(function () {
      return promise(browser.getElement('h1'));
    });
  });
  test('you can get an element', function () {
    return promise(browser.getElement('h1'));
  });
  test('you can test whether an element is visible', function () {
    return promise(browser.getElement('h1')).then(function (element) {
      return promise(element.isVisible());
    }).then(function (visible) {
      assert(visible === true);
      return promise(browser.getElement('#hidden'));
    }).then(function (element) {
      return promise(element.isVisible());
    }).then(function (visible) {
      assert(visible === false);
    });
  });
  test('you can get an attribute of an element', function () {
    return promise(browser.getElement('#has-attribute')).then(function (element) {
      return promise(element.get('data-attribute'));
    }).then(function (name) {
      assert(name === 'value');
    });
  });
  test('you can type text into an element', function () {
    return promise(browser.getElement('[name="q"]')).then(function (element) {
      return promise(element.type('hello')).then(function () {
        return promise(element.type([' ', 'world']));
      }).then(function () {
        return promise(element.get('value'));
      }).then(function (value) {
        assert(value === 'hello world');
        return promise(element.clear());
      }).then(function () {
        return promise(element.get('value'));
      }).then(function (value) {
        assert(value === '');
      });
    });
  });
  test('you can get the text content of an element', function () {
    return promise(browser.getElement('#has-text')).then(function (element) {
      return promise(element.text()).then(function (text) {
        assert(text === 'test content');
      });
    });
  });
  test('it lets you click on a button', function () {
    return promise(browser.getElement('#clickable')).then(function (button) {
      return promise(button.click()).then(function () {
        return button.text();
      }).then(function (text) {
        assert(text === 'clicked');
      });
    });
  });
  if (!LOCAL) {
    // TODO: for some reason setting cookies doesn't seem to work locally
    test('it lets you set cookies, read them back, and clear them', function() {
      return promise(browser.setCookie({name: 'test-cookie0', value: 'test-cookie0-value'})).then(function () {
        return browser.setCookie({name: 'test-cookie1', value: 'test-cookie1-value'});
      }).then(function () {
        return browser.setCookie({name: 'test-cookie2', value: 'test-cookie2-value'});
      }).then(function () {
        return browser.getCookie('test-cookie0');
      }).then(function(cookie) {
        assert(cookie !== null);
        assert(cookie.name === 'test-cookie0');
        assert(cookie.value === 'test-cookie0-value');
      }).then(function() {
        return browser.getCookies();
      }).then(function(cookies) {
        assert(cookies.length === 3);
      }).then(function() {
        return browser.getCookie('no-such-cookie');
      }).then(function(cookie) {
        assert(cookie === null);
      }).then(function() {
        return browser.clearCookie('test-cookie2');
      }).then(function() {
        return browser.getCookies();
      }).then(function(cookies) {
        assert(cookies.length === 2);
      }).then(function() {
        return browser.clearCookies();
      }).then(function() {
        return browser.getCookies();
      }).then(function(cookies) {
        assert(cookies.length === 0);
      });
    });
  }

  test('it lets you dispose the browser', function () {
    return promise(browser.dispose({passed: true}));
  });
}

testBrowser(getBrowser({mode: 'sync', debug: true}), function (value) {
  assert(!value ||
         (typeof value !== 'object' && typeof value !== 'function') ||
         typeof value.then !== 'function');
  return Promise.from(value);
});
testBrowser(getBrowser({mode: 'async', debug: true}), function (value) {
  assert(value &&
         (typeof value === 'object' || typeof value === 'function') &&
         typeof value.then === 'function');
  return value;
});

if (LOCAL) {
  test('Close server', function () {
    LOCAL.kill();
  });
}
