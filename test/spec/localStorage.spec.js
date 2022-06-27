import { useFakeTimers, stub } from 'sinon';
import LocalStorage from '../../lib/localStorage.js';

describe('LocalStorage', function() {
  describe('when not available', function() {
    let windowMock = {
      localStorage: undefined
    }

    it('detects unavailability', () => {
      const testStorage = new LocalStorage(windowMock);
      expect(testStorage.isAvailable()).to.equal(false);
    });

    it('returns undefined / null when reading', () => {
      const testStorage = new LocalStorage(windowMock);
      expect(testStorage.getItem('test')).to.equal(undefined);
      expect(testStorage.getItemWithExpiration({ name: 'test' })).to.equal(null);
    });

    it('does not attempt to write', () => {
      const testStorage = new LocalStorage(windowMock);

      // not thowing, so all good!
      testStorage.setItem('test');
      testStorage.setItemWithExpiration({ name: 'test', expiresDays: 11 }, 'test');
      testStorage.removeItem('test' );
      testStorage.removeItemWithExpiration({ name: 'test' });
    });
  });

  describe('when available', function() {
    let clock;
    let windowMock = {
      localStorage: {}
    }
    beforeEach(() => {
      windowMock.localStorage.setItem = stub();
      windowMock.localStorage.getItem = stub();
      windowMock.localStorage.removeItem = stub();
      clock = useFakeTimers(5000);
    });

    afterEach(() => {
      windowMock.localStorage.setItem.resetHistory();
      windowMock.localStorage.getItem.resetHistory();
      windowMock.localStorage.removeItem.resetHistory();
      clock.restore();
    });

    it('detects availability', () => {
      const testStorage = new LocalStorage(windowMock);
      expect(testStorage.isAvailable()).to.equal(true);
    });

    it('calls the browser API for basic operations', () => {
      const testStorage = new LocalStorage(windowMock);

      windowMock.localStorage.setItem.resetHistory();
      testStorage.setItem('test', 'value');
      assert(windowMock.localStorage.setItem.calledWith('test', 'value'));

      windowMock.localStorage.getItem.returns('testval');
      const testValue = testStorage.getItem('test');
      expect(testValue).to.equal('testval');

      windowMock.localStorage.removeItem.resetHistory();
      testStorage.removeItem('theitem');
      assert(windowMock.localStorage.removeItem.calledWith('theitem'));
    });

    it('writes correctly values with expiration policy', () => {
      const testStorage = new LocalStorage(windowMock);

      windowMock.localStorage.setItem.resetHistory();
      testStorage.setItemWithExpiration({ name: 'test', expiresDays: 11 }, 'value');
      expect(windowMock.localStorage.setItem.firstCall.args[0]).to.equal('test_exp');
      // 11 days from the Epoch plus 5000ms used when creating the clock
      expect(windowMock.localStorage.setItem.firstCall.args[1]).to.equal('Mon, 12 Jan 1970 00:00:05 GMT');
      expect(windowMock.localStorage.setItem.secondCall.args[0]).to.equal('test');
      expect(windowMock.localStorage.setItem.secondCall.args[1]).to.equal('value');
    });

    it('removes correctly values when trying to read expired items', () => {
      const testStorage = new LocalStorage(windowMock);
      windowMock.localStorage.removeItem.resetHistory();

      // The Epoch is before now() because we faked the clock at 5000ms
      windowMock.localStorage.getItem.returns('Mon, 1 Jan 1970 00:00:00 GMT');
      const value = testStorage.getItemWithExpiration({ name: 'test' });

      expect(value).to.equal(null);
      expect(windowMock.localStorage.removeItem.firstCall.args[0]).to.equal('test');
      expect(windowMock.localStorage.removeItem.secondCall.args[0]).to.equal('test_exp');
    });

    it('skips writing when writing is disabled', () => {
      const testStorage = new LocalStorage(windowMock, false);
      windowMock.localStorage.setItem.resetHistory();
      testStorage.setItemWithExpiration({ name: 'test', expiresDays: 11 }, 'value');
      assert(windowMock.localStorage.setItem.notCalled);
    });
  });
});
