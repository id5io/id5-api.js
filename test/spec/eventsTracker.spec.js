import initEventsTracker, {registerEventsTracker, EventsTracker} from '../../lib/prebid/eventsTracker.js';
import sinon from 'sinon';
import {version} from "../../generated/version.js";

function stubConfigCall(fetchStub, partnerId, cfgResponse) {
  fetchStub.callsFake((url) => {
    if (url.includes(`/analytics/${partnerId}/id5-api-js`)) {
      return Promise.resolve({json: () => Promise.resolve(cfgResponse)});
    } else {
      return Promise.reject("404");
    }
  });
}

describe('registerEventsTracker', function () {
  let fetchStub;
  let randomStub;

  function makeFetchStub() {
    return sinon.stub(window, 'fetch');
  }

  function expectEventPostFetchCall(fetchStub, ingestUrl) {
    // First call: config fetch, Second+ calls: event posts
    expect(fetchStub.callCount).to.be.greaterThan(1);
    const [url, opts] = fetchStub.getCall(1).args;
    expect(url).to.equal(ingestUrl);
    expect(opts && opts.method).to.equal('POST');
    const posted = JSON.parse(opts.body);
    expect(posted).to.have.property('event');
    expect(posted).to.have.property('payload');
    return posted;
  }

  afterEach(function () {
    if (fetchStub) fetchStub.restore();
    if (randomStub) randomStub.restore();
    fetchStub = null;
    randomStub = null;
  });

  it('fetches config, replays past events, and registers handlers', async function () {
    const partnerId = 1234;
    const ingestUrl = 'https://ingest/id5';
    const cfgResponse = {
      ingestUrl,
      sampling: 1,
      eventsToTrack: ['auctionEnd']
    };

    fetchStub = makeFetchStub();
    stubConfigCall(fetchStub, partnerId, cfgResponse);

    const registeredEventHandlers = [];
    const prebidGlobal = {
      version: '8.0.0',
      getEvents: sinon.stub().returns([
        {eventType: 'auctionEnd', args: {auctionId: 123}},
        {eventType: 'ignoredEvent', args: {nope: 1}}
      ]),
      onEvent: sinon.spy((type, handler) => registeredEventHandlers.push({type, handler}))
    };

    await registerEventsTracker(prebidGlobal, partnerId);

    // Verify config fetched
    expect(fetchStub).to.have.been.called;
    const firstCallUrl = fetchStub.firstCall.args[0];
    expect(firstCallUrl).to.include(`/analytics/${partnerId}/id5-api-js`);

    // Verify a replayed event was posted to ingest URL
    const posted = expectEventPostFetchCall(fetchStub, ingestUrl);
    expect(posted.event).to.equal('auctionEnd');
    expect(posted.payload.auctionId).to.equal(123);
    expect(posted.partnerId).to.equal(partnerId);

    // Verify a handler was registered for live events per eventsToTrack
    expect(registeredEventHandlers.length).to.equal(1);
    expect(registeredEventHandlers[0].type).to.equal('auctionEnd');

    // Simulate live event via registered handler -> should post again
    registeredEventHandlers[0].handler({auctionId: 456});

    // Third call should be a POST to ingest with live payload
    const thirdCallArgs = fetchStub.getCall(2).args;
    expect(thirdCallArgs[0]).to.equal(ingestUrl);
    const thirdPosted = JSON.parse(thirdCallArgs[1].body);
    expect(thirdPosted.event).to.equal('auctionEnd');
    expect(thirdPosted.payload.auctionId).to.equal(456);
  });

  it('does nothing (no replay/registration) when ingestUrl is missing in config', async function () {
    const partnerId = 55;
    const cfgResponse = {sampling: 1};

    fetchStub = makeFetchStub();
    stubConfigCall(fetchStub, partnerId, cfgResponse);

    const prebidGlobal = {
      version: '8.0.0',
      getEvents: sinon.stub().returns([{eventType: 'auctionEnd', args: {x: 1}}]),
      onEvent: sinon.spy()
    };

    await registerEventsTracker(prebidGlobal, partnerId);

    // Only one fetch call (config). No event posts due to missing ingestUrl
    expect(fetchStub.callCount).to.equal(1);
    expect(prebidGlobal.onEvent).to.not.have.been.called;
  });

  it('does not replay or register when eventsToTrack is empty', async function () {
    const partnerId = 77;
    const ingestUrl = 'https://ingest/url';
    const cfgResponse = {sampling: 1, ingestUrl, eventsToTrack: []};

    fetchStub = makeFetchStub();
    stubConfigCall(fetchStub, partnerId, cfgResponse);

    const prebidGlobal = {
      version: '8.0.0',
      getEvents: sinon.stub().returns([{eventType: 'auctionEnd', args: {y: 1}}]),
      onEvent: sinon.spy()
    };

    await registerEventsTracker(prebidGlobal, partnerId);

    // Config fetch only; no replay, no registration
    expect(fetchStub.callCount).to.equal(1);
    expect(prebidGlobal.onEvent).to.not.have.been.called;
  });

  it('does not start when sampling is 0 (disabled)', async function () {
    const partnerId = 88;
    const ingestUrl = 'https://ingest/sampling0';
    const cfgResponse = {sampling: 0, ingestUrl, eventsToTrack: ['auctionEnd']};

    fetchStub = makeFetchStub();
    stubConfigCall(fetchStub, partnerId, cfgResponse);

    const prebidGlobal = {
      version: '8.0.0',
      getEvents: sinon.stub().returns([{eventType: 'auctionEnd', args: {z: 1}}]),
      onEvent: sinon.spy()
    };

    // Stub Math.random to any value; should not matter since sampling==0 fails guard
    randomStub = sinon.stub(Math, 'random').returns(0.01);

    await registerEventsTracker(prebidGlobal, partnerId);

    // Only config call. No posts to ingest, no registration
    expect(fetchStub.callCount).to.equal(1);
    expect(prebidGlobal.onEvent).to.not.have.been.called;
  });

  it('does not start when random >= 1/sampling', async function () {
    const partnerId = 99;
    const ingestUrl = 'https://ingest/sampling2';
    const cfgResponse = {sampling: 2, ingestUrl, eventsToTrack: ['auctionEnd']};

    fetchStub = makeFetchStub();
    stubConfigCall(fetchStub, partnerId, cfgResponse);

    const prebidGlobal = {
      version: '8.0.0',
      getEvents: sinon.stub().returns([{eventType: 'auctionEnd', args: {shouldNot: 'replay'}}]),
      onEvent: sinon.spy()
    };

    // 1/sampling = 0.5; returning 0.75 prevents activation
    randomStub = sinon.stub(Math, 'random').returns(0.75);

    await registerEventsTracker(prebidGlobal, partnerId);

    // Only config call. No posts to ingest, no registration
    expect(fetchStub.callCount).to.equal(1);
    expect(prebidGlobal.onEvent).to.not.have.been.called;
  });

  it('starts when random < 1/sampling and performs replay/registration', async function () {
    const partnerId = 100;
    const ingestUrl = 'https://ingest/sampling2-yes';
    const cfgResponse = {sampling: 2, ingestUrl, eventsToTrack: ['auctionEnd']};

    fetchStub = makeFetchStub();
    stubConfigCall(fetchStub, partnerId, cfgResponse);

    const registered = [];
    const prebidGlobal = {
      version: '8.0.0',
      getEvents: sinon.stub().returns([{eventType: 'auctionEnd', args: {auctionId: "1234"}}]),
      onEvent: sinon.spy((type, handler) => registered.push({type, handler}))
    };

    // 1/sampling = 0.5; returning 0.25 triggers activation
    randomStub = sinon.stub(Math, 'random').returns(0.25);

    await registerEventsTracker(prebidGlobal, partnerId);

    // Expect second call to be a POST to ingest (replayed event)
    const posted = expectEventPostFetchCall(fetchStub, ingestUrl);
    expect(posted.event).to.equal('auctionEnd');
    expect(posted.payload).to.eql({auctionId: "1234"});

    // And registration should have happened
    expect(registered.length).to.equal(1);
    expect(registered[0].type).to.equal('auctionEnd');
  });


  it('skips initialization and does not fetch config when id5AnalyticsAdapter installed', async function () {
    fetchStub = sinon.stub(window, 'fetch');

    const prebidGlobal = {
      version: '8.0.0',
      installedModules: ['id5AnalyticsAdapter'],
      getEvents: sinon.stub().returns([]),
      onEvent: sinon.spy()
    };

    const partnerId = 321;
    const result = await registerEventsTracker(prebidGlobal, partnerId);
    expect(result).to.equal(false);

    expect(fetchStub).to.not.have.been.called;
    expect(prebidGlobal.onEvent).to.not.have.been.called;
  });
});


