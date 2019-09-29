# social-freedom
Open-source social networking framework where each user account owns their infrastructure, thus all of their data and costs of ownership. A thin "federal" account orchestrates this by providing identity sign-in/up functionality, and identity to infrastructure account mappings, as well as a search index so users can find other accounts based on metadata that account has chosen to make searchable.

Participation in the profile/account search index would be optional, making it so that accounts can essentially remain anonymous to the federal layer and central ownership is extremely minimal. Accounts not in the index would be able to exchange follows in-person via a scannable code.

# Infrastructure Details
Here is what the Federal and User-owned infrastructure accounts would maintain. Current assumption is AWS is used for infrastructure of all accounts.

## Federal account
The central account whose main duty is to orchestrate the sign-in and then delegate to the user's own AWS account. A secondary function of this account is providing search to allow accounts to find one another, but this is opt-in.
* ElasticSearch index to find accounts by email, phone, name, etc…
  * Accounts may opt-in to this via preferences
* Static website assets in S3/CloudFront
* Route53 public DNS entries for the website
* Cognito identities for sign-in
  * Cognito Hosted UI can be used for sign-in/up
* DynamoDB "identity to account" table containing mapping of cognito identity (arn) to account id that owns their infrastructure
* SNS topics
  * Profile updated
* Lambdas
  * Account registration
    * Cognito identity and account routing details provided
    * Verify identity, region, and account ID
    * Add identity to account id mapping in DynamoDB
    * Deploy User CodePipeline CloudFormation template to account
      * Will need to fail back to the UX with instructions on adding an IAM policy if this fails
    * Invoked directly from UX synchronously, no SNS topic needed
  * Identity Account verification
    * Call to verify that a cognitoIdentityId is associated with the provided account details (e.g. followerApiDomain)
  * Account deregistration
    * Reverse of account registration
  * Account profile updated, SNS topic subscription
    * Update account search index

## User accounts, 1 AWS account per user
User owns their AWS account, which includes all their posts and uploads, and they are responsible for providing their own payment information. Account usage should be designed to take advantage of AWS Free Tier to the extent possible, ideally costing users less than $1 per month.

Some costs to a user may be the result of someone else's actions, such as when a follower views their posts or media, or updates to a followed account results in updates to their news feed index. It would probably be encouraged that users set a spending cap on their account to limit any chance of unexpected runaway costs.

* API Gateway endpoints exposing the Follower API (for retrieving and creating posts and post activities, among other things)
  * Use COGNITO authorizer, limit to Federal user pool
  * Lambda functions behind these APIs will need custom logic to verify the cognitoIdentityId (`event.requestContext.identity.cognitoIdentityId`) matches expectations
    * If the account's isPublic flag is true, then no check is needed since the AWS_IAM authorizer would have
    already verified the cognito identity pool.
* DynamoDB table containing news feed entries
  * Entries are essentially updates from all subscription topics
  * We'd want to use a sort key and secondary index here, this would allow us to use the Query action to grab the last X entries in descending order to build the news feed
  * The primary key would probably need to be a hardcoded value.
* S3 object containing friends/follows
  * Simple list of account IDs
* S3 bucket(s) for images/video
  * Bucket is private, CloudFront provides public access
    * Lambda@EDGE authorizer here should allow us to limit who has access
  * Auto-publishes to SNS topics for object creation events
  * Could be one bucket with “directories” for images/video, could also combine with profile/preferences data (also different directories)
* DynamoDB table for profile/preferences data
  * Preferences:
    * Opt-in to search index
    * Which fields to index (if opted-in to the above): name, phone, email, etc...
    * Which fields other people can see
      * Should probably warn about fields like phone number and email if this profile is public
    * Auto-accept follow requests (public profile, Twitter-style)
    * Allow other accounts to post to my account
      * Text-only, allow images/video
      * Depending on how/whether we want to allow "tagging" of content, that may replace this functionality. This preference
      would become "Allow other accounts to tag me in their posts"
* DynamoDB table of posts
  * Stores metadata for all text and media posts
  * Links to S3/CloudFront, for media
    * This should only ever link to media within this account, if we copy the media from tagged posts
  * Same storage strategy as news feed entries: hardcoded primary key and usage secondary index
  sort key to allow for Query to grab the X most recent
  * Tagging (later feature):
    * All posts can contain tags of other users, tags for categorization (including albums for media), and location data
    * An entry may get created from another users’ post (user tags), so “origin account id” is an optional field
* DynamoDB table of activities on a post
  * Stores metadata regarding all reactions/comments to a post
  * Same storage strategy as news feed entries: hardcoded primary key and usage secondary index 
  sort key to allow for Query to grab the X most recent
* SNS Topics
  * Post and post activities created/modified/deleted
  * Profile modified
* CloudTrail trail to log all activity
  * Do we need some way to clean up the S3 bucket? or automatic expiration
* CloudWatch Events Rule that watches CloudTrail for SNS Subscribe events
  * Triggers Lambda for validating subscriptions
