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
            getEvents: sinon.stub().returns([{eventType: 'auctionEnd', args: {replayMe: true}}]),
            onEvent: sinon.spy((type, handler) => registered.push({type, handler}))
        };

        // 1/sampling = 0.5; returning 0.25 triggers activation
        randomStub = sinon.stub(Math, 'random').returns(0.25);

        await registerEventsTracker(prebidGlobal, partnerId);

        // Expect second call to be a POST to ingest (replayed event)
        const posted = expectEventPostFetchCall(fetchStub, ingestUrl);
        expect(posted.event).to.equal('auctionEnd');
        expect(posted.payload.replayMe).to.equal(true);

        // And registration should have happened
        expect(registered.length).to.equal(1);
        expect(registered[0].type).to.equal('auctionEnd');
    });

    it('merges and applies additionalCleanupRules from server', async function () {
        const partnerId = 200;
        const ingestUrl = 'https://ingest/with-additional-rules';
        const cfgResponse = {
            sampling: 1,
            ingestUrl,
            eventsToTrack: ['auctionEnd'],
            additionalCleanupRules: {
                auctionEnd: [
                    { match: ['extra'], apply: 'erase' },
                    { match: ['nested', 'secret'], apply: 'redact' }
                ]
            }
        };

        fetchStub = makeFetchStub();
        stubConfigCall(fetchStub, partnerId, cfgResponse);

        const prebidGlobal = {
            version: '8.0.0',
            getEvents: sinon.stub().returns([
                { eventType: 'auctionEnd', args: { extra: 'remove-me', nested: { secret: 'hide', keep: 1 }, bidsReceived: [{ ad: '<div>creative</div>', keep: 1 }] } }
            ]),
            onEvent: sinon.spy()
        };

        await registerEventsTracker(prebidGlobal, partnerId);

        const posted = expectEventPostFetchCall(fetchStub, ingestUrl);
        expect(posted.event).to.equal('auctionEnd');
        // 'extra' should be removed by additional rule
        expect(posted.payload).to.not.have.property('extra');
        // nested.secret should be redacted by additional rule
        expect(posted.payload.nested.secret).to.equal('__ID5_REDACTED__');
        // default rules should still apply (e.g., erase ad in bidsReceived)
        expect(posted.payload.bidsReceived[0]).to.not.have.property('ad');
        // other fields are untouched
        expect(posted.payload.nested.keep).to.equal(1);
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
        const reason = await registerEventsTracker(prebidGlobal, partnerId).catch((e) => String(e));
        expect(reason).to.include('id5AnalyticsAdapter');

        expect(fetchStub).to.not.have.been.called;
        expect(prebidGlobal.onEvent).to.not.have.been.called;
    });
});

const ID5_REDACTED = '__ID5_REDACTED__';

