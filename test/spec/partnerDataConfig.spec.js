import {convertPartnerDataToPd} from '../../lib/partnerDataConfig.js';
import {InvocationLogger} from '../../lib/utils.js';

describe('partnerDataConfig', function () {
  let log;

  beforeEach(function () {
    log = new InvocationLogger('test', 1);
  });

  describe('convertPartnerDataToPd', function () {
    it('should convert semantic keys to numeric keys', async function () {
      const partnerData = {
        ua: 'Mozilla/5.0',
        ipv4: '192.168.1.1'
      };

      const result = await convertPartnerDataToPd(partnerData, log);

      expect(result).to.be.a('string');
      const decoded = atob(result);
      expect(decoded).to.include('12=Mozilla'); // ua → 12
      expect(decoded).to.include('10=192.168'); // ipv4 → 10
    });

    it('should auto-hash unhashed email', async function () {
      const partnerData = {
        hem: 'User@Example.com'
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      // Email normalized to 'user@example.com' (lowercase) then SHA256 hashed
      expect(decoded).to.equal('1=b4c9a289323b21a01c3e940f150eb9b8c542587f1abfd8f0e1cc1ffc5e475514');
    });

    it('should normalize email before hashing', async function () {
      const partnerData1 = { hem: 'test@gmail.com' };
      const partnerData2 = { hem: 'test+spam@gmail.com' };
      const partnerData3 = { hem: 't.e.s.t@gmail.com' };

      const result1 = await convertPartnerDataToPd(partnerData1, log);
      const result2 = await convertPartnerDataToPd(partnerData2, log);
      const result3 = await convertPartnerDataToPd(partnerData3, log);

      // All should normalize to same hash
      expect(result1).to.equal(result2);
      expect(result1).to.equal(result3);
    });

    it('should accept pre-hashed email', async function () {
      const hash = 'f97ea86ed181d60b0ba62a30579f1e10ad71eaf21b548e173de75718065c533f';
      const partnerData = { hem: hash };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.equal(`1=${hash}`);
    });

    [
      ['missing @', 'notanemail'],
      ['multiple @', 'user@domain@com'],
      ['empty local part', '@example.com'],
      ['empty domain part', 'user@'],
      ['empty string', ''],
      ['only whitespace', '   ']
    ].forEach(([testCase, invalidEmail]) => {
      it(`should skip invalid email - ${testCase}`, async function () {
        const partnerData = { hem: invalidEmail };

        const result = await convertPartnerDataToPd(partnerData, log);

        expect(result).to.be.undefined; // No valid entries
      });
    });

    it('should process other fields when email is invalid', async function () {
      const partnerData = {
        hem: 'notanemail',  // Invalid - will be skipped
        ua: 'Mozilla/5.0'   // Valid - will be included
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.equal('12=Mozilla%2F5.0'); // Only ua, no hem
      expect(decoded).to.not.include('1='); // hem was skipped
    });

    it('should auto-hash unhashed phone number', async function () {
      const partnerData = { phone: '+1234567890' };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      // Phone hashed as-is (no normalization) with SHA256
      expect(decoded).to.equal('2=422ce82c6fc1724ac878042f7d055653ab5e983d186e616826a72d4384b68af8');
    });

    it('should trim whitespace from phone before hashing', async function () {
      const result1 = await convertPartnerDataToPd({ phone: '+1234567890' }, log);
      const result2 = await convertPartnerDataToPd({ phone: '  +1234567890  ' }, log);

      expect(result1).to.equal(result2);
    });

    it('should accept pre-hashed phone', async function () {
      const hash = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
      const partnerData = { phone: hash };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.equal(`2=${hash}`);
    });

    it('should lowercase MAID values', async function () {
      const partnerData = {
        idfa: 'EA7583CD-A667-48BC-B806-42ECB2B48606',
        gaid: 'ABCDEF12-3456-7890-ABCD-EF1234567890',
        idfv: 'FEDCBA09-8765-4321-FEDC-BA0987654321'
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.include('6=ea7583cd-a667-48bc-b806-42ecb2b48606'); // idfa
      expect(decoded).to.include('7=abcdef12-3456-7890-abcd-ef1234567890'); // gaid
      expect(decoded).to.include('14=fedcba09-8765-4321-fedc-ba0987654321'); // idfv
    });

    it('should URL-encode values', async function () {
      const partnerData = {
        ua: 'Mozilla/5.0 (Test & Special=Chars)'
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.include('12=Mozilla%2F5.0');
      expect(decoded).to.include('%26'); // & encoded
      expect(decoded).to.include('%3D'); // = encoded
    });

    it('should skip unknown semantic keys', async function () {
      const partnerData = {
        ua: 'valid',
        unknownKey: 'invalid',
        anotherBadKey: 'also invalid'
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.equal('12=valid'); // Only ua processed
      expect(decoded).to.not.include('unknownKey');
      expect(decoded).to.not.include('anotherBadKey');
    });

    it('should skip non-string values', async function () {
      const partnerData = {
        ua: 'valid',
        ipv4: 123, // number, should be rejected
        url: null, // null, should be rejected
        domain: undefined // undefined, should be rejected
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.equal('12=valid'); // Only ua processed
    });

    it('should process keys in sorted order for consistency', async function () {
      const partnerData = {
        ua: 'agent',
        hem: 'a'.repeat(64),
        ipv4: '1.2.3.4',
        puid: 'user'
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      // Keys should be sorted: hem(1), ipv4(10), puid(5), ua(12)
      // In alphabetical order of semantic keys: hem, ipv4, puid, ua
      const parts = decoded.split('&');
      expect(parts[0]).to.match(/^1=/); // hem
      expect(parts[1]).to.match(/^10=/); // ipv4
      expect(parts[2]).to.match(/^5=/); // puid
      expect(parts[3]).to.match(/^12=/); // ua
    });

    it('should handle all supported semantic keys', async function () {
      const hash = 'a'.repeat(64);
      const partnerData = {
        other: 'other-value',
        hem: hash,
        phone: hash,
        xpuid: 'xpuid-value',
        xpuidSource: 'source',
        puid: 'puid-value',
        idfa: 'IDFA-VALUE',
        gaid: 'GAID-VALUE',
        url: 'https://example.com',
        domain: 'example.com',
        ipv4: '192.168.1.1',
        ipv6: '2001:db8::1',
        ua: 'Mozilla/5.0',
        isBurnerEmail: 'false',
        idfv: 'IDFV-VALUE',
        iabToken: 'token-value'
      };

      const result = await convertPartnerDataToPd(partnerData, log);
      const decoded = atob(result);

      expect(decoded).to.include('0=other-value'); // other
      expect(decoded).to.include('1=aaa'); // hem
      expect(decoded).to.include('2=aaa'); // phone
      expect(decoded).to.include('3=xpuid-value'); // xpuid
      expect(decoded).to.include('4=source'); // xpuidSource
      expect(decoded).to.include('5=puid-value'); // puid
      expect(decoded).to.include('6=idfa-value'); // idfa (lowercased)
      expect(decoded).to.include('7=gaid-value'); // gaid (lowercased)
      expect(decoded).to.include('8=https'); // url
      expect(decoded).to.include('9=example.com'); // domain
      expect(decoded).to.include('10=192.168.1.1'); // ipv4
      expect(decoded).to.include('11=2001'); // ipv6
      expect(decoded).to.include('12=Mozilla'); // ua
      expect(decoded).to.include('13=false'); // isBurnerEmail
      expect(decoded).to.include('14=idfv-value'); // idfv (lowercased)
      expect(decoded).to.include('17=token-value'); // iabToken
    });

    it('should return undefined for invalid partnerData type', async function () {
      const result1 = await convertPartnerDataToPd('not an object', log);
      const result2 = await convertPartnerDataToPd(null, log);
      const result3 = await convertPartnerDataToPd(undefined, log);
      const result4 = await convertPartnerDataToPd(123, log);

      expect(result1).to.be.undefined;
      expect(result2).to.be.undefined;
      expect(result3).to.be.undefined;
      expect(result4).to.be.undefined;
    });

    it('should return undefined when no valid entries', async function () {
      const partnerData = {
        unknownKey1: 'value1',
        unknownKey2: 'value2'
      };

      const result = await convertPartnerDataToPd(partnerData, log);

      expect(result).to.be.undefined;
    });

    it('should handle empty object', async function () {
      const partnerData = {};

      const result = await convertPartnerDataToPd(partnerData, log);

      expect(result).to.be.undefined;
    });
  });
});
