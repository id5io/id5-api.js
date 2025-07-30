import sinon from 'sinon';
import { GamTargeting } from '../../lib/gamTargeting.js';

describe('GamTargeting', function () {
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

    GamTargeting.updateTargeting(userId, options.gamTargetingPrefix);

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

    GamTargeting.updateTargeting(userId, options.gamTargetingPrefix);

    // Execute the command that was pushed to googletag.cmd
    mockGoogletag.cmd[0]();

    expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_id': 'y'}})).to.be.true;
    expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_ab': 'n'}})).to.be.true;
    expect(mockGoogletag.setConfig.calledWith({targeting: {'id5_enrich': 's'}})).to.be.true;
  });

});
