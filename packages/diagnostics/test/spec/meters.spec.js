import {Counter, MeterType, Summary, TimeMeasurement, Timer} from '../../src/meters.js';
import sinon from 'sinon';
import chai, {expect} from 'chai';
import sinonChai from "sinon-chai";

chai.should();
chai.use(sinonChai);

describe('Meters', function () {
  let perfNowStub;
  let dateStub;

  beforeEach(function () {
    perfNowStub = sinon.stub(performance, 'now');
    dateStub = sinon.stub(Date, 'now');
    dateStub.returns(1);
  });

  afterEach(function () {
    perfNowStub.restore();
    dateStub.restore();
  });

  describe('TimeMeasurement', function (){

    it('should measure elapsed ms time and record', function () {
      // given

      let timer = new Timer('name');
      let recordStub = sinon.stub(timer, 'record');

      // when
      perfNowStub.returns(123.234);
      let tm = new TimeMeasurement(timer);
      perfNowStub.returns(234.872);
      let elapsedTime = tm.record();

      // then
      elapsedTime.should.be.eq(111); // 234 - 123
      recordStub.should.be.calledWith(elapsedTime);
    });

    it('should measure elapsed ms time and record in provided timer', function () {
      // given
      let timer = new Timer('name');
      let recordStub = sinon.stub(timer, 'record');

      // when
      perfNowStub.returns(123.234);
      let tm = new TimeMeasurement();
      perfNowStub.returns(234.872);
      let elapsedTime = tm.record(timer);

      // then
      elapsedTime.should.be.eq(111); // 234 - 123
      recordStub.should.be.calledWith(elapsedTime);
    });

  });
  describe('Timer', function () {
    it('should create timer', function () {
      // when
      let timer = new Timer('a.b.c', {t1: 'vT'});
      // then
      expect(timer.name).is.equal('a.b.c');
      expect(timer.tags).is.deep.equal({t1: 'vT'});
      expect(timer.type).is.equal(MeterType.TIMER);
      expect(timer.values).is.deep.equal([]);
    });

    it('should record values', function () {
      // given
      let timer = new Timer('name', {t1: 'vT'});

      // when
      dateStub.returns(111);
      timer.record(0.1);

      expect(timer.values).is.deep.equal([{
        value: 0.1,
        timestamp: 111
      }]);
      // when
      dateStub.returns(222);
      timer.record(0.2);

      // then
      expect(timer.values).is.deep.equal([{
        value: 0.1,
        timestamp: 111
      }, {
        value: 0.2,
        timestamp: 222
      }]);
    });

    it('should start measurement and record elapsed time value with ms precision', function () {
      // given
      let startTime = 0.1234567;
      let timer = new Timer('name', {t1: 'vT'});
      perfNowStub.returns(startTime);
      dateStub.returns(111);

      let timerMeasure = timer.startMeasurement();
      // when
      let endTime = 10.876542;
      perfNowStub.returns(endTime);
      timerMeasure.record();

      // then
      expect(timer.values).is.deep.equal([{
        value: 10,
        timestamp: 111
      }]);
    });

    it('should record performance elapsed time value with ms precision', function () {
      // given
      perfNowStub.returns(1234567.65473);
      dateStub.returns(33333);
      let timer = new Timer('name', {t1: 'vT'});

      // when
      timer.recordNow();

      // then
      expect(timer.values).is.deep.equal([{
        value: 1234567,
        timestamp: 33333
      }]);
    });
  });

  describe('Counter', function () {
    it('should create counter', function () {
      // when
      let counter = new Counter('a.b.c', {t1: 'vT'});

      // then
      expect(counter.name).is.equal('a.b.c');
      expect(counter.tags).is.deep.equal({t1: 'vT'});
      expect(counter.type).is.equal(MeterType.COUNTER);
      expect(counter.values).is.deep.equal([]);
    });

    it('should increase value ', function () {
      // given
      let counter = new Counter('name', {t1: 'vT'});

      // when
      dateStub.returns(1);
      let currentValue =  counter.inc();

      // then
      expect(counter.values).is.deep.equal([{
        value: 1,
        timestamp: 1
      }]);
      expect(currentValue).is.eq(1);

      // when
      dateStub.returns(10);
      currentValue = counter.inc();

      // then
      expect(counter.values).is.deep.equal([{
        value: 2,
        timestamp: 10
      }]);
      expect(currentValue).is.eq(2);

      // when
      dateStub.returns(100);
      currentValue = counter.inc(3);

      // then
      expect(counter.values).is.deep.equal([{
        value: 5,
        timestamp: 100
      }]);
      expect(currentValue).is.eq(5);
    });
  });

  describe('Summary', function () {
    it('should create summary', function () {
      // when
      let summary = new Summary('a.b.c', {t1: 'vT'});

      // then
      expect(summary.name).is.equal('a.b.c');
      expect(summary.tags).is.deep.equal({t1: 'vT'});
      expect(summary.type).is.equal(MeterType.SUMMARY);
      expect(summary.values).is.deep.equal([]);
    });

    it('should record values', function () {
      // given
      let summary = new Summary('name', {t1: 'vT'});

      // when
      dateStub.returns(111);
      summary.record(0.1);

      expect(summary.values).is.deep.equal([{
        value: 0.1,
        timestamp: 111
      }]);
      // when
      dateStub.returns(222);
      summary.record(0.2);

      // then
      expect(summary.values).is.deep.equal([{
        value: 0.1,
        timestamp: 111
      }, {
        value: 0.2,
        timestamp: 222
      }]);
    });
  });
});