describe('EventsTracker', function () {
  let fetchStub;

  beforeEach(function () {
    fetchStub = sinon.stub(window, 'fetch');
    // default resolve for POSTs
    fetchStub.callsFake(() => Promise.resolve({ ok: true }));
  });

  afterEach(function () {
    fetchStub.restore();
  });

  function lastFetchBody() {
    expect(fetchStub).to.have.been.called;
    const body = fetchStub.lastCall.args[1].body;
    return JSON.parse(body);
  }

    it('tracks events by posting to ingest URL with proper structure', function () {
        const tracker = new EventsTracker(1234, 10, 'https://ingest/id5', '8.1.0');

        const payload = {simple: 'value'};
        tracker.track('auctionEnd', payload);

        expect(fetchStub).to.have.been.calledOnce;
        const [url, opts] = fetchStub.firstCall.args;
        expect(url).to.equal('https://ingest/id5');
        expect(opts && opts.method).to.equal('POST');

        const posted = JSON.parse(opts.body);
        expect(posted).to.include({source: 'id5-api-js', event: 'auctionEnd', partnerId: 1234});
        expect(posted.meta).to.include({sampling: 10, pbjs: '8.1.0', version: version});
        // tz is a number; ensure present
        expect(posted.meta).to.have.property('tz');
        expect(posted.payload).to.deep.equal(payload);
    });

    it('applies AUCTION_END cleanup rules (redact/erase)', function () {
        const tracker = new EventsTracker(1, 1, 'https://ingest', 'x');

        const eventPayload = {
            adUnits: [{
                bids: [{
                    userId: {
                        id5id: {uid: '123', ext: {a: 1}},
                        otherId: 'shouldBeRedacted'
                    },
                    userIdAsEids: [{uids: [{id: 'abc', ext: {foo: 'bar'}}]}]
                }]
            }],
            bidderRequests: [{
                bids: [{
                    crumbs: {id5id: {uid: '456'}, something: 'shouldBeRedacted'}
                }],
                gdprConsent: {vendorData: {foo: 'bar'}, keep: 'keep'}
            }],
            bidsReceived: [{ad: '<div>creative</div>', keep: 1}],
            noBids: [{userId: {anything: 'shouldBeRedacted'}, userIdAsEids: [{uids: [{id: 'z', ext: {}}]}]}]
        };

        tracker.track('auctionEnd', eventPayload);

        const posted = lastFetchBody();
        const pl = posted.payload;

        // adUnits rules
        expect(pl.adUnits[0].bids[0].userId.otherId).to.equal(ID5_REDACTED);
        expect(pl.adUnits[0].bids[0].userId.id5id.uid).to.equal(ID5_REDACTED);
        expect(pl.adUnits[0].bids[0].userIdAsEids[0].uids[0].id).to.equal(ID5_REDACTED);
        expect(pl.adUnits[0].bids[0].userIdAsEids[0].uids[0].ext).to.equal(ID5_REDACTED);

        // bidderRequests rules
        expect(pl.bidderRequests[0].bids[0].crumbs.something).to.equal(ID5_REDACTED);
        // vendorData erased entirely
        expect(pl.bidderRequests[0].gdprConsent).to.not.have.property('vendorData');
        expect(pl.bidderRequests[0].gdprConsent.keep).to.equal('keep');

        // bidsReceived ad erased
        expect(pl.bidsReceived[0]).to.not.have.property('ad');

        // noBids rules
        expect(pl.noBids[0].userId.anything).to.equal(ID5_REDACTED);
        expect(pl.noBids[0].userIdAsEids[0].uids[0].id).to.equal(ID5_REDACTED);
    });

    it('applies BID_WON cleanup rules (erase ad/native)', function () {
        const tracker = new EventsTracker(1, 1, 'https://ingest', 'x');

        tracker.track('bidWon', {ad: '<creative>', native: {body: 'x'}, keep: true});

        const posted = lastFetchBody();
        expect(posted.payload).to.not.have.property('ad');
        expect(posted.payload).to.not.have.property('native');
        expect(posted.payload.keep).to.equal(true);
  });

  it('applies custom cleanup rules', function () {
    const customRules = {
      customEvent: [
        { match: ['sensitive'], apply: 'redact' },
        { match: ['toErase'], apply: 'erase' }
      ]
    };
    const tracker = new EventsTracker(7, 1, 'https://ingest/custom', 'x', customRules);

    tracker.track('customEvent', { sensitive: 'secret', toErase: 'remove', keep: 'ok' });

    const posted = lastFetchBody();
    expect(posted.event).to.equal('customEvent');
    expect(posted.payload.sensitive).to.equal(ID5_REDACTED);
    expect(posted.payload).to.not.have.property('toErase');
    expect(posted.payload.keep).to.equal('ok');
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
            tracker.track('auctionEnd', {a: 1});
        } finally {
            // restore to avoid affecting other tests (even though new instance each time)
            tracker.makeEvent = orig;
        }

        expect(fetchStub).to.have.been.calledOnce;
        const posted = lastFetchBody();
        // sendErrorEvent wraps single event in an array
        expect(Array.isArray(posted)).to.equal(true);
        expect(posted[0].event).to.equal('analyticsError');
        expect(posted[0].payload.message).to.equal('boom');
        expect(posted[0].payload.stack).to.be.a('string');
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
    window.pbjs = { que: { push: sinon.spy() } };
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
