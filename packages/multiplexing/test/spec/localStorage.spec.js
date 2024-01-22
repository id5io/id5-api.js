import sinon, {useFakeTimers} from 'sinon';
import {StorageApi, LocalStorage, ReplicatingStorage, WindowStorage} from '../../src/localStorage.js';

describe('LocalStorage', function () {
  describe('when not available', function () {
    let storageMock = undefined;

    it('returns undefined / null when reading', () => {
      const testStorage = new LocalStorage(storageMock);
      expect(testStorage.getItem('test')).to.equal(undefined);
      expect(testStorage.getItemWithExpiration({name: 'test'})).to.equal(null);
    });

    it('does not attempt to write', () => {
      const testStorage = new LocalStorage(storageMock);

      // not throwing, so all good!
      testStorage.setItem('test');
      testStorage.setItemWithExpiration({name: 'test', expiresDays: 11}, 'test');
      testStorage.removeItem('test');
      testStorage.removeItemWithExpiration({name: 'test'});
    });
  });
  const currentTimeMs = 5000;

  describe('when available', function () {
    let clock;
    let storageMock;
    beforeEach(() => {
      storageMock = sinon.createStubInstance(StorageApi);
      clock = useFakeTimers(currentTimeMs);
    });

    afterEach(() => {
      clock.restore();
    });

    it('calls the browser API for basic operations', () => {
      const testStorage = new LocalStorage(storageMock);

      storageMock.setItem.resetHistory();
      testStorage.setItem('test', 'value');
      expect(storageMock.setItem).to.be.calledWith('test', 'value');

      storageMock.getItem.returns('testval');
      const testValue = testStorage.getItem('test');
      expect(testValue).to.equal('testval');

      storageMock.removeItem.resetHistory();
      testStorage.removeItem('theitem');
      expect(storageMock.removeItem).to.be.calledWith('theitem');
    });

    it('writes correctly values with expiration policy', () => {
      const testStorage = new LocalStorage(storageMock);

      storageMock.setItem.resetHistory();
      testStorage.setItemWithExpiration({name: 'test', expiresDays: 11}, 'value');
      expect(storageMock.setItem.firstCall.args[0]).to.equal('test_exp');
      // 11 days from the Epoch plus 5000ms used when creating the clock
      expect(storageMock.setItem.firstCall.args[1]).to.equal('Mon, 12 Jan 1970 00:00:05 GMT');
      expect(storageMock.setItem.secondCall.args[0]).to.equal('test');
      expect(storageMock.setItem.secondCall.args[1]).to.equal('value');
    });

    it('removes correctly values when trying to read expired items', () => {
      const testStorage = new LocalStorage(storageMock);
      storageMock.removeItem.resetHistory();

      // The Epoch is before now() because we faked the clock at 5000ms
      storageMock.getItem.returns('Mon, 1 Jan 1970 00:00:00 GMT');
      const value = testStorage.getItemWithExpiration({name: 'test'});

      expect(value).to.equal(null);
      expect(storageMock.removeItem.firstCall.args[0]).to.equal('test');
      expect(storageMock.removeItem.secondCall.args[0]).to.equal('test_exp');
    });

    it('writes object with expiration policy', () => {
      const testStorage = new LocalStorage(storageMock);

      // when
      testStorage.setObjectWithExpiration({name: 'test', expiresDays: 11}, {value: 'Value1', other: 'Other'});

      // then
      expect(storageMock.setItem).to.be.calledWith('test', JSON.stringify({
        data: {value: 'Value1', other: 'Other'},
        expireAt: currentTimeMs + 11 * 24 * 3600 * 1000 // 11 days from the current time
      }));
      expect(storageMock.setItem).to.be.calledOnce;
    });

    it('update object with expiration policy', () => {
      // given
      const testStorage = new LocalStorage(storageMock);
      const storedObject = {value: 'Value1', other: 'Other'};

      storageMock.getItem.withArgs('test').returns(JSON.stringify({
        data: storedObject,
        expireAt: currentTimeMs + 1
      }));

      // when
      testStorage.updateObjectWithExpiration({name: 'test', expiresDays: 2}, currentObject => { return {
        ...currentObject,
        value: 'updated',
        added: 'property'
      }});

      // then
      expect(storageMock.getItem).to.be.calledWith('test');
      expect(storageMock.getItem).to.be.calledOnce;
      expect(storageMock.removeItem).to.not.be.called;
      expect(storageMock.setItem).to.be.calledWith('test', JSON.stringify({
        data: {value: 'updated', other: 'Other', added: 'property'},
        expireAt: currentTimeMs + 2 * 24 * 3600 * 1000 // updated expiration Time
      }));
      expect(storageMock.setItem).to.be.calledOnce;
    });

    it('update object with expiration policy - expired object', () => {
      // given
      const testStorage = new LocalStorage(storageMock);
      const storedObject = {value: 'Value1', other: 'Other'};

      storageMock.getItem.withArgs('test').returns(JSON.stringify({
        data: storedObject,
        expireAt: currentTimeMs - 1
      }));

      // when
      testStorage.updateObjectWithExpiration({name: 'test', expiresDays: 2}, currentObject => { return {
        ...currentObject,
        value: 'updated',
        added: 'property'
      }});

      // then
      expect(storageMock.getItem).to.be.calledWith('test');
      expect(storageMock.getItem).to.be.calledOnce;
      expect(storageMock.removeItem).to.be.calledWith('test');
      expect(storageMock.setItem).to.be.calledWith('test', JSON.stringify({
        data: {value: 'updated', added: 'property'},
        expireAt: currentTimeMs + 2 * 24 * 3600 * 1000 // updated expiration Time
      }));
      expect(storageMock.setItem).to.be.calledOnce;
    });

    it('read correctly object with expiration policy', () => {
      // given
      const testStorage = new LocalStorage(storageMock);
      const storedObject = {value: 'Value1', other: 'Other'};

      storageMock.getItem.withArgs('test').returns(JSON.stringify({
        data: storedObject,
        expireAt: currentTimeMs + 1
      }));
      // when
      let result = testStorage.getObjectWithExpiration({name: 'test'});

      // then
      expect(result).to.be.eql({value: 'Value1', other: 'Other'});
      expect(storageMock.getItem).to.be.calledWith('test');
      expect(storageMock.getItem).to.be.calledOnce;
      expect(storageMock.removeItem).to.not.be.called;
    });

    it('removes object while reading when expired ', () => {
      // given
      const testStorage = new LocalStorage(storageMock);
      const storedObject = {value: 'Value1', other: 'Other'};

      const key = 'test';
      storageMock.getItem.withArgs(key).returns(JSON.stringify({
        data: storedObject,
        expireAt: currentTimeMs - 1
      }));
      // when
      let result = testStorage.getObjectWithExpiration({name: key});

      // then
      expect(result).to.be.undefined;
      expect(storageMock.getItem).to.be.calledWith(key);
      expect(storageMock.getItem).to.be.calledOnce;
      expect(storageMock.removeItem).to.be.calledWith(key);
    });

    it('ignores stored invalid objects', () => {
      // given
      const testStorage = new LocalStorage(storageMock);

      const key = 'test';
      storageMock.getItem.withArgs(key).returns(JSON.stringify({}));
      // when
      let result = testStorage.getObjectWithExpiration({name: key});

      // then
      expect(result).to.be.undefined;
      expect(storageMock.getItem).to.be.calledWith(key);
      expect(storageMock.getItem).to.be.calledOnce;
      expect(storageMock.removeItem).to.not.be.called;
    });

    it('handles exceptions when reading objects', () => {
      // given
      const testStorage = new LocalStorage(storageMock);

      const key = 'test';
      storageMock.getItem.throws(new Error())

      // when
      let result = testStorage.getObjectWithExpiration({name: key});

      // then
      expect(result).to.be.undefined;
      expect(storageMock.getItem).to.be.calledWith(key);
      expect(storageMock.getItem).to.be.calledOnce;
      expect(storageMock.removeItem).to.not.be.called;
    });
  });
});

