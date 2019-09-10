import 'source-map-support/register';
import * as cdk from "@aws-cdk/core";
import {Role, ServicePrincipal, CanonicalUserPrincipal, PolicyStatement} from "@aws-cdk/aws-iam";
import {AttributeType, ProjectionType, Table} from "@aws-cdk/aws-dynamodb";
import {Bucket} from "@aws-cdk/aws-s3";
import {CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront";
import {CfnOutput} from "@aws-cdk/core";
import {Topic} from "@aws-cdk/aws-sns";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";
import * as fs from "fs";

const app = new cdk.App();
const stack = new cdk.Stack(app, 'UserStack');

// one Role for all Lambdas to assume
const ExecutionerRole = new Role(stack, "Executioner", {
    assumedBy: new ServicePrincipal("lambda.amazonaws.com")
});

new Table(stack, "AccountDetails", {
    partitionKey: {
        name: "key",
        type: AttributeType.STRING
    },
    tableName: "AccountDetails"
})

const BuildSortTable = (tableName:string, primaryKey:string):Table => {
    const table = new Table(stack, tableName, {
        partitionKey: {
            name: primaryKey,
            type: AttributeType.STRING
        },
        sortKey: {
            name: "id",
            type: AttributeType.STRING
        },
        tableName: tableName
    });
    table.addLocalSecondaryIndex({
        indexName: `${tableName}ByTimestamp`,
        sortKey: {
            name: "timeSortKey",
            type: AttributeType.STRING
        },
        projectionType: ProjectionType.ALL
    })

    return table
}
BuildSortTable("Feed", "key")
const PostsTable = BuildSortTable("Posts", "key")
BuildSortTable("PostActivities", "postId")

const PostsTopic = new Topic(stack, "PostsTopic", {
    topicName: "Posts"
})

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

// Lambda references assume that tsc has compiled all *.ts files to the dist directory
new LambdaFunction(stack, 'PostCreationHandler', {
    runtime: Runtime.NODEJS_8_10,
    code: Code.fromInline(fs.readFileSync('./dist/src/user/infrastructure/lambdas/post-create/index.js').toString()),
    handler: 'index.handler',
    role: ExecutionerRole
});

ExecutionerRole.addToPolicy(new PolicyStatement({
    resources: [PostsTable.tableArn],
    actions: ['dynamodb:putItem']
}));

ExecutionerRole.addToPolicy(new PolicyStatement({
    resources: [PostsTopic.topicArn],
    actions: ['sns:Publish']
}));

new CfnOutput(stack, "mediaBucketArn", {
    value: MediaBucket.bucketArn
});

app.synth();
