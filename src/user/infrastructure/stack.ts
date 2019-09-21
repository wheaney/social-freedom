import * as cdk from "@aws-cdk/core";
import {CanonicalUserPrincipal, ManagedPolicy, PolicyStatement, Role, ServicePrincipal} from "@aws-cdk/aws-iam";
import {AttributeType, ProjectionType, Table} from "@aws-cdk/aws-dynamodb";
import {Bucket, BucketAccessControl} from "@aws-cdk/aws-s3";
import {CfnCloudFrontOriginAccessIdentity, CloudFrontWebDistribution} from "@aws-cdk/aws-cloudfront";
import {Topic} from "@aws-cdk/aws-sns";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";
import {
    AuthorizationType,
    CfnAuthorizer,
    EndpointType,
    IResource,
    LambdaIntegration,
    Resource,
    RestApi
} from "@aws-cdk/aws-apigateway";
import {Vpc} from "@aws-cdk/aws-ec2";
import {HostedZone} from "@aws-cdk/aws-route53";
import {IRule, Rule, RuleTargetConfig} from "@aws-cdk/aws-events";
import {ReadWriteType, Trail} from "@aws-cdk/aws-cloudtrail";
// import * as fs from "fs";
// import * as archiver from "archiver";

export class UserStack extends cdk.Stack {
    readonly userId: string;
    readonly executionerRole: Role;
    readonly cognitoAuthorizer: CfnAuthorizer;
    readonly vpc: Vpc;
    readonly lambdaEnvironmentVariables: any;

    constructor(app: cdk.App, userId: string, userPoolArn: string) {
        super(app, `UserStack-${userId}`);

        // const LambdasZipPath = './dist/userLambdas.zip'
        // const LambdasZipFile = fs.createWriteStream(LambdasZipPath)
        // const Archive = archiver('zip')
        // Archive.pipe(LambdasZipFile)
        // Archive.directory('./dist/src/user/infrastructure/lambdas', false)
        // Archive.finalize()

        this.userId = userId;

        this.vpc = new Vpc(this,  'VPC', {
            enableDnsHostnames: true,
            enableDnsSupport: true
        })
        const FollowerAPIHostedZone = new HostedZone(this, 'FollowerAPIHostedZone', {
            vpcs: [this.vpc],
            zoneName: `followerapi-${userId}`
        })

        // one Role for all Lambdas to assume
        this.executionerRole = new Role(this, "Executioner", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com")
        });

        const AccountDetailsTable = new Table(this, "AccountDetails", {
            partitionKey: {
                name: "key",
                type: AttributeType.STRING
            }
        })

        const FeedTable = this.buildSortTable("Feed", "key")
        const PostsTable = this.buildSortTable("Posts", "key")
        const PostActivitiesTable = this.buildSortTable("PostActivities", "postId")

        const PostsTopic = new Topic(this, "PostsTopic", {
            topicName: `Posts-${userId}`
        })

        const MediaBucket = new Bucket(this, "MediaBucket")

