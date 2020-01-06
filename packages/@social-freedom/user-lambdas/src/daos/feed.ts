import {FeedEntry} from "@social-freedom/types";
import Dynamo from "src/services/dynamo";
import {FeedTablePartitionKey} from "src/shared/constants";
import {DynamoDB} from "aws-sdk";

const Feed = {
    putEntry: async (entry: FeedEntry) => {
        await Dynamo.client.putItem({
            TableName: process.env.FEED_TABLE,
            Item: {
                "key": {S: FeedTablePartitionKey},
                "id": {S: entry.id},
                "timeSortKey": {S: `${entry.timestamp}-${entry.id}`},
                "timestamp": {N: entry.timestamp.toString()},
                "type": {S: entry.type},
                "operation": {S: entry.operation},
                "userId": {S: entry.userId},
                "body": {S: JSON.stringify(entry.body)}
            }
        }).promise()
    },

    getEntries: async (lastPostKey?: string) => {
        let startKey: DynamoDB.Key;
        if (lastPostKey) {
            const lastPostId = lastPostKey.substring(lastPostKey.indexOf('-')+1)
            startKey = {
                key: {S: FeedTablePartitionKey},
                timeSortKey: {S: lastPostKey},
                id: {S: lastPostId}
            }
        }

        return Dynamo.queryTimestampIndex(process.env.FEED_TABLE, 'FeedByTimestamp',
            FeedTablePartitionKey, startKey)
    }
}

export default Feed