describe('EventsTracker', function () {
  let fetchStub;

  beforeEach(function () {
    fetchStub = sinon.stub(window, 'fetch');
    // default resolve for POSTs
    fetchStub.callsFake(() => Promise.resolve({ok: true}));
  });

  afterEach(function () {
    fetchStub.restore();
  });

  function lastFetchBody() {
    expect(fetchStub).to.have.been.called;
    const body = fetchStub.lastCall.args[1].body;
    return JSON.parse(body);
  }

  it('tracks bidWon events and filters payload to allowed fields (all allowed included, extras dropped)', function () {
    const tracker = new EventsTracker(1234, 10, 'https://ingest/id5', '8.1.0');

    const payload = {
      auctionId: 'auc-1',
      adUnitCode: 'div-1',
      bidderCode: 'bc-1',
      requestId: 'req-1',
      creativeId: 'cr-1',
      dealId: 'deal-1',
      responseTimestamp: 2002,
      requestTimestamp: 2001,
      width: 300,
      height: 250,
      netRevenue: true,
      mediaType: 'banner',
      originalCpm: 1.1,
      originalCurrency: 'USD',
      cpm: 1.23,
      currency: 'USD',
      // disallowed extras
      extra: 'drop-me',
      ad: '<creative>',
      native: {body: 'x'}
    };
    tracker.track('bidWon', payload);

    expect(fetchStub).to.have.been.calledOnce;
    const [url, opts] = fetchStub.firstCall.args;
    expect(url).to.equal('https://ingest/id5');
    expect(opts && opts.method).to.equal('POST');

    const posted = JSON.parse(opts.body);
    expect(posted).to.include({source: 'id5-api-js', event: 'bidWon', partnerId: 1234});
    expect(posted.meta).to.include({sampling: 10, pbjs: '8.1.0', version: version});
    expect(posted.meta).to.have.property('tz');
    // only allowed fields present
    expect(posted.payload).to.eql({
      auctionId: 'auc-1',
      bidderCode: 'bc-1',
      adUnitCode: 'div-1',
      requestId: 'req-1',
      creativeId: 'cr-1',
      dealId: 'deal-1',
      responseTimestamp: 2002,
      requestTimestamp: 2001,
      width: 300,
      height: 250,
      netRevenue: true,
      mediaType: 'banner',
      originalCpm: 1.1,
      originalCurrency: 'USD',
      cpm: 1.23,
      currency: 'USD'
    });
  });

  it('tracks auctionEnd and filters payload: includes all allowed fields and drops extras', function () {
    const tracker = new EventsTracker(42, 5, 'https://ingest/ae', '9.0.0');

    const payload = {
      auctionId: 'auc-42',
      timestamp: 1111,
      auctionEnd: 2222,
      bidsReceived: [{
        adUnitCode: 'au-1',
        bidderCode: 'bidderA',
        requestId: 'req-1',
        creativeId: 'cr-1',
        dealId: 'deal-1',
        responseTimestamp: 2002,
        requestTimestamp: 2001,
        width: 300,
        height: 250,
        netRevenue: true,
        mediaType: 'banner',
        originalCpm: 1.1,
        originalCurrency: 'USD',
        cpm: 1.23,
        currency: 'USD',
        extraBR: 'x' // extra field to be dropped
      }],
      noBids: [{bidId: 'nb-1', extraNB: 'x'}],
      bidderRequests: [{
        bidderCode: 'bidderA',
        extraBRQ: 'x',
        ortb2: {
          user: {
            ext: {
              eids: [
                {source: 'id5-sync.com', uids: [{ext: {linkType: 9, pba: 'brq', abTestingControlGroup: false}}]},
                {source: 'other-source.com', uids: [{id: 'shouldNotBeIncluded'}]}
              ]
            }
          }
        },
        bids: [{
          adUnitCode: 'au-1',
          bidId: 'b-1',
          userId: {
            id5id: {uid: "abc", ext: {linkType: 1, pba: 'abc', abTestingControlGroup: true, extra: 'x'}},
            u1: {
              uid: "u1",
              ignore: "u1-specific"
            },
            u2: {
              uid: "u2"
            }
          },
          ortb2: {
            user: {
              ext: {
                eids: [
                  {source: 'id5-sync.com', uids: [{ext: {linkType: 7, pba: 'bid', abTestingControlGroup: true}}]},
                  {source: 'another.com', uids: [{id: 'nope'}]}
                ]
              }
            }
          },
          userIdAsEids: [
            {source: 'id5-sync.com', uids: [{ext: {linkType: 5, pba: 'eids'}}]},
            {source: 'third.com', uids: [{id: 'blocked'}]}
          ],
          extraB: 'x'
        }]
      }],
      extraTop: true
    };

    tracker.track('auctionEnd', payload);

    const posted = lastFetchBody();
    expect(posted.event).to.equal('auctionEnd');
    // top-level allowed
    expect(posted.payload).to.eql({
      auctionId: 'auc-42',
      timestamp: 1111,
      auctionEnd: 2222,
      bidsReceived: [{
        adUnitCode: 'au-1',
        bidderCode: 'bidderA',
        requestId: 'req-1',
        creativeId: 'cr-1',
        dealId: 'deal-1',
        responseTimestamp: 2002,
        requestTimestamp: 2001,
        width: 300,
        height: 250,
        netRevenue: true,
        mediaType: 'banner',
        originalCpm: 1.1,
        originalCurrency: 'USD',
        cpm: 1.23,
        currency: 'USD'
      }],
      noBids: [{bidId: 'nb-1'}],
      bidderRequests: [{
        bidderCode: 'bidderA',
        ortb2: {
          user: {
            ext: {
              eids: [
                {source: 'id5-sync.com', uids: [{ext: {linkType: 9, pba: 'brq', abTestingControlGroup: false}}]},
                {source: 'other-source.com'}
              ]
            }
          }
        },
        bids: [{
          adUnitCode: 'au-1',
          bidId: 'b-1',
          userId: {
            id5id: {ext: {linkType: 1, pba: 'abc', abTestingControlGroup: true}},
            u1: 1,
            u2: 1
          },
          ortb2: {
            user: {
              ext: {
                eids: [
                  {source: 'id5-sync.com', uids: [{ext: {linkType: 7, pba: 'bid', abTestingControlGroup: true}}]},
                  {source: 'another.com'}
                ]
              }
            }
          },
          userIdAsEids: [
            {source: 'id5-sync.com', uids: [{ext: {linkType: 5, pba: 'eids'}}]},
            {source: 'third.com'}
          ]
        }]
      }]
    });
  });

  it('sends analyticsError when makeEvent throws', function () {
    const tracker = new EventsTracker(1, 1, 'https://ingest', 'x');
    const error = new Error('boom');

    const orig = tracker.makeEvent;
    // makeEvent fails only for 'auctionEnd'
    tracker.makeEvent = function (event, payload) {
      if (event === 'auctionEnd') {
        throw error;
      } else {
        return orig.call(this, event, payload);
      }
    };

    try {
      tracker.track('auctionEnd', {auctionId: "1"});
    } finally {
      // restore to avoid affecting other tests (even though new instance each time)
      tracker.makeEvent = orig;
    }

    expect(fetchStub).to.have.been.calledOnce;
    const posted = lastFetchBody();
    expect(posted.event).to.equal('analyticsError');
    expect(posted.payload.message).to.equal('boom');
    expect(posted.payload.stack).to.be.a('string');
  });
});


