import sinon from 'sinon';
import { TargetingTags } from '../../lib/targetingTags.js';

describe('TargetingTags', function () {
  let sandbox;
  let mockGoogletag;

  beforeEach(function () {
    sandbox = sinon.createSandbox();
    mockGoogletag = {
      cmd: [],
      setConfig: sandbox.stub()
    };
    window.googletag = mockGoogletag;
  });

  afterEach(function () {
    sandbox.restore();
    delete window.googletag;
    delete window.id5tags;
  });

  it('should not set targeting if gamTargetingPrefix is not set', function () {
    const userId = {
      responseObj: {
        universal_uid: 'ID5*test123',
        ab_testing: { result: 'normal' },
        enrichment: { enriched: true }
      }
    };
    const options = {};

    TargetingTags.updateTargeting(userId, options.gamTargetingPrefix);

    // Execute the command that was pushed to googletag.cmd
    if (mockGoogletag.cmd.length > 0) {
      mockGoogletag.cmd[0]();
    }

    expect(mockGoogletag.setConfig.called).to.be.false;
  });

  it('should set targeting based on tags passed from fetch', function () {
    const userId = {
      responseObj: {
        "tags": {
          "id": "y",
          "ab": "n",
          "enrich": "s"
        }
      }
    };
    const options = { gamTargetingPrefix: 'id5' };

    TargetingTags.updateTargeting(userId, options.gamTargetingPrefix);

    // Execute the command that was pushed to googletag.cmd
    mockGoogletag.cmd[0]();

    expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_id': 'y'}})).to.be.true;
    expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_ab': 'n'}})).to.be.true;
    expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_enrich': 's'}})).to.be.true;
  });

  describe('exposeTargeting', function () {
    let clock;
    beforeEach(function () {
      clock = sandbox.useFakeTimers();
    });

    it('should not expose targeting if exposeTargeting is not enabled', function () {
      const userId = {
        responseObj: {
          'tags': {
            'id': 'y',
            'ab': 'n'
          }
        }
      };
      TargetingTags.updateTargeting(userId, undefined, false);
      expect(window.id5tags).to.be.undefined;
    });

    it('should not expose targeting if tags not returned from server', function () {
      const userId = {
        responseObj: {}
      };
      TargetingTags.updateTargeting(userId, undefined, true);
      expect(window.id5tags).to.be.undefined;
    });

    it('should create id5tags.cmd when it does not exist pre-decode', function () {
      const testTags = {
        'id': 'y',
        'ab': 'n'
      };
      const userId = {
        responseObj: {
          'tags': testTags
        }
      };
      TargetingTags.updateTargeting(userId, undefined, true);

      expect(window.id5tags).to.exist;
      expect(window.id5tags.cmd).to.be.an('array');
      expect(window.id5tags.tags).to.deep.equal(testTags);
    });

    it('should execute queued functions when cmd was created earlier', function () {
      const testTags = {
        'id': 'y',
        'ab': 'n',
        'enrich': 'y'
      };
      const userId = {
        responseObj: {
          'tags': testTags
        }
      };

      const callTracker = [];
      // Pre-create id5tags with queued functions
      window.id5tags = {
        cmd: [
          (tags) => callTracker.push({call: 1, tags: tags}),
          (tags) => callTracker.push({call: 2, tags: tags}),
          (tags) => callTracker.push({call: 3, tags: tags})
        ]
      };

      TargetingTags.updateTargeting(userId, undefined, true);

      clock.tick(0);

      // Verify all queued functions were called with the tags
      expect(callTracker).to.have.lengthOf(3);
      expect(callTracker[0]).to.deep.equal({call: 1, tags: testTags});
      expect(callTracker[1]).to.deep.equal({call: 2, tags: testTags});
      expect(callTracker[2]).to.deep.equal({call: 3, tags: testTags});

      // Verify tags were stored
      expect(window.id5tags.tags).to.deep.equal(testTags);
    });

    it('should override push method to execute functions immediately', function () {
      const testTags = {
        'id': 'y',
        'ab': 'n'
      };
      const userId = {
        responseObj: {
          'tags': testTags
        }
      };

      TargetingTags.updateTargeting(userId, undefined, true);

      // Now push a new function and verify it executes immediately
      let callResult = null;
      window.id5tags.cmd.push((tags) => {
        callResult = {executed: true, tags: tags};
      });

      expect(callResult).to.not.be.null;
      expect(callResult.executed).to.be.true;
      expect(callResult.tags).to.deep.equal(testTags);
    });

    it('should retrigger functions when tags are different but not when tags are the same', function () {
      const firstTags = {
        'id': 'y',
        'ab': 'n'
      };
      const secondTags = {
        'id': 'y',
        'ab': 'y',
        'enrich': 'y'
      };

      const firstUserId = {
        responseObj: {
          'tags': firstTags
        }
      };

      const callTracker = [];

      // First call
      window.id5tags = {
        cmd: [
          (tags) => {
            callTracker.push({call: 'first', tags: Object.assign({}, tags)});
          }
        ]
      };

      TargetingTags.updateTargeting(firstUserId, undefined, true);
      clock.tick(0);

      expect(callTracker).to.have.lengthOf(1);
      expect(callTracker[0].tags).to.deep.equal(firstTags);

      // Second call with different tags - should retrigger
      const secondUserId = {
        responseObj: {
          'tags': secondTags
        }
      };

      TargetingTags.updateTargeting(secondUserId, undefined, true);
      clock.tick(0);

      // The queued function should be called again with new tags
      expect(callTracker).to.have.lengthOf(2);
      expect(callTracker[1].tags).to.deep.equal(secondTags);
      expect(window.id5tags.tags).to.deep.equal(secondTags);

      // Third call with identical tags content - should NOT retrigger
      const thirdUserId = {
        responseObj: {
          'tags': {
            'id': 'y',
            'ab': 'y',
            'enrich': 'y'
          }
        }
      };

      TargetingTags.updateTargeting(thirdUserId, undefined, true);
      clock.tick(0);

      expect(callTracker).to.have.lengthOf(2);
      expect(window.id5tags.tags).to.deep.equal(secondTags);
    });

    it('should handle when someone else has set id5tags.cmd earlier', function () {
      const testTags = {
        'id': 'y',
        'ab': 'n'
      };
      const userId = {
        responseObj: {
          'tags': testTags
        }
      };

      const externalCallTracker = [];

      // External script creates id5tags
      window.id5tags = {
        cmd: [],
        externalData: 'some-external-value'
      };

      // Add external function
      window.id5tags.cmd.push((tags) => {
        externalCallTracker.push({external: true, tags: tags});
      });

      TargetingTags.updateTargeting(userId, undefined, true);
      clock.tick(0);

      // External function should be called
      expect(externalCallTracker).to.have.lengthOf(1);
      expect(externalCallTracker[0].external).to.be.true;
      expect(externalCallTracker[0].tags).to.deep.equal(testTags);

      // External data should be preserved
      expect(window.id5tags.externalData).to.equal('some-external-value');

      // Tags should be set
      expect(window.id5tags.tags).to.deep.equal(testTags);
    });

    it('should work with both gamTargetingPrefix and exposeTargeting enabled', function () {
      const testTags = {
        'id': 'y',
        'ab': 'n'
      };
      const userId = {
        responseObj: {
          'tags': testTags
        }
      };

      const callTracker = [];
      window.id5tags = {
        cmd: [(tags) => {
          callTracker.push(tags);
        }]
      };

      TargetingTags.updateTargeting(userId, 'id5', true);
      clock.tick(0);
      mockGoogletag.cmd[0]();

      // Both mechanisms should work
      expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_id': 'y'}})).to.be.true;
      expect(callTracker).to.have.lengthOf(1);
      expect(callTracker[0]).to.deep.equal(testTags);
      expect(window.id5tags.tags).to.deep.equal(testTags);
    });
  });
});
