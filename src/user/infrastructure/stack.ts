import * as cdk from "@aws-cdk/core";
import {Role, ServicePrincipal, CanonicalUserPrincipal, PolicyStatement} from "@aws-cdk/aws-iam";
import {AttributeType, ProjectionType, Table} from "@aws-cdk/aws-dynamodb";
import {Bucket} from "@aws-cdk/aws-s3";
import {CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront";
import {CfnOutput} from "@aws-cdk/core";
import {Topic} from "@aws-cdk/aws-sns";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";
import * as fs from "fs";

export class UserStack extends cdk.Stack {
    readonly userId: string;
    readonly executionerRole: Role;

    constructor(app: cdk.App, userId: string) {
        super(app, `UserStack-${userId}`);
        this.userId = userId;

        // one Role for all Lambdas to assume
        this.executionerRole = new Role(this, `Executioner-${userId}`, {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com")
        });

        const AccountDetailsTable = new Table(this, `AccountDetails-${userId}`, {
            partitionKey: {
                name: "key",
                type: AttributeType.STRING
            },
            tableName: `AccountDetails-${userId}`
        })

        this.buildSortTable("Feed", "key")
        const PostsTable = this.buildSortTable("Posts", "key")
        this.buildSortTable("PostActivities", "postId")

        const PostsTopic = new Topic(this, `PostsTopic-${userId}`, {
            topicName: `Posts-${userId}`
        })

        const MediaBucket = new Bucket(this, `MediaBucket-${userId}`)

        const OriginAccessIdentity = new CfnCloudFrontOriginAccessIdentity(this, `CloudFrontOriginAccessIdentity-${userId}`, {
            cloudFrontOriginAccessIdentityConfig: {
                comment: "CloudFront access for user media files"
            }
        })
        const WebDistribution = new CloudFrontWebDistribution(this, `CloudFrontWebDistribution-${userId}`, {
            originConfigs: [{
                s3OriginSource: {
                    s3BucketSource: MediaBucket,
                    originAccessIdentityId: OriginAccessIdentity.ref
                },
                behaviors: [{isDefaultBehavior: true}]
            }]
        })
        MediaBucket.addToResourcePolicy(new PolicyStatement({
            principals: [new CanonicalUserPrincipal(OriginAccessIdentity.attrS3CanonicalUserId)],
            resources: [MediaBucket.bucketArn, MediaBucket.arnForObjects('*')],
            actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"]
        }))

        this.buildLambda("PostCreate", "post-create")
        this.buildLambda("FollowRequestReceived", "follow-request-received")

        this.executionerRole.addToPolicy(new PolicyStatement({
            resources: [PostsTable.tableArn],
            actions: ['dynamodb:putItem']
        }));
        this.executionerRole.addToPolicy(new PolicyStatement({
            resources: [AccountDetailsTable.tableArn],
            actions: ['dynamodb:getItem', 'dynamodb:updateItem']
        }));
        this.executionerRole.addToPolicy(new PolicyStatement({
            resources: [PostsTopic.topicArn],
            actions: ['sns:Publish']
        }));

        // some resources will have names generated by CloudFormation, output them so they can be retrieved and referenced later
        new CfnOutput(this, `MediaBucketArn-${userId}`, {
            value: MediaBucket.bucketArn
        });
        new CfnOutput(this, `CloudFormationDomainName-${userId}`, {
            value: WebDistribution.domainName
        })
    }

    buildSortTable(tableName: string, primaryKey: string): Table {
        const table = new Table(this, `${tableName}-${this.userId}`, {
            partitionKey: {
                name: primaryKey,
                type: AttributeType.STRING
            },
            sortKey: {
                name: "id",
                type: AttributeType.STRING
            },
            tableName: `${tableName}-${this.userId}`
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

    buildLambda(functionName: string, directoryName: string):LambdaFunction {
        // Lambda references assume that tsc has compiled all *.ts files to the dist directory
        return new LambdaFunction(this, functionName, {
            functionName: `${functionName}-${this.userId}`,
            runtime: Runtime.NODEJS_8_10,
            code: Code.fromInline(fs.readFileSync(`./dist/src/user/infrastructure/lambdas/${directoryName}/index.js`).toString()),
            handler: 'index.handler',
            role: this.executionerRole,
            environment: {
                USER_ID: this.userId,
                ACCOUNT_ID: cdk.Aws.ACCOUNT_ID,
                REGION: cdk.Aws.REGION
            }
        });
    }
}