describe('initEventsTracker', function () {
  let originalPbjs;
  let originalFlag;

  beforeEach(function () {
    // Save and reset globals
    originalPbjs = window.pbjs;
    originalFlag = window.id5_pbjs_et;
    delete window.id5_pbjs_et;
    window.pbjs = {que: {push: sinon.spy()}};
  });

  afterEach(function () {
    // Restore globals
    if (originalPbjs === undefined) {
      delete window.pbjs;
    } else {
      window.pbjs = originalPbjs;
    }
    if (originalFlag === undefined) {
      delete window.id5_pbjs_et;
    } else {
      window.id5_pbjs_et = originalFlag;
    }
  });

  it('registers only once for the same partnerId', function () {
    const pushSpy = window.pbjs.que.push;
    initEventsTracker(4242);
    initEventsTracker(4242);

    expect(pushSpy.callCount).to.equal(1);
    expect(window.id5_pbjs_et).to.be.an('object');
    expect(window.id5_pbjs_et[4242]).to.equal(true);
  });

  it('registers independently for different partnerIds', function () {
    const pushSpy = window.pbjs.que.push;
    initEventsTracker(1);
    initEventsTracker(2);

    expect(pushSpy.callCount).to.equal(2);
    expect(window.id5_pbjs_et[1]).to.equal(true);
    expect(window.id5_pbjs_et[2]).to.equal(true);
  });
});
