import {createAWSMock, mockConsole, setAWSMock} from "../test-utils";
import Dynamo from "../../src/services/dynamo";
import {TestObject} from "../../../types/test/types/shared";
import {ConditionalCheckFailedCode} from "../../src/shared/constants";
import {UpdateItemInput} from "aws-sdk/clients/dynamodb";
import {AWSError} from "aws-sdk";

beforeEach(async (done) => {
    jest.clearAllMocks()
    done()
})
const TestUpdateItemInput:UpdateItemInput = {
    TableName: 'SomeTableName',
    Key: { key: {S: 'someKey'}},
    UpdateExpression: 'some expression'
}
const TestStringSet = ['someString', 'anotherString']

const consoleErrorMock = mockConsole('error')
const updateItemMock = createAWSMock(Dynamo.client, 'updateItem')
describe('performConditionalUpdate', () => {
    it('should return the results of updateItem on success', async () => {
        setAWSMock(updateItemMock, Promise.resolve(TestObject))

        expect(await Dynamo.performConditionalUpdate(TestUpdateItemInput)).toStrictEqual(TestObject)
    })

    it('should silently handle a conditional check failure', async () => {
        const error = {
            code: ConditionalCheckFailedCode
        }
        setAWSMock(updateItemMock, Promise.reject(error))

        expect(await Dynamo.performConditionalUpdate(TestUpdateItemInput)).toBeUndefined()

        expect(consoleErrorMock).toHaveBeenCalledWith(error)
    })

    it('should blow up on any other error', async () => {
        const error = {
            code: 'SomeOtherCode'
        } as unknown as AWSError
        setAWSMock(updateItemMock, Promise.reject(error))

        try {
            await Dynamo.performConditionalUpdate(TestUpdateItemInput)
            fail('should have thrown an error')
        } catch (err) {
            expect(err).toStrictEqual(error)
        }
    })
})

const performConditionalUpdateMock = jest.spyOn(Dynamo, 'performConditionalUpdate')
describe('addToSet', () => {
    it('should build and pass an input to performConditionalUpdate', async () => {
        performConditionalUpdateMock.mockResolvedValue(Promise.resolve())

        await Dynamo.addToSet('SomeTableName', 'SomeAttributeKey', 'someValue')

        expect(performConditionalUpdateMock).toHaveBeenCalledWith({
            TableName: 'SomeTableName',
            Key: {
                key: {S: 'SomeAttributeKey'}
            },
            UpdateExpression: 'ADD #value :add_set_value',
            ConditionExpression: 'not(contains(#value, :add_value))',
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':add_set_value': {SS: ['someValue']},
                ':add_value': {S: 'someValue'}
            }
        })
    })
})

describe('removeFromSet', () => {
    it('should build and pass an input to performConditionalUpdate', async () => {
        performConditionalUpdateMock.mockResolvedValue(Promise.resolve())

        await Dynamo.removeFromSet('SomeTableName', 'SomeAttributeKey', 'someValue')

        expect(performConditionalUpdateMock).toHaveBeenCalledWith({
            TableName: 'SomeTableName',
            Key: {
                key: {S: 'SomeAttributeKey'}
            },
            UpdateExpression: 'DELETE #value :delete_set_value',
            ConditionExpression: 'contains(#value, :delete_value)',
            ExpressionAttributeNames: {
                '#value': 'value'
            },
            ExpressionAttributeValues: {
                ':delete_set_value': {SS: ['someValue']},
                ':delete_value': {S: 'someValue'}
            }
        })
    })
})

const getItemMock = createAWSMock(Dynamo.client, 'getItem')
describe('getAllInSet', () => {
    it('should return the string set, if present', async () => {
        setAWSMock(getItemMock, Promise.resolve({
            Item: {
                value: {
                    SS: TestStringSet
                }
            }
        }))

        expect(await Dynamo.getAllInSet('SomeTableName', 'SomeAttributeKey'))
            .toStrictEqual(TestStringSet)

        expect(getItemMock).toHaveBeenCalledWith({
            TableName: 'SomeTableName',
            Key: {
                key: {S: 'SomeAttributeKey'}
            }
        })
    })

    it('should return an empty set, if not present', async () => {
        setAWSMock(getItemMock, Promise.resolve())

        expect(await Dynamo.getAllInSet('SomeTableName', 'SomeAttributeKey'))
            .toStrictEqual([])
    })
})

const getAllInSetMock = jest.spyOn(Dynamo, 'getAllInSet')
describe('isInSet', () => {
    it('should return true if the value is in the dynamo set', async () => {
        getAllInSetMock.mockResolvedValue(TestStringSet)

        expect(await Dynamo.isInSet('SomeTableName', 'SomeAttributeKey', 'someString'))
            .toBe(true)
    })

    it('should return false if the value is not in the dynamo set', async () => {
        getAllInSetMock.mockResolvedValue(TestStringSet)

        expect(await Dynamo.isInSet('SomeTableName', 'SomeAttributeKey', 'aDifferentValue'))
            .toBe(false)
    })
})

describe('queryTimestampIndex', () => {
    it('should build and pass an input to query', async () => {
        const queryMock = createAWSMock(Dynamo.client, 'query')
        setAWSMock(queryMock, Promise.resolve())

        await Dynamo.queryTimestampIndex('SomeTableName', 'SomeIndexName', 'SomePartitionKey', {
            key: {S: 'someKey'}
        })

        expect(queryMock).toHaveBeenCalledWith({
            TableName: 'SomeTableName',
            IndexName: 'SomeIndexName',
            Limit: 5,
            ScanIndexForward: false,
            KeyConditionExpression: "#key = :key",
            ExpressionAttributeNames: {
                "#key": "key"
            },
            ExpressionAttributeValues: {
                ":key": {S: 'SomePartitionKey'}
            },
            ExclusiveStartKey: {
                key: {S: 'someKey'}
            }
        })
    })
})