        const OriginAccessIdentity = new CfnCloudFrontOriginAccessIdentity(this, "CloudFrontOriginAccessIdentity", {
            cloudFrontOriginAccessIdentityConfig: {
                comment: "CloudFront access for user media files"
            }
        })
        const WebDistribution = new CloudFrontWebDistribution(this, "CloudFrontWebDistribution", {
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

        this.lambdaEnvironmentVariables = {
            USER_ID: this.userId,
            ACCOUNT_ID: cdk.Aws.ACCOUNT_ID,
            REGION: cdk.Aws.REGION,
            HOSTED_ZONE: FollowerAPIHostedZone.hostedZoneId,
            ACCOUNT_DETAILS_TABLE: AccountDetailsTable.tableArn,
            FEED_TABLE: FeedTable.tableArn,
            POSTS_TABLE: PostsTable.tableArn,
            POST_ACTIVITIES_TABLE: PostActivitiesTable.tableArn,
            MEDIA_BUCKET: MediaBucket.bucketArn,
            CDN_DOMAIN_NAME: WebDistribution.domainName
        }

        const DirectAccessLambdas = Code.fromAsset('./dist/src/user/infrastructure/lambdas/direct-access')
        const FollowerApiLambdas = Code.fromAsset('./dist/src/user/infrastructure/lambdas/follower-api')
        this.constructLambda("PostCreate", DirectAccessLambdas, "direct-access/post-create.handler")
        this.constructLambda("IncomingFollowRequestCreate", FollowerApiLambdas, "incoming-follow-request-create.handler")

        const Api = new RestApi(this, "FollowerAPI", {
            endpointTypes: [EndpointType.EDGE]
        })
        this.cognitoAuthorizer = new CfnAuthorizer(this, "CognitoAuthorizer", {
            name: "CognitoAuthorizer",
            type: AuthorizationType.COGNITO,
            identitySource: "method.request.header.Authorization",
            restApiId: Api.restApiId,
            providerArns: [userPoolArn]
        })
        const PostsApi = this.constructLambdaApi(Api.root, 'posts', 'GET', "PostsGet", FollowerApiLambdas, "posts-get.handler")
        const PostApi = this.constructLambdaApi(PostsApi, '{postId}', 'GET', "PostGet", FollowerApiLambdas, "post-get.handler")
        const PostActivitiesApi = this.constructLambdaApi(PostApi, 'activities', 'GET', "PostActivitiesGet", FollowerApiLambdas, "post-activities-get.handler")
        this.constructLambdaApi(PostActivitiesApi, '{postActivityId}', 'GET', "PostActivityGet", FollowerApiLambdas, "post-activity-get.handler")

        this.executionerRole.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole'))
        this.executionerRole.addToPolicy(new PolicyStatement({
            resources: [PostsTable.tableArn],
            actions: ['dynamodb:PutItem']
        }));
        this.executionerRole.addToPolicy(new PolicyStatement({
            resources: [AccountDetailsTable.tableArn],
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem']
        }));
        this.executionerRole.addToPolicy(new PolicyStatement({
            resources: [PostsTopic.topicArn],
            actions: ['sns:Publish']
        }));

        this.constructSnsTopicSubscriptionValidation()
    }

    buildSortTable(tableName: string, primaryKey: string): Table {
        const table = new Table(this, tableName, {
            partitionKey: {
                name: primaryKey,
                type: AttributeType.STRING
            },
            sortKey: {
                name: "id",
                type: AttributeType.STRING
            }
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

    constructLambdaApi(parentResource: IResource, path: string, method: "GET" | "PUT" | "POST" | "DELETE",
                       functionName: string, code: Code, handlerPath: string):Resource {
        const resource = parentResource.addResource(path)
        resource.addMethod(method, new LambdaIntegration(this.constructLambda(functionName, code, handlerPath)), {
            authorizationType: AuthorizationType.COGNITO,
            authorizer: {authorizerId: this.cognitoAuthorizer.ref}
        })

        return resource
    }

    constructLambda(functionName: string, code: Code, handlerPath: string):LambdaFunction {
        // Lambda references assume that tsc has compiled all *.ts files to the dist directory
        return new LambdaFunction(this, functionName, {
            functionName: `${functionName}-${this.userId}`,
            runtime: Runtime.NODEJS_10_X,
            code: code,
            handler: handlerPath,
            role: this.executionerRole,
            environment: this.lambdaEnvironmentVariables,
            vpc: this.vpc
        });
    }

    constructSnsTopicSubscriptionValidation() {
        const CloudTrailBucket = new Bucket(this, 'CloudTrailS3Bucket', {
            accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL
        })
        CloudTrailBucket.addToResourcePolicy(new PolicyStatement({
            resources: [CloudTrailBucket.bucketArn],
            principals: [new ServicePrincipal("cloudtrail.amazonaws.com")],
            actions: ["s3:GetBucketAcl"]
        }))
        CloudTrailBucket.addToResourcePolicy(new PolicyStatement({
            resources: [CloudTrailBucket.arnForObjects(`AWSLogs/${cdk.Aws.ACCOUNT_ID}/*`)],
            principals: [new ServicePrincipal("cloudtrail.amazonaws.com")],
            actions: ["s3:PutObject"],
            conditions: {
                StringEquals: {
                    "s3:x-amz-acl": "bucket-owner-full-control"
                }
            }
        }))

        new Trail(this, 'CloudTrail', {
            bucket: CloudTrailBucket,
            isMultiRegionTrail: true,
            includeGlobalServiceEvents: true,
            managementEvents: ReadWriteType.WRITE_ONLY
        })

        const SnsSubscriptionValidationLambda = this.constructLambda('SNSSubscriptionValidation', Code.fromAsset('./dist/src/user/infrastructure/lambdas/sns'), 'sns-subscription-validation.handler')
        new Rule(this, 'SNSSubscriptionRule', {
            eventPattern: {
                source: ['aws.sns'],
                detailType: ['AWS API Call via CloudTrail'],
                detail: {
                    eventSource: [
                        "sns.amazonaws.com"
                    ],
                    eventName: [
                        "Subscribe"
                    ]
                }
            },
            targets: [{
                bind(rule: IRule, id?: string): RuleTargetConfig {
                    return {
                        id: id || 'SnsSubscriptionValidationLambda',
                        arn: SnsSubscriptionValidationLambda.functionArn
                    }
                }
            }]
        })

        SnsSubscriptionValidationLambda.addPermission('SnsSubscriptionValidationLambaPermission', {
            action: 'lambda:InvokeFunction',
            principal: new ServicePrincipal("events.amazonaws.com")
        })
    }
}