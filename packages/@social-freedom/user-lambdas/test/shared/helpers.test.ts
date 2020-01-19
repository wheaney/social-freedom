import {mockConsole} from "../test-utils";
import Helpers from "../../src/shared/helpers";
import {TestObject} from "../../../types/test/types/shared";

mockConsole('log')

describe('resolveInObject', () => {
    it('should handle any empty object', async () => {
        expect(await Helpers.resolveInObject({})).toStrictEqual({})
    })

    it('should handle an object containing promises and non-promises', async () => {
        expect(await Helpers.resolveInObject({
            foo: 'bar',
            bar: Promise.resolve('baz')
        })).toStrictEqual({
            foo: 'bar',
            bar: 'baz'
        })
    })
})

test('isPromise should return whether an object is a Promise', () => {
    expect(Helpers.isPromise(Promise.resolve('asdf'))).toBe(true)
    expect(Helpers.isPromise(TestObject)).toBe(false)
})

test('isNullish should return whether an object is nullish', () => {
    expect(Helpers.isNullish(null)).toBe(true)
    expect(Helpers.isNullish(undefined)).toBe(true)
    expect(Helpers.isNullish(0)).toBe(false)
    expect(Helpers.isNullish('')).toBe(false)
    expect(Helpers.isNullish(false)).toBe(false)
})

test('isNotNullish should return whether an object is nullish', () => {
    expect(Helpers.isNotNullish(null)).toBe(false)
    expect(Helpers.isNotNullish(undefined)).toBe(false)
    expect(Helpers.isNotNullish(0)).toBe(true)
    expect(Helpers.isNotNullish('')).toBe(true)
    expect(Helpers.isNotNullish(false)).toBe(true)
})