import sinon from 'sinon';
import { LiveIntentApi } from '../../lib/liveIntentApi.js';
import {CONSTANTS, StorageConfig} from '@id5io/multiplexing';

const chai = require('chai');
const assert = chai.assert;
const expect = chai.expect;

describe('ID5 LiveIntent integration API', function () {
   let localStorageStub;
   let clock;
   let windowObj;

  before(function() {
    clock = sinon.useFakeTimers();
  });

  after(function() {
    clock.restore();
  });

  beforeEach(function() {
    localStorageStub = {
      isAvailable: () => true,
      getItemWithExpiration: sinon.spy(),
      setItemWithExpiration: sinon.spy()
    };
    windowObj = {};
  });

  it('polls window.liQ.ready in order to detect LiveIntent on the page', function(done) {
    new LiveIntentApi(windowObj, true, localStorageStub, new StorageConfig());
    let called = false;

    setTimeout(() => {
      windowObj.liQ = {
        ready: true,
        resolve: sinon.spy(function() {
          called = true;
          done();
        })
      };
    }, CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS / 2);

    setTimeout(() => {
      if (!called) {
        assert.fail('Expected resolve function to be called');
        done();
      }
    }, CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS + 10);
    clock.tick(CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS + 20);
  })

  it('retrieves the LiveIntent ID and saves it in local storage', function(done) {
    const testStart = Date.now();
    windowObj.liQ = {
      ready: true,
      resolve: (callback) => callback({unifiedId: 'testLIVEINTENTid'})
    };

    new LiveIntentApi(windowObj, true, localStorageStub, new StorageConfig());

    setTimeout(() => {
      sinon.assert.calledOnce(localStorageStub.setItemWithExpiration);
      const policy = localStorageStub.setItemWithExpiration.getCall(0).args[0];
      expect(policy).to.deep.eq({
        "name": "id5li",
        "expiresDays": 90
      })
      const value = JSON.parse(localStorageStub.setItemWithExpiration.getCall(0).args[1]);
      expect(value.liveIntentId).to.equal('testLIVEINTENTid');
      expect(value.timestamp).to.be.above(testStart);
      done();
    }, CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS + 10);
    clock.tick(CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS + 20);
  });

  it('retrieves the LiveIntent ID from local storage at startup', function(done) {
    windowObj.liQ = {
      ready: true,
      resolve: (callback) => callback()
    };

    localStorageStub.getItemWithExpiration = (policy) => {
      if (policy.name === 'id5li' && policy.expiresDays === 90) {
        return JSON.stringify({
          liveIntentId: 'TESTliveintentID',
          timestamp: 99999
        })
      }
    }
    const liApi = new LiveIntentApi(windowObj, true, localStorageStub, new StorageConfig());
    setTimeout(() => {
      expect(liApi.hasLiveIntentId()).to.be.true;
      expect(liApi.getLiveIntentId()).to.equal('TESTliveintentID');
      done();
    }, CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS + 10);
    clock.tick(CONSTANTS.LIVE_INTENT_POLL_INTERVAL_MS + 20);
  });
});
