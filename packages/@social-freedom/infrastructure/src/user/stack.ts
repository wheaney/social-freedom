import * as cdk from "@aws-cdk/core";
import {CfnOutput, Duration, RemovalPolicy} from "@aws-cdk/core";
import {
    AnyPrincipal,
    CanonicalUserPrincipal,
    ManagedPolicy,
    PolicyStatement,
    Role,
    ServicePrincipal
} from "@aws-cdk/aws-iam";
import {AttributeType, BillingMode, ProjectionType, Table} from "@aws-cdk/aws-dynamodb";
import {Bucket, BucketAccessControl} from "@aws-cdk/aws-s3";
import {CloudFrontWebDistribution, OriginAccessIdentity} from "@aws-cdk/aws-cloudfront";
import {Subscription, SubscriptionProtocol, Topic} from "@aws-cdk/aws-sns";
import {Code, Function as LambdaFunction, Runtime} from "@aws-cdk/aws-lambda";
import {AuthorizationType, CfnAuthorizer, EndpointType, RestApi} from "@aws-cdk/aws-apigateway";
import {IRule, Rule, RuleTargetConfig} from "@aws-cdk/aws-events";
import {ReadWriteType, Trail} from "@aws-cdk/aws-cloudtrail";
import LambdaHelper from "../shared/lambda-helper";
import {ApiHelper} from "../shared/api-helper";
import {CustomResource, CustomResourceProvider} from "@aws-cdk/aws-cloudformation";

export class UserStack extends cdk.Stack {
    readonly userId: string;
    readonly removalPolicy: RemovalPolicy;

    constructor(app: cdk.App, isDevelopment: boolean, federalWebsiteOrigin: string, userId: string, userPoolArn: string) {
        super(app, `UserStack-${userId}`);

        // don't want accounts to lose all their data if CloudFormation attempts to revert/remove resources
        this.removalPolicy = isDevelopment ? RemovalPolicy.DESTROY : RemovalPolicy.RETAIN

        this.userId = userId;

        // one Role for all Lambdas to assume
        const ExecutionerRole = new Role(this, "Executioner", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com")
        });

        const AccountDetailsTable = new Table(this, "AccountDetails", {
            partitionKey: {
                name: "key",
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.removalPolicy
        })

        const TrackedAccounts = new Table(this, "TrackedAccounts", {
            partitionKey: {
                name: "userId",
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.removalPolicy
        });
        const FeedTable = this.buildSortTable("Feed", "key")
        const PostsTable = this.buildSortTable("Posts", "key")
        const PostActivitiesTable = this.buildSortTable("PostActivities", "postId")

        const ProfileTopic = this.createTopic('ProfileTopic')
        const PostsTopic = this.createTopic('PostsTopic')

        const MediaBucket = new Bucket(this, "MediaBucket", {
            removalPolicy: this.removalPolicy
        })

        const S3OriginAccessIdentity = new OriginAccessIdentity(this, "CloudFrontOriginAccessIdentity", {
            comment: "CloudFront access for user media files"
        })
        const WebDistribution = new CloudFrontWebDistribution(this, "CloudFrontWebDistribution", {
            originConfigs: [{
                s3OriginSource: {
                    s3BucketSource: MediaBucket,
                    originAccessIdentity: S3OriginAccessIdentity
                },
                behaviors: [{isDefaultBehavior: true}]
            }]
        })
        MediaBucket.addToResourcePolicy(new PolicyStatement({
            principals: [new CanonicalUserPrincipal(S3OriginAccessIdentity.cloudFrontOriginAccessIdentityS3CanonicalUserId)],
            resources: [MediaBucket.bucketArn, MediaBucket.arnForObjects('*')],
            actions: ["s3:GetBucket*", "s3:GetObject*", "s3:List*"]
        }))

        // TODO - move role creation into Lambda helper, lock down function roles to only permit what's necessary
        // TODO - where possible, use helper functions to apply policies (e.g. Queue provides grantConsumeMessages() fn)
        ExecutionerRole.addToPolicy(new PolicyStatement({
            resources: [PostsTable.tableArn, PostActivitiesTable.tableArn, FeedTable.tableArn, TrackedAccounts.tableArn, AccountDetailsTable.tableArn],
            actions: ['dynamodb:GetItem', 'dynamodb:UpdateItem', 'dynamodb:PutItem', 'dynamodb:BatchGetItem']
        }));
        ExecutionerRole.addToPolicy(new PolicyStatement({
            resources: [
                this.indexArn(PostsTable, 'PostsByTimestamp'),
                this.indexArn(PostActivitiesTable, 'PostActivitiesByTimestamp'),
                this.indexArn(FeedTable, 'FeedByTimestamp'),
            ],
            actions: ['dynamodb:Query']
        }));
        ExecutionerRole.addToPolicy(new PolicyStatement({
            resources: [PostsTopic.topicArn, ProfileTopic.topicArn],
            actions: ['sns:Publish']
        }));

        // TODO - maybe we only add this in dev? or do something to expire CloudWatch logs?
        ExecutionerRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))

