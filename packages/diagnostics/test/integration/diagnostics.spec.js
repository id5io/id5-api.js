import {createPublisher, MeterRegistry, partnerTag} from '@id5io/diagnostics';
import mockttp from 'mockttp';
import {expect} from 'chai';

const COMMON_TAGS = {source: 'api', version: '1.1.1', ...partnerTag(123)};

describe('Diagnostics', function () {
  /**
   * @type {MeterRegistry}
   */
  let registry;
  let publisher;
  let testStartTime;

  let server;
  let measurementsEndpointMock;
  before(async () => {
    server = mockttp.getLocal();
    await server.start();
  });

  after(async () => {
    server.stop();
  });

  beforeEach(async () => {
    publisher = createPublisher(1, server.urlFor('/measurements'));
    registry = new MeterRegistry(COMMON_TAGS);
    testStartTime = Date.now();
    measurementsEndpointMock = await server.forPost('/measurements').thenReply(202, '');
  });

  it('should collect and publish measurements', async () => {
    // given
    let timer = registry.timer('timer.name');
    let counter = registry.counter('counter.name');
    let summary = registry.summary('summary.name', {
      leader: true
    });

    // when

    // timer
    timer.record(2);
    timer.recordNow();

    let timeMeasure = timer.startMeasurement();
    await sleepMs(10);
    timeMeasure.record();

    // counter
    counter.inc();
    counter.inc(10);

    // summary
    summary.record(10);
    summary.record(20);

    await registry.publish(publisher);

    // then
    let requests = await measurementsEndpointMock.getSeenRequests();

    expect(requests.length).is.eq(1);
    let request = await requests[0].body.getJson();
    expect(request.measurements).is.not.null;
    expect(request.measurements.length).is.eq(3);

    let timerMeasurement = request.measurements[0];
    expect(timerMeasurement.name).is.eq('timer.name');
    expect(timerMeasurement.type).is.eq('TIMER');
    expect(timerMeasurement.tags).is.deep.eq({
      version: '1.1.1',
      partner: '123',
      source: 'api'
    });
    expect(timerMeasurement.values.length).is.eq(3);
    expect(timerMeasurement.values[0].value).is.eq(2);
    expect(timerMeasurement.values[0].timestamp).is.greaterThanOrEqual(testStartTime);

    expect(timerMeasurement.values[1].value).is.not.null;
    expect(timerMeasurement.values[1].timestamp).is.greaterThanOrEqual(timerMeasurement.values[0].timestamp);

    expect(timerMeasurement.values[2].value).is.greaterThanOrEqual(10);
    expect(timerMeasurement.values[2].timestamp).is.greaterThanOrEqual(timerMeasurement.values[1].timestamp);

    let counterMeasurement = request.measurements[1];
    expect(counterMeasurement.name).is.eq('counter.name');
    expect(counterMeasurement.type).is.eq('COUNTER');
    expect(counterMeasurement.tags).is.deep.eq({
      version: '1.1.1',
      partner: '123',
      source: 'api'
    });
    expect(counterMeasurement.values.length).is.eq(1);
    expect(counterMeasurement.values[0].value).is.eq(11);
    expect(counterMeasurement.values[0].timestamp).is.greaterThanOrEqual(testStartTime);

    let summaryMeasurement = request.measurements[2];
    expect(summaryMeasurement.name).is.eq('summary.name');
    expect(summaryMeasurement.type).is.eq('SUMMARY');
    expect(summaryMeasurement.tags).is.deep.eq({
      version: '1.1.1',
      partner: '123',
      leader: 'true',
      source: 'api'
    });
    expect(summaryMeasurement.values.length).is.eq(2);
    expect(summaryMeasurement.values[0].value).is.eq(10);
    expect(summaryMeasurement.values[0].timestamp).is.greaterThanOrEqual(testStartTime);
    expect(summaryMeasurement.values[1].value).is.greaterThanOrEqual(20);
    expect(summaryMeasurement.values[1].timestamp).is.greaterThanOrEqual(summaryMeasurement.values[1].timestamp);
  });

  it('should publish only not yet published measurements', async () => {
    // given
    let summaryA = registry.summary('name.a', {partner: '123'});
    let summaryB = registry.summary('name.b', {partner: '123'});

    // when
    summaryA.record(10);
    summaryB.record(10);

    await registry.publish(publisher);
    summaryA.record(20);

    await registry.publish(publisher);

    // then
    let requests = await measurementsEndpointMock.getSeenRequests();

    expect(requests.length).is.eq(2);
    let firstRequest = await requests[0].body.getJson();
    expect(firstRequest.measurements.length).is.eq(2);
    expect(firstRequest.measurements[0].name).is.eq('name.a');
    expect(firstRequest.measurements[0].values[0].value).is.eq(10);
    expect(firstRequest.measurements[1].name).is.eq('name.b');
    expect(firstRequest.measurements[1].values[0].value).is.eq(10);

    let secondRequest = await requests[1].body.getJson();
    expect(secondRequest.measurements.length).is.eq(1);
    expect(secondRequest.measurements[0].name).is.eq('name.a');
    expect(secondRequest.measurements[0].values[0].value).is.eq(20);
  });

  function sleepMs(ms) {
    return new Promise((resolve, _) => setTimeout(resolve, ms));
  }
});