describe('WindowStorage', function () {

  let windowMock, storageMock;

  beforeEach(function () {
    storageMock = sinon.createStubInstance(Storage);
    windowMock = {
      localStorage: storageMock
    };
  });

  it('skips writing when writing is disabled', () => {
    const testStorage = new WindowStorage(windowMock, false);
    testStorage.setItem('key', 'value');
    expect(storageMock.setItem).to.be.not.called;
  });

  it('returns values from underlying storage', function () {

    const testStorage = new WindowStorage(windowMock, false);
    storageMock.getItem.returns('B');

    // when
    const result = testStorage.getItem('A');
    // then
    expect(result).to.be.eq('B');
    expect(storageMock.getItem).to.be.calledWith('A');
  });

  it('writes key/value to underlying storage', function () {

    const testStorage = new WindowStorage(windowMock);

    // when
    testStorage.setItem('A', 'B');

    // then
    expect(storageMock.setItem).to.be.calledWith('A', 'B');
  });

  [true, false].forEach((writingEnabled) => {
    it(`remove key from underlying storage writingEnabled=${writingEnabled}`, function () {

      const testStorage = new WindowStorage(windowMock, writingEnabled);

      // when
      testStorage.removeItem('A');

      // then
      expect(storageMock.removeItem).to.be.calledWith('A');
    });
  });

  describe('when local storage inaccessible', function () {
    let localStorageStub;
    beforeEach(function () {
      localStorageStub = sinon.stub(window.localStorage, 'setItem').throws(new Error());
    });
    afterEach(function () {
      localStorageStub.restore();
    });
    it('returns false when accessibility checked', function () {
      expect(WindowStorage.checkIfAccessible()).to.be.eq(false);
    });
  });

  describe('when local storage accessible', function () {
    // by default accessible
    it('returns true when accessibility checked', function () {
      expect(WindowStorage.checkIfAccessible()).to.be.eq(true);
    });
  });
});


