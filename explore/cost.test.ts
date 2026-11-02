import { test } from 'node:test';
import assert from 'node:assert/strict';
import { typingCost } from './cost.js';
test('typing proxy charges entered text for both devices and keeps modal/confirm authority', () => {
  assert.equal(typingCost({enter:{comp:'weight',value:{qty:{tenths:725,unit:'kg'}}}},false,false),4);
  assert.equal(typingCost({enter:{comp:'weight',value:{qty:{tenths:725,unit:'kg'}}}},true,true),5);
  assert.equal(typingCost({click:{comp:'orders'}},true,true),8);
  assert.equal(typingCost({ack:{alert:'interaction'}},true,true),1);
  assert.equal(typingCost({confirm:{comp:'weight'}},true,true),1);
});
