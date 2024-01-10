import {LazyValue} from "../../src/promise.js";

describe('LazyValue', function () {
  it('should return value when settled', async () => {
    // given
    const value = {v: 'VALUE'}

    // when
    const valueHolder = new LazyValue();

    // then
    expect(valueHolder.hasValue()).is.eq(false);
    expect(valueHolder.getValue()).is.eq(undefined);

    // when
    const valuePromise = valueHolder.getValuePromise();
    valueHolder.set(value);

    // then
    expect(valueHolder.getValue()).is.eql(value);
    return valuePromise.then(v => {
      expect(v).is.eql(value);
      expect(valueHolder.hasValue()).is.eq(true);
    });
  });

  it('should allow reset value', async () => {
    // given
    const value = {v: 'VALUE'}
    const valueHolder = new LazyValue();
    valueHolder.set(value);

    // when
    valueHolder.reset();

    // then
    expect(valueHolder.hasValue()).is.eq(false);
    expect(valueHolder.getValue()).is.eq(undefined);

    // when
    const valuePromise = valueHolder.getValuePromise();
    let newValue = 'NEW VALUE';
    valueHolder.set(newValue);


    // then
    expect(valueHolder.getValue()).is.eql(newValue);
    return valuePromise.then(v => {
      expect(v).is.eql(newValue);
      expect(valueHolder.hasValue()).is.eq(true);
    });
  });
})
