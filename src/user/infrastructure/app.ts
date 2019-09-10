import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {Role, ServicePrincipal, CanonicalUserPrincipal, PolicyStatement} from "@aws-cdk/aws-iam";
import {AttributeType, ProjectionType, Table} from "@aws-cdk/aws-dynamodb";
import {Bucket} from "@aws-cdk/aws-s3";
import {CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront";
import {CfnOutput} from "@aws-cdk/core";


const app = new cdk.App();
const stack = new cdk.Stack(app, 'UserStack');

// one Role for all Lambdas to assume
new Role(stack, "Executioner", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com")
});

new Table(stack, "AccountDetails", {
    partitionKey: {
        name: "key",
        type: AttributeType.STRING
    },
    tableName: "AccountDetails"
})

const BuildSortTable = (tableName:string, primaryKey:string, sortKey:string):Table => {
    const table = new Table(stack, tableName, {
        partitionKey: {
            name: primaryKey,
            type: AttributeType.STRING
        },
        sortKey: {
            name: sortKey,
            type: AttributeType.STRING
        },
        tableName: tableName
    });
    table.addLocalSecondaryIndex({
        indexName: `${tableName}ByTimestamp`,
        sortKey: {
            name: "timestamp",
            type: AttributeType.STRING
        },
        projectionType: ProjectionType.ALL
    })

    return table
}
BuildSortTable("Feed", "key", "entryId")
BuildSortTable("Posts", "key", "postId")
BuildSortTable("PostActivities", "postId", "activityId")

const MediaBucket = new Bucket(stack, "MediaBucket")

const originAccessIdentity = new CfnCloudFrontOriginAccessIdentity(stack, "CloudFrontOriginAccessIdentity", {
    cloudFrontOriginAccessIdentityConfig: {
        comment: "CloudFront access for user media files"
    }
})
new CloudFrontWebDistribution(stack, "CloudFrontWebDistribution", {
    originConfigs: [{
        s3OriginSource: {
            s3BucketSource: MediaBucket,
            originAccessIdentityId: originAccessIdentity.ref
        },
        behaviors : [ {isDefaultBehavior: true}]
    }]
})
MediaBucket.addToResourcePolicy(new PolicyStatement({
    principals: [new CanonicalUserPrincipal(originAccessIdentity.attrS3CanonicalUserId)],
    resources: [MediaBucket.bucketArn, MediaBucket.arnForObjects('*')],
    actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"]
}))

new CfnOutput(stack, "mediaBucketArn", {
    value: MediaBucket.bucketArn
})

app.synth();