* Lambdas
  * Requesting a follow
    * Add the account ARN to an IAM Group for follows, would need to provide access to the "Follow accepted/denied"
    Lambda
    * Directly trigger a Lambda the account you want to follow
      * Would require that this Lambda ARN is deterministic, should be achievable if we know the account
      ARN and the Lambda function name never changes
  * Receiving a follow request
  * Accepting a follow request
    * Adds Cognito identity to appropriate IAM group, granting subscribe permissions to SNS topics
    and read permissions to posts and comments
    * Call a lambda in the requesting account
  * Denying a follow request
    * Call a lambda in the requesting account
  * Follow accepted
    * Create subscription for news feed updates (optional, depends on account prefs)
    * Notify account owner (depending on account settings)
    * Persist relationship and cache profile data to follows table
  * Removing a follow
    * Removes identity from requested group
    * Notifies following account of remove (SNS publish)
  * Follow removed, SNS topic subscription
    * Drop subscription
    * Remove relationship entry from friends table
  * Following account update, SNS topic subscription(s)
    * Update cached profile data for follows
  * Tagged content rejected
    * Remove unpublished content
  * Tagged content accepted
    * Copies any attached media to this account’s S3 bucket so now it’s subject to this account’s sharing preferences
    * Updates "post" entry to reference account-owned content, removes unpublished flag
  * Image/video uploaded
    * Listens to S3 bucket SNS topics and automatically does post-processing on uploaded images/videos (e.g. creating thumbnails)
      * AWS might provide some out-of-the-box solution for this
  * Create/update/delete post (listens to posts table changes)
    * Publishes to appropriate SNS topics (there may be different topics depending on whether post is text/image/video/etc…)
      * Only do this if unpublished flag isn't set, or it's being removed
  * Create/update/delete post activities (listens to DynamoDB post activities table changes)
    * Publishes to appropriate SNS topics (possibly same topics as for posts)
  * Modify profile
    * Writes to profile Dynamo table
    * Publishes updated profile to Federal SNS topic, if set in preferences
  * Modify preferences
    * May publish to Federal stack's profile-changed SNS topic to remove or add profile data, 
    if this setting is changed
  * Validate SNS subscriptions
    * Watch for sns:Subscribe CloudWatch Event notifications (via CloudTrail) and remove any that
    aren't in the approved followers list
  * Probably something to monitor account costs and notify user account if certain thresholds are hit?

# Deployments
Deployments to the Federal and User stacks would be achievable through CodePipeline stacks. This means we'll actually
have two more CloudFormation (CDK) stacks to create that will do the one-time setup of the Federal and User CodePipeline
stacks. The User CodePipeline stack would be what the Federal stack actually deploys to a new account on registration.

The stack would simply build a CodePipeline pipeline. We could probably use the following actions:
* [Githib Source polling](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codepipeline-actions.GitHubSourceAction.html)
* Presumably we'd need to use the [Code build action](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codepipeline-actions.CodeBuildAction.html) to build the relevant CloudFormation template (federal or user stack)
* [CloudFormation Create/Update stack](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codepipeline-actions.CloudFormationCreateUpdateStackAction.html)
* [Lambda invoke action](https://docs.aws.amazon.com/cdk/api/latest/docs/@aws-cdk_aws-codepipeline-actions.LambdaInvokeActionProps.html)
to write relevant CloudFormation outputs to AccountDetails table (or some other persistence that other user accounts would have access to)

I also found this: the [app-delivery](https://github.com/aws/aws-cdk/tree/master/packages/@aws-cdk/app-delivery) CDK 
library seems built just for this usage, and the example on that page can be used as a base for what
we need to do here.

# Testing and deploying CDK changes in dev
1. Make sure you've configured your AWS CLI (you should have files present in ~/.aws) to use your own
personal AWS account
2. Use `npm run` with the `userstackcheck` or `federalstackcheck` targets. This will:
  * Compile your Lambda definitions into JS using `tsc`
  * Use the CDK command-line tool to load the desired stack
  * Run the `list` command on that stack. The output will simply be the name of the stack.
3. Use `npm run` with the `userstackdeploy` or `federalstackdeploy` targets. This will do the same as 
above, but will use the `deploy` CDK command on the stack, which will deploy to your personal AWS account.
4. Be sure to revert the CloudFormation deployment when you're done for the day so you don't accumulate
charges for any per-hour services (e.g. ElasticSearch).
  * Alternatively, comment out any such infrastructure from your CDK code prior to Step #3 to prevent
  it from being deployed.

Note that these targets won't be used as a long-term deployment strategy to "production" federal or 
user AWS accounts. They're mostly intended for dev, but may be useful for the first-time setup of the
federal account.

# Open Questions
* Can a "requester pays" bucket be used for images/video so that only the people consuming the media 
get charged? This may not be possible with our use of CloudFront.
* How will "blocking" work? A user account can easily manage what its own APIs expose to accounts it may have blocked,
but if a user comments on a friend's post, the current design will have that friend's account "owning" that comment data. To 
restrict who can see a comment, a user account would need to keep itself apprised of all blocks for all friends'
accounts as well, which seems like a lot to manage. For now I think that post activities like this will need to simply be
"visible to all this friend's friends, regardless of your own blocks."