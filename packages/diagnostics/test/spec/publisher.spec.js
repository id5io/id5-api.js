import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chai from 'chai';
import {MeasurementsPublisher} from '../../src/publisher.js';

chai.should();
chai.use(sinonChai);

const URL = 'http://measurements.url';
describe('Publisher', function () {
  let fetchStub;
  let publisher;

  beforeEach(function () {
    fetchStub = sinon.stub(globalThis, 'fetch');
    fetchStub.returns(Promise.resolve(new globalThis.Response(null, {
      status: 202
    })));
    publisher = new MeasurementsPublisher(URL);
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
      return publisher.publish(input).then(() => {
        fetchStub.should.have.not.been.called;
      });
    });
  });

  it(`should publish measurements `, async () => {
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
    return publisher.publish(measurements).then(() => {
      fetchStub.should.have.been.calledWith(URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: '{"measurements":[' +
          '{"name":"a.b.c","type":"TIMER","tags":{"a":"A"},"values":[{"value":0.1,"timestamp":1},{"value":0.2,"timestamp":2}]},' +
          '{"name":"tags.to.stringify","type":"COUNTER","tags":{"b":"1","y":"{\\"s\\":2}"},"values":[{"value":10.1,"timestamp":1},{"value":20.2,"timestamp":2}]}' +
          ']}'
      });
    });
  });
});
