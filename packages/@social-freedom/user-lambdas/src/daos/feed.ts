import {FeedEntry} from "@social-freedom/types";
import Dynamo from "../services/dynamo";
import {FeedTablePartitionKey} from "../shared/constants";
import Helpers from "../shared/helpers";

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
        return Dynamo.queryTimestampIndex(process.env.FEED_TABLE, 'FeedByTimestamp',
            FeedTablePartitionKey, Helpers.keyStringToDynamoDBKey(lastPostKey, FeedTablePartitionKey))
    }
}

export default Feed