        const Api = new RestApi(this, "API", {
            endpointTypes: [EndpointType.EDGE]
        })

        const CognitoAuthorizer = new CfnAuthorizer(this, "CognitoAuthorizer", {
            name: "CognitoAuthorizer",
            type: AuthorizationType.COGNITO,
            identitySource: "method.request.header.Authorization",
            restApiId: Api.restApiId,
            providerArns: [userPoolArn]
        })

        const EnvironmentVariables = {
            USER_ID: this.userId,
            ACCOUNT_ID: cdk.Aws.ACCOUNT_ID,
            REGION: cdk.Aws.REGION,
            ACCOUNT_DETAILS_TABLE: AccountDetailsTable.tableName,
            PROFILE_TOPIC: ProfileTopic.topicArn,
            FEED_TABLE: FeedTable.tableName,
            POSTS_TABLE: PostsTable.tableName,
            POSTS_TOPIC: PostsTopic.topicArn,
            POST_ACTIVITIES_TABLE: PostActivitiesTable.tableName,
            TRACKED_ACCOUNTS_TABLE: TrackedAccounts.tableName,
            MEDIA_BUCKET: MediaBucket.bucketName,
            CDN_DOMAIN_NAME: WebDistribution.domainName,
            API_ORIGIN: Api.url,
            CORS_ORIGIN: isDevelopment ? '*' : federalWebsiteOrigin
        }

        const LambdaCode = Code.fromAsset('./node_modules/@social-freedom/user-lambdas')
        const SNSLambdas = new LambdaHelper(this, ExecutionerRole, EnvironmentVariables, LambdaCode)
        const ProfileEventsHandler = SNSLambdas.constructLambda('sns-handle-following-account-profile-events', true)
        const PostEventsHandler = SNSLambdas.constructLambda('sns-handle-following-account-post-events', true)
        PostEventsHandler.addPermission('PostEventHandlerLambdaPermission', {
            action: 'lambda:InvokeFunction',
            principal: new ServicePrincipal("sns.amazonaws.com")
        })
        new Subscription(this, 'PostsTopicLambdaSubscription', {
            endpoint: PostEventsHandler.functionArn,
            topic: PostsTopic,
            protocol: SubscriptionProtocol.LAMBDA
        })
        ProfileEventsHandler.addPermission('ProfileEventHandlerLambdaPermission', {
            action: 'lambda:InvokeFunction',
            principal: new ServicePrincipal("sns.amazonaws.com")
        })
        new Subscription(this, 'ProfileTopicLambdaSubscription', {
            endpoint: ProfileEventsHandler.functionArn,
            topic: ProfileTopic,
            protocol: SubscriptionProtocol.LAMBDA
        })

