'use strict';

// The whole point behind this internal module is to allow Node.js to no
// longer be forced to treat every error message change as a semver-major
// change. The NodeError classes here all expose a `code` property whose
// value statically and permanently identifies the error. While the error
// message may change, the code should not.

const kCode = Symbol('code');
const messages = new Map();

var assert, util;
function lazyAssert() {
  if (!assert)
    assert = require('assert');
  return assert;
}

function lazyUtil() {
  if (!util)
    util = require('util');
  return util;
}

function makeNodeError(Base) {
  return class NodeError extends Base {
    constructor(key, ...args) {
      super(message(key, args));
      this[kCode] = key;
      Error.captureStackTrace(this, NodeError);
    }

    get name() {
      return `${super.name}[${this[kCode]}]`;
    }

    get code() {
      return this[kCode];
    }
  };
}

function message(key, args) {
  const assert = lazyAssert();
  assert.strictEqual(typeof key, 'string');
  const util = lazyUtil();
  const msg = messages.get(key);
  assert(msg, `An invalid error message key was used: ${key}.`);
  let fmt = util.format;
  if (typeof msg === 'function') {
    fmt = msg;
  } else {
    if (args === undefined || args.length === 0)
      return msg;
    args.unshift(msg);
  }
  return String(fmt.apply(null, args));
}

// Utility function for registering the error codes. Only used here. Exported
// *only* to allow for testing.
function E(sym, val) {
  messages.set(sym, typeof val === 'function' ? val : String(val));
}

module.exports = exports = {
  message,
  Error: makeNodeError(Error),
  TypeError: makeNodeError(TypeError),
  RangeError: makeNodeError(RangeError),
  E // This is exported only to facilitate testing.
};

// To declare an error message, use the E(sym, val) function above. The sym
// must be an upper case string. The val can be either a function or a string.
// The return value of the function must be a string.
// Examples:
// E('EXAMPLE_KEY1', 'This is the error value');
// E('EXAMPLE_KEY2', (a, b) => return `${a} ${b}`);
//
// Once an error code has been assigned, the code itself MUST NOT change and
// any given error code must never be reused to identify a different error.
//
// Any error code added here should also be added to the documentation
//
// Note: Please try to keep these in alphabetical order
E('ERR_ASSERTION', (msg) => msg);
E('ERR_INVALID_ARGS', 'invalid arguments');
E('ERR_INVALID_ARG_TYPE', invalidArgType);
E('ERR_INVALID_ARG_VALUE', invalidArgValue);
E('ERR_INVALID_CALLBACK', 'callback must be a function');
E('ERR_INVALID_FLAG', (arg) => `${arg} must use valid flags`);
E('ERR_INVALID_IP',
  (arg, ip) => `"${arg}" argument must be a valid IP address, got ${ip}`);
E('ERR_INVALID_PORT',
  (arg, port) => `"${arg}" argument must be >= 0 and < 65536, got ${port}`);
E('ERR_SETTING_SERVERS',
  (err, servers) => `c-ares failed to set servers: "${err}" [${servers}]`);
// Add new errors from here...

// Errors from 111294, port error from 11302

function invalidArgType(name, expected, actual) {
  const assert = lazyAssert();
  assert(name, 'name is required');
  assert(expected, 'expected is required');
  var msg = `The "${name}" argument must be `;
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map((i) => String(i));
    if (len > 1) {
      msg += `one of type ${expected.slice(0, len - 1).join(', ')}, or ` +
             expected[len - 1];
    } else {
      msg += `type ${expected[0]}`;
    }
  } else {
    msg += `type ${String(expected)}`;
  }
  if (arguments.length >= 3) {
    msg += `. Received type ${actual !== null ? typeof actual : 'null'}`;
  }
  return msg;
}

function invalidArgValue(name, expected, actual) {
  const assert = lazyAssert();
  assert(name, 'name is required');
  assert(expected, 'expected is required');
  var msg = `The "${name}" argument must be `;
  if (Array.isArray(expected)) {
    var len = expected.length;
    expected = expected.map((i) => String(i));
    if (len > 1) {
      msg += `${expected.slice(0, len - 1).join(', ')}, or ` +
             expected[len - 1];
    } else {
      msg += `${expected[0]}`;
    }
  } else {
    msg += `${String(expected)}`;
  }
  if (arguments.length >= 3) {
    msg += `. Received ${actual !== null ? typeof actual : 'null'}`;
  }
  return msg;
}
