import {DynamoDB} from "aws-sdk";

const Helpers = {
    resolveInObject: async <T, U extends { [key in keyof T]: any }>(object: T): Promise<U> => {
        const startTime = Date.now()
        const newObject = {}
        await Promise.all(Object.keys(object).map(async (key) => {
            newObject[key] = object[key]
            if (Helpers.isNotNullish(object[key]) && Helpers.isPromise(object[key])) {
                const keyStartTime = Date.now()
                newObject[key] = await object[key]
                console.log(`resolveInObject [${key}] took ${Date.now() - keyStartTime}`)
            }
        }))

        console.log(`resolveInObject took ${Date.now() - startTime}`)

        return newObject as U
    },

    isPromise: (object: any): object is Promise<any> => {
        return !!object.then
    },

    isNullish: (object: any) => {
        return object === null || object === undefined
    },

    isNotNullish: (object: any) => {
        return object !== null && object !== undefined
    },

    keyStringToDynamoDBKey: (lastKey: string, partitionKey: string): DynamoDB.Key => {
        if (lastKey) {
            const lastId = lastKey.substring(lastKey.indexOf('-') + 1)
            return {
                key: {S: partitionKey},
                timeSortKey: {S: lastKey},
                id: {S: lastId}
            }
        }

        return undefined
    }
}

export default Helpers