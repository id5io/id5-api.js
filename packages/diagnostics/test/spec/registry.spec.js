import {MeterRegistry} from '../../src/registry.js';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import sinonChai from 'sinon-chai';
import {Counter, Summary, Timer} from '../../src/meters.js';

chai.should();
chai.use(sinonChai);

const NAME_A = 'a.b.c';
const NAME_B = 'd.c.e';
const TAGS = {
  tagA: 'valueA',
  tagB: 'valueB'
};

describe('Registry', function () {
  it('should create Timer', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let timer = meterRegistry.timer(NAME_A, TAGS);

    // then
    expect(timer).is.deep.eq(new Timer(NAME_A, TAGS));
  });

  it('should create new Timer when different name', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let timer1 = meterRegistry.timer(NAME_A, TAGS);
    let timer2 = meterRegistry.timer(NAME_B, TAGS);

    // then
    expect(timer1).is.not.deep.eq(timer2);
  });

  it('should create new Timer when different tags', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let timer1 = meterRegistry.timer(NAME_A, {a: 'a'});
    let timer2 = meterRegistry.timer(NAME_A, {b: 'b'});

    // then
    expect(timer1).is.not.deep.eq(timer2);
  });

  it('should return Timer when already registered', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let timer1 = meterRegistry.timer(NAME_A, {
      tagA: 'valueA',
      tagB: 'valueB'
    });
    let timer2 = meterRegistry.timer(NAME_A, {
      tagB: 'valueB',
      tagA: 'valueA'
    });

    // then
    expect(timer1).is.eq(timer2);
  });

  it('should return Timer with common tags', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'TAG'});

    // when
    let timer = meterRegistry.timer(NAME_A, TAGS);

    // then
    expect(timer).is.deep.eq(new Timer(NAME_A, {
      ...TAGS,
      common: 'TAG'
    }));
  });

  it('should return Timer with common tags only', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'TAG'});

    // when
    let timer = meterRegistry.timer(NAME_A);

    // then
    expect(timer).is.deep.eq(new Timer(NAME_A, {
      common: 'TAG'
    }));
  });

  it('should create Counter', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let counter = meterRegistry.counter(NAME_A, TAGS);

    // then
    expect(counter).is.deep.eq(new Counter(NAME_A, TAGS));
  });

  it('should create new Counter when different name', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let counter1 = meterRegistry.counter(NAME_A, TAGS);
    let counter2 = meterRegistry.counter(NAME_B, TAGS);

    // then
    expect(counter1).is.not.deep.eq(counter2);
  });

  it('should create new Counter when different tags', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let counter1 = meterRegistry.counter(NAME_A, {a: 'a'});
    let counter2 = meterRegistry.counter(NAME_A, {b: 'b'});

    // then
    expect(counter1).is.not.deep.eq(counter2);
  });

  it('should return Counter when already registered', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let counter1 = meterRegistry.counter(NAME_A, TAGS);
    let counter2 = meterRegistry.counter(NAME_A, TAGS);

    // then
    expect(counter1).is.eq(counter2);
  });

  it('should return Counter with common tags', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'TAG'});

    // when
    let counter = meterRegistry.counter(NAME_A, TAGS);

    // then
    expect(counter).is.deep.eq(new Counter(NAME_A, {
      ...TAGS,
      common: 'TAG'
    }));
  });

  it('should return Counter with common tags only', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'TAG'});

    // when
    let counter = meterRegistry.counter(NAME_A);

    // then
    expect(counter).is.deep.eq(new Counter(NAME_A, {
      common: 'TAG'
    }));
  });

  it('should create Summary', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let summary = meterRegistry.summary(NAME_A, TAGS);

    // then
    expect(summary).is.deep.eq(new Summary(NAME_A, TAGS));
  });

  it('should create new Summary when different tags', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let summary1 = meterRegistry.summary(NAME_A, {a: 'a'});
    let summary2 = meterRegistry.summary(NAME_A, {b: 'b'});

    // then
    expect(summary1).is.not.deep.eq(summary2);
  });

  it('should create new Summary when different names', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let summary1 = meterRegistry.summary(NAME_A, TAGS);
    let summary2 = meterRegistry.summary(NAME_B, TAGS);

    // then
    expect(summary1).is.not.deep.eq(summary2);
  });

  it('should return Summary when already registered', function () {
    // given
    let meterRegistry = new MeterRegistry();

    // when
    let summary1 = meterRegistry.summary(NAME_A, TAGS);
    let summary2 = meterRegistry.summary(NAME_A, TAGS);

    // then
    expect(summary1).is.eq(summary2);
  });

  it('should return Summary with common tags', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'TAG'});

    // when
    let summary = meterRegistry.summary(NAME_A, TAGS);

    // then
    expect(summary).is.deep.eq(new Summary(NAME_A, {
      ...TAGS,
      common: 'TAG'
    }));
  });

  it('should return Summary with common tags only', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'TAG'});

    // when
    let summary = meterRegistry.summary(NAME_A);

    // then
    expect(summary).is.deep.eq(new Summary(NAME_A, {
      common: 'TAG'
    }));
  });

  it('should reset meters', function () {
    // given
    let meterRegistry = new MeterRegistry();
    let timer = meterRegistry.timer('a', TAGS);
    let counter = meterRegistry.counter('b', TAGS);
    let summary = meterRegistry.summary('c', TAGS);

    // when
    timer.record(1);
    counter.inc();
    summary.record(1);

    // then
    expect(meterRegistry.getAllMeasurements().length).is.eq(3);

    // when
    meterRegistry.reset();

    // then
    expect(meterRegistry.getAllMeasurements().length).is.eq(0);

    // when
    timer.record(1);
    counter.inc();

    // then count them from the beginning
    expect(meterRegistry.getAllMeasurements().length).is.eq(2);
  });

  it('should publish then reset', async () => {
    // given
    let publisher = sinon.stub();
    let meterRegistry = new MeterRegistry({});

    meterRegistry.timer('1', {}).record(1);

    let allMeasurements = meterRegistry.getAllMeasurements();

    // when
    await meterRegistry.publish(publisher);

    // then
    expect(allMeasurements.length).is.eq(1);
    publisher.should.have.been.calledWith(allMeasurements);
    expect(meterRegistry.getAllMeasurements().length).is.eq(0);
  });

  it('should publish with metadata', async () => {
    // given
    let publisher = sinon.stub();
    let meterRegistry = new MeterRegistry({});

    meterRegistry.timer('1', {}).record(1);

    let allMeasurements = meterRegistry.getAllMeasurements();

    let md = {x: 1};
    // when
    await meterRegistry.publish(publisher, md);

    // then
    expect(allMeasurements.length).is.eq(1);
    publisher.should.have.been.calledWith(allMeasurements, md);
    expect(meterRegistry.getAllMeasurements().length).is.eq(0);
  });

  it('should return all non empty measurements', function () {
    // given
    let meterRegistry = new MeterRegistry();
    let timer = meterRegistry.timer('a1', {a: 'A'});
    let timerEmpty = meterRegistry.timer('a2', {a: 'AA'});
    let counter = meterRegistry.counter('b', {b: 'B'});
    let summary = meterRegistry.summary('c', {c: 'C'});

    timer.values = [{
      value: 1,
      timestamp: 1
    }];

    timerEmpty.values = [];

    counter.values = [{
      value: 2,
      timestamp: 2
    }];

    summary.values = [{
      value: 3,
      timestamp: 3
    }];

    // when
    let allMeasurements = meterRegistry.getAllMeasurements();

    // then
    expect(allMeasurements).is.deep.eq([
      {
        name: 'a1',
        type: 'TIMER',
        tags: {a: 'A'},
        values: [{
          value: 1,
          timestamp: 1
        }]
      },
      {
        name: 'b',
        type: 'COUNTER',
        tags: {b: 'B'},
        values: [{
          value: 2,
          timestamp: 2
        }]
      },
      {
        name: 'c',
        type: 'SUMMARY',
        tags: {c: 'C'},
        values: [{
          value: 3,
          timestamp: 3
        }]
      }
    ]);
  });

  it('should add common tags', function () {
    // given
    let meterRegistry = new MeterRegistry({common: 'a'});

    // when
    meterRegistry.addCommonTags({another_common: 'b'});

    // then
    expect(meterRegistry.commonTags).is.deep.eq({
      common: 'a',
      another_common: 'b'
    });
  });

  it('should schedule publish only if not yet scheduled', function () {

    // given
    let meterRegistry = new MeterRegistry();
    let setTimeoutStub = sinon.stub(globalThis, 'setTimeout');

    try {
      // when
      meterRegistry.schedulePublishAfterMsec(1000);

      // then
      setTimeoutStub.should.have.been.called;

      // when
      setTimeoutStub.reset();
      meterRegistry.schedulePublishAfterMsec(1000);

      // then
      setTimeoutStub.should.have.not.been.called;
    } finally {
      setTimeoutStub.restore();
    }
  });
});
