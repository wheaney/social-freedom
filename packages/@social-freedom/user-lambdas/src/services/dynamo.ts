import {ConditionalCheckFailedCode} from "src/shared/constants";
import * as AWS from "aws-sdk";
import {Key} from "aws-sdk/clients/dynamodb";

const Dynamo = {
    client: new AWS.DynamoDB(),

    addToSet: async (tableName: string, attributeKey: string, value: string): Promise<any> => {
        try {
            return await Dynamo.client.updateItem({
                TableName: tableName,
                Key: {
                    key: {S: attributeKey}
                },
                UpdateExpression: 'ADD #value :add_set_value',
                ConditionExpression: 'not(contains(#value, :add_value))',
                ExpressionAttributeNames: {
                    '#value': 'value'
                },
                ExpressionAttributeValues: {
                    ':add_set_value': {SS: [value]},
                    ':add_value': {S: value}
                }
            }).promise()
        } catch (err) {
            if (err.code === ConditionalCheckFailedCode) {
                // if conditional check fails, we just do nothing
                console.error(err)
            } else {
                throw err
            }
        }
    },

    removeFromSet: async (tableName: string, attributeKey: string, value: string): Promise<any> => {
        try {
            return await Dynamo.client.updateItem({
                TableName: tableName,
                Key: {
                    key: {S: attributeKey}
                },
                UpdateExpression: 'DELETE #value :delete_set_value',
                ConditionExpression: 'contains(#value, :delete_value)',
                ExpressionAttributeNames: {
                    '#value': 'value'
                },
                ExpressionAttributeValues: {
                    ':delete_set_value': {SS: [value]},
                    ':delete_value': {S: value}
                }
            }).promise()
        } catch (err) {
            if (err.code === ConditionalCheckFailedCode) {
                // if conditional check fails, we just do nothing
                console.error(err)
            } else {
                throw err
            }
        }
    },

    getAllInSet: async (tableName: string, attributeKey: string): Promise<string[]> => {
        const setResult = await Dynamo.client.getItem({
            TableName: tableName,
            Key: {
                key: {S: attributeKey}
            }
        }).promise()

        if (!!setResult.Item && !!setResult.Item["value"] && !!setResult.Item["value"].SS) {
            return setResult.Item["value"].SS
        }

        return []
    },

    isInSet: async (tableName: string, attributeKey: string, value: string): Promise<boolean> => {
        const setResult = await Dynamo.getAllInSet(tableName, attributeKey)

        return setResult.includes(value)
    },

    queryTimestampIndex: async (tableName: string, indexName: string, partitionKey: string, startKey?: Key) => {
        return await Dynamo.client.query({
            TableName: tableName,
            IndexName: indexName,
            Limit: 5,
            ScanIndexForward: false,
            KeyConditionExpression: "#key = :key",
            ExpressionAttributeNames: {
                "#key": "key"
            },
            ExpressionAttributeValues: {
                ":key": {S: partitionKey}
            },
            ExclusiveStartKey: startKey
        }).promise()
    },
}

export default Dynamo;