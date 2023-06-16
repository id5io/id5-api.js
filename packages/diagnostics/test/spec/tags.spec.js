import sinonChai from 'sinon-chai';
import chai, {expect} from 'chai';
import Tags from '../../src/tags.js';

chai.should();
chai.use(sinonChai);

describe('Tags', function () {
  [
    [
      'undefined',
      undefined,
      Tags.EMPTY
    ],
    [
      'null',
      null,
      Tags.EMPTY
    ],
    [
      'object',
      {x: 'x1', y: 'y1'},
      {x: 'x1', y: 'y1'}
    ],
    [
      'map',
      new Map([['x', 'x1'], ['y', 'y1']]),
      {x: 'x1', y: 'y1'}
    ]
  ].forEach(([desc, input, expected]) => {
    it(`should create tags from ${desc}`, function () {
      // when
      let tags = Tags.from(input);

      // then
      expect(tags).is.deep.equal(expected);
    });
  });

  [
    [
      undefined,
      ''
    ],
    [
      null,
      ''
    ],
    [
      {x: 'V1', y: 'V2', a: 'V3'},
      'a=V3,x=V1,y=V2' // sorted
    ],
    [
      {x: 'V1', a: 'V3', y: 'V2'},
      'a=V3,x=V1,y=V2' // sorted
    ]
  ].forEach(([input, expected]) => {
    it(`should create string from tags (${JSON.stringify(input)})`, function () {
      // given
      let tags = Tags.from(input);

      // when
      let asString = Tags.toString(tags);

      // then
      expect(asString).is.deep.equal(expected);
    });
  });
});
