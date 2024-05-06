import {expect} from 'chai';
import sinon from "sinon";
import {TrueLinkAdapter} from "../../src/trueLink.js";

describe('TrueLinkAdapter', function() {
  it('should return booted as false and id as undefined if the environment is not bootstrapped', function() {
    // Mocking the window object without the bootstrap property
    const trueLinkAdapter = new TrueLinkAdapter();
    const result = trueLinkAdapter.getTrueLink();
    expect(result.booted).to.be.false;
    expect(result.id).to.be.undefined;
  });

  it('should return booted as true and id as the true link ID if the environment is bootstrapped', function(){
    // Mocking the window object with the bootstrap property and a getTrueLinkId() function
    sinon.stub(window, 'bootstrap').returns({
      getTrueLinkInfo: () => {
        return {
          booted: true,
          redirected: false,
          id: 'trueLinkId123'
        }
      }
    });
    const trueLinkAdapter = new TrueLinkAdapter();
    const result = trueLinkAdapter.getTrueLink();
    expect(result.booted).to.be.true;
    expect(result.redirected).to.be.false;
    expect(result.id).to.equal('trueLinkId123');
  });
});