describe('ReplicatingStorage', function () {

  /**
   * @type {StorageApi}
   */
  let primaryStorage, replica1, replica2;

  /**
   * @type {ReplicatingStorage}
   */
  let replicatingStorage;
  beforeEach(function () {
    primaryStorage = sinon.createStubInstance(StorageApi);
    replica1 = sinon.createStubInstance(StorageApi);
    replica2 = sinon.createStubInstance(StorageApi);
    replicatingStorage = new ReplicatingStorage(primaryStorage);
  });


  describe('without replicas', function () {
    it('returns value from primaryStorage', function () {

      // given
      primaryStorage.getItem.returns('value');

      // when
      const ret = replicatingStorage.getItem('key');

      // then
      expect(ret).to.be.eq('value');
      expect(primaryStorage.getItem).to.be.calledWith('key');
    });

    it('should set item in primaryStorage', function () {

      // when
      replicatingStorage.setItem('key', 'value');

      // then
      expect(primaryStorage.setItem).to.be.calledWith('key', 'value');
    });
    it('should remove item from primaryStorage', function () {

      // when
      replicatingStorage.removeItem('key');

      // then
      expect(primaryStorage.removeItem).to.be.calledWith('key');
    });
  });

  describe('with replicas', function () {
    beforeEach(function () {
      replicatingStorage.addReplica(replica1);
      replicatingStorage.addReplica(replica2);
    });

    it('returns value from primaryStorage only', function () {

      // given
      primaryStorage.getItem.returns('value');

      // when
      const ret = replicatingStorage.getItem('key');

      // then
      expect(ret).to.be.eq('value');
      expect(primaryStorage.getItem).to.be.calledWith('key');
      expect(replica1.getItem).to.not.be.called;
      expect(replica2.getItem).to.not.be.called;
    });

    it('should set item in primaryStorage and replicas', function () {

      // when
      replicatingStorage.setItem('key', 'value');

      // then
      expect(primaryStorage.setItem).to.be.calledWith('key', 'value');
      expect(replica1.setItem).to.be.calledWith('key', 'value');
      expect(replica2.setItem).to.be.calledWith('key', 'value');
    });

    it('should remove item from primaryStorage and replicas', function () {

      // when
      replicatingStorage.removeItem('key');

      // then
      expect(primaryStorage.removeItem).to.be.calledWith('key');
      expect(replica1.removeItem).to.be.calledWith('key');
      expect(replica2.removeItem).to.be.calledWith('key');
    });

    it('should register new replica when added and playback last operation made on key in past', function () {

      // given
      replicatingStorage.setItem('key1', 'v1.1');
      replicatingStorage.setItem('key2', 'v2.1');
      replicatingStorage.setItem('key2', 'v2.2');
      replicatingStorage.setItem('key3', 'v3.1');
      replicatingStorage.removeItem('key3');

      const newReplica = sinon.createStubInstance(StorageApi);

      // when
      replicatingStorage.addReplica(newReplica);

      // then
      expect(newReplica.setItem).to.be.calledWith('key1', 'v1.1');
      expect(newReplica.setItem).to.be.calledWith('key2', 'v2.2');
      expect(newReplica.removeItem).to.be.calledWith('key3');

      expect(newReplica.setItem).to.not.be.calledWith('key2', 'v2.1');
      expect(newReplica.setItem).to.not.be.calledWith('key3', 'v3.1');

      // when
      replicatingStorage.setItem('key4', 'v4');

      // then
      expect(newReplica.setItem).to.be.calledWith('key4', 'v4');
      expect(replica1.setItem).to.be.calledWith('key4', 'v4');
      expect(replica2.setItem).to.be.calledWith('key4', 'v4');

      // when
      replicatingStorage.removeItem('key2');

      // then
      expect(newReplica.removeItem).to.be.calledWith('key2');
      expect(replica1.removeItem).to.be.calledWith('key2');
      expect(replica2.removeItem).to.be.calledWith('key2');
    });
  });
});
