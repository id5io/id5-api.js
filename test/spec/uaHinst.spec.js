import { UaHints } from "../../lib/uaHints";

describe('filterUaHints', () => {
  it('filters correctly GREASE values', () => {
    const originalUaHints = {
      'architecture': 'x86',
      'brands': [
        {
          'brand': ' Not A;Brand',
          'version': '99'
        },
        {
          'brand': 'Chromium',
          'version': '101'
        },
        {
          'brand': 'Froogle Chrome',
          'version': '101'
        }
      ],
      'fullVersionList': [
        {
          'brand': ' Not A;Brand',
          'version': '99.0.0.0'
        },
        {
          'brand': 'Chromium',
          'version': '101.0.4951.64'
        },
        {
          'brand': 'Froogle Chrome',
          'version': '101.0.4951.64'
        }
      ],
      'mobile': false,
      'model': '',
      'platform': 'Linux',
      'platformVersion': '5.17.9'
    };

    const result = UaHints.filterUaHints(originalUaHints);
    expect(result).to.be.an('object');
    expect(result.architecture).to.equal('x86');
    expect(result.brands).to.have.lengthOf(2); // Note ' Not A;Brand' gets filtered
    expect(result.brands[0].brand).to.equal('Chromium');
    expect(result.brands[0].version).to.equal('101');
    expect(result.brands[1].brand).to.equal('Froogle Chrome');
    expect(result.brands[1].version).to.equal('101');
    expect(result.fullVersionList).to.have.lengthOf(2); // Note ' Not A;Brand' gets filtered
    expect(result.fullVersionList[0].brand).to.equal('Chromium');
    expect(result.fullVersionList[0].version).to.equal('101.0.4951.64');
    expect(result.fullVersionList[1].brand).to.equal('Froogle Chrome');
    expect(result.fullVersionList[1].version).to.equal('101.0.4951.64');
    expect(result.mobile).to.be.false;
    expect(result.model).to.equal('');
    expect(result.platform).to.equal('Linux');
    expect(result.platformVersion).to.equal('5.17.9');
  });
});
