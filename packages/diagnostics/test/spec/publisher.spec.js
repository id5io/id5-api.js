import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chai from 'chai';
import {MeasurementsPublisher} from '../../src/publisher.js';

chai.should();
chai.use(sinonChai);

const URL = 'http://measurements.url';

describe('Publisher', function () {
  let fetchStub;

  beforeEach(function () {
    fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.returns(Promise.resolve(new globalThis.Response(null, {
      status: 202
    })));
  });

  afterEach(function () {
    fetchStub.restore();
  });

  [
    [],
    null,
    undefined
  ].forEach(input => {
    it(`should do nothing when registry empty (${JSON.stringify(input)})`, async () => {
      let publisher = new MeasurementsPublisher(URL);
      return publisher.publish(input).then(() => {
        fetchStub.should.have.not.been.called;
      });
    });
  });

  [
    ['no-metadata', undefined, undefined, '{}'],
    ['method-metadata', undefined, {trigger: 'unload', timeout: '122'}, '{"trigger":"unload","timeout":"122"}'],
    ['class-metadata', {sampling: 0.001}, undefined, '{"sampling":0.001}'],
    ['both-metadata', {sampling: 0.001}, {
      trigger: 'unload',
      timeout: '122'
    }, '{"sampling":0.001,"trigger":"unload","timeout":"122"}'],
  ].forEach((args) => {
    it(`should publish measurements ` + args[0], async () => {
      let publisher = new MeasurementsPublisher(URL, args[1]);

      let measurements = [
        {
          name: 'a.b.c',
          type: 'TIMER',
          tags: {
            a: 'A'
          },
          values: [
            {
              value: 0.1,
              timestamp: 1
            },
            {
              value: 0.2,
              timestamp: 2
            }
          ]
        },
        {
          name: 'tags.to.stringify',
          type: 'COUNTER',
          tags: {
            b: 1,
            z: undefined,
            y: {
              s: 2
            }
          },
          values: [
            {
              value: 10.1,
              timestamp: 1
            },
            {
              value: 20.2,
              timestamp: 2
            }
          ]
        }
      ];
      return publisher.publish(measurements, args[2]).then(() => {
        fetchStub.should.have.been.calledWith(URL, {
          method: 'POST',
          headers: {'Content-Type': 'text/plain'},
          mode: 'no-cors',
          body: `{"metadata":${args[3]},"measurements":[` +
            '{"name":"a.b.c","type":"TIMER","tags":{"a":"A"},"values":[{"value":0.1,"timestamp":1},{"value":0.2,"timestamp":2}]},' +
            '{"name":"tags.to.stringify","type":"COUNTER","tags":{"b":"1","y":"{\\"s\\":2}"},"values":[{"value":10.1,"timestamp":1},{"value":20.2,"timestamp":2}]}' +
            ']}'
        });
      });
    });
  });
});