        const RequesterRole = new Role(this, "Requester", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com")
        });
        const AsyncAPIRequestHandler = new LambdaFunction(this, 'AsyncAPIRequestHandler', {
            runtime: Runtime.NODEJS_12_X,
            code: LambdaCode,
            handler: 'lambda-trigger-async-api-request.handler',
            role: RequesterRole,
            environment: {
                ALLOW_SYNCHRONOUS_API_REQUESTS: "true"
            }
        });
        AsyncAPIRequestHandler.grantInvoke(ExecutionerRole)

        // environment variables are set in PostStackCreationLambda to prevent circular dependencies
        const APILambdas = new LambdaHelper(this, ExecutionerRole, {}, LambdaCode)
        const ApiUtils = new ApiHelper(APILambdas, CognitoAuthorizer, isDevelopment ? '*' : federalWebsiteOrigin)

        // everything under /follower is intended to be accessed by other accounts (followers or potential followers)
        const FollowerApi = Api.root.addResource('follower')
        ApiUtils.constructLambdaApi(FollowerApi, 'follow-requests', 'POST', "follower-api-follow-request-create")
        ApiUtils.constructLambdaApi(FollowerApi, 'follow-request-response', 'POST', "follower-api-follow-request-receive-response")
        const PostsApi = ApiUtils.constructLambdaApi(FollowerApi, 'posts', 'GET', "follower-api-posts-get")
        ApiUtils.constructLambdaApiMethod(PostsApi, 'POST', "follower-api-post-create")
        const PostApi = ApiUtils.constructLambdaApi(PostsApi, '{postId}', 'GET', "follower-api-post-get")
        const PostActivitiesApi = ApiUtils.constructLambdaApi(PostApi, 'activities', 'GET', "follower-api-post-activities-get")
        ApiUtils.constructLambdaApiMethod(PostActivitiesApi, 'POST', 'follower-api-post-activity-create')
        ApiUtils.constructLambdaApi(PostActivitiesApi, '{postActivityId}', 'GET', "follower-api-post-activity-get")
        ApiUtils.constructLambdaApi(FollowerApi, 'profile', 'GET', 'follower-api-profile-get')

        // everything under /internal is intended to be accessed only be the owning account
        const InternalApi = Api.root.addResource('internal')
        const FollowRequestsApi = InternalApi.addResource('follow-requests')
        ApiUtils.addCorsOptions(FollowRequestsApi)
        ApiUtils.constructLambdaApiMethod(FollowRequestsApi, 'GET', 'internal-api-follow-requests-get')
        ApiUtils.constructLambdaApiMethod(FollowRequestsApi, 'POST', 'internal-api-follow-request-create')
        ApiUtils.constructLambdaApi(InternalApi, 'follow-request-response', 'POST', 'internal-api-follow-request-respond')
        ApiUtils.constructLambdaApi(InternalApi, 'posts', 'POST', 'internal-api-post-create')
        ApiUtils.constructLambdaApi(InternalApi, 'feed', 'GET', 'internal-api-feed-get')
        ApiUtils.constructLambdaApi(InternalApi, 'profile', 'PUT', 'internal-api-profile-put')

        /**
         * Methods exposed under /internal/async can perform long-running tasks, such as making
         * service calls and operating on the results. These should never be triggered directly from the website, but
         * instead queued up and executed asynchronously from web requests.
         */
        const AsyncLambdas = []
        const AsyncApiUtils = new ApiHelper(APILambdas, CognitoAuthorizer, '')
        const InternalAsyncApi = InternalApi.addResource('async')
        const InternalAsyncFollowRequestsApi = InternalAsyncApi.addResource('follow-requests')
        AsyncLambdas.push(AsyncApiUtils.constructLambdaApiMethod(InternalAsyncFollowRequestsApi, 'POST', 'internal-async-api-follow-request-create', true))

        this.constructSnsTopicSubscriptionValidation(APILambdas.constructLambda('sns-audit-new-sns-subscription'))

        const APIFunctionArns = APILambdas.lambdas.map(lambdaFunction => lambdaFunction.functionArn)
        const PostStackCreationRole = new Role(this, "PostStackCreation", {
            assumedBy: new ServicePrincipal("lambda.amazonaws.com")
        });
        PostStackCreationRole.addToPolicy(new PolicyStatement({
            resources: APIFunctionArns,
            actions: ['lambda:UpdateFunctionConfiguration']
        }));
        PostStackCreationRole.addManagedPolicy(ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'))
        const PostStackCreationLambda = new LambdaFunction(this, 'PostStackCreationLambda', {
            runtime: Runtime.NODEJS_12_X,
            code: LambdaCode,
            handler: 'cloudformation-post-stack-creation.handler',
            role: PostStackCreationRole
        })
        new CustomResource(this, 'PostStackCreationResource', {
            provider: CustomResourceProvider.fromLambda(PostStackCreationLambda),
            properties: {
                FunctionArns: APIFunctionArns,
                AsynchronousFunctionArns: AsyncLambdas.map(lambdaFunction => lambdaFunction.functionArn),
                EnvironmentVariables: {
                    ...EnvironmentVariables,
                    PROFILE_EVENTS_HANDLER: ProfileEventsHandler.functionArn,
                    POST_EVENTS_HANDLER: PostEventsHandler.functionArn,
                    ASYNC_API_REQUEST_HANDLER: AsyncAPIRequestHandler.functionArn
                },

                // property change will force CustomResource to run on all deployments
                Timestamp: Date.now()
            }
        })
    }

    buildSortTable(tableName: string, primaryKey: string, sortKey: string = "id", createTimestampIndex: boolean = true): Table {
        const table = new Table(this, tableName, {
            partitionKey: {
                name: primaryKey,
                type: AttributeType.STRING
            },
            sortKey: {
                name: sortKey,
                type: AttributeType.STRING
            },
            billingMode: BillingMode.PAY_PER_REQUEST,
            removalPolicy: this.removalPolicy
        });

        if (createTimestampIndex) {
            table.addLocalSecondaryIndex({
                indexName: `${tableName}ByTimestamp`,
                sortKey: {
                    name: "timeSortKey",
                    type: AttributeType.STRING
                },
                projectionType: ProjectionType.ALL
            })
        }

        return table
    }

    constructSnsTopicSubscriptionValidation(validationLambda: LambdaFunction) {
        const CloudTrailBucket = new Bucket(this, 'CloudTrailS3Bucket', {
            accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
            lifecycleRules: [{
                expiration: Duration.days(7)
            }],
            removalPolicy: this.removalPolicy
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
                        arn: validationLambda.functionArn
                    }
                }
            }]
        })

        validationLambda.addPermission('SnsSubscriptionValidationLambdaPermission', {
            action: 'lambda:InvokeFunction',
            principal: new ServicePrincipal("events.amazonaws.com")
        })
    }

    indexArn(table: Table, indexName: string) {
        return `${table.tableArn}/index/${indexName}`
    }

    createTopic(id: string) {
        const topic = new Topic(this, id)
        topic.addToResourcePolicy(new PolicyStatement({
            principals: [new AnyPrincipal()], // SNS subscription validation lambda will remove anyone that shouldn't subscribe
            actions: ['sns:Subscribe'],
            resources: [topic.topicArn]
        }))
        new CfnOutput(this, `${id}Output`, {
            value: topic.topicArn
        })

        return topic
    }
}