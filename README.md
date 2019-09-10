# social-freedom
Open-source social networking framework where each user account owns their infrastructure, thus all of their data and costs of ownership. A thin "federal" account orchestrates this by providing identity sign-in/up functionality, and identity to infrastructure account mappings, as well as a search index so users can find other accounts based on metadata that account has chosen to make searchable.

Participation in the profile/account search index would be optional, making it so that accounts can essentially remain anonymous to the federal layer and central ownership is extremely minimal. Accounts not in the index would be able to exchange follows in-person via a scannable code.

# Infrastructure Details
Here is what the Federal and User-owned infrastructure accounts would maintain. Current assumption is AWS is used for infrastructure of all accounts.

## Federal account
The central account whose main duty is to orchestrate the sign-in and then delegate to the user's own AWS account. A secondary function of this account is providing search to allow accounts to find one another, but this is opt-in.
* VPC
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
  * Account registration, Cognito identity, AWS region, and AWS account ID provided
    * Verify identity, region, and account ID
    * Deploy CloudFormation template to account
      * Will need to fail back to the UX with instructions on adding an IAM policy if this fails
    * Add identity to account id mapping in DynamoDB
    * Grab initial profile data, if present
    * Invoked directly from UX synchronously, no SNS topic needed
  * Account deregistration
    * Reverse of account registration
  * Account profile updated, SNS topic subscription
    * Update account search index

## User accounts, 1 AWS account per user
User owns their AWS account, which includes all their posts and uploads, and they are responsible for providing their own payment information. Account usage should be designed to take advantage of AWS Free Tier to the extent possible, ideally costing users less than $1 per month.

Some costs to a user may be the result of someone else's actions, such as when a follower views their posts or media, or updates to a followed account results in updates to their news feed index. It would probably be encouraged that users set a spending cap on their account to limit any chance of unexpected runaway costs.

* DynamoDB table containing news feed entries
  * Entries are essentially updates from all subscription topics
  * We'd want to use a sort key and secondary index here, this would allow us to use the Query action to grab the last X entries in descending order to build the news feed
  * The primary key would probably need to be a hardcoded value.
* S3 object containing friends/follows
  * Simple list of account IDs
* S3 bucket(s) for images/video
  * CloudFront (optional for images? Required for video)
  * Auto-publishes to SNS topics for object creation events
  * Could be one bucket with “directories” for images/video, could also combine with profile/preferences data (also different directories)
* DynamoDB table for profile/preferences data
  * Preferences:
    * Opt-in to search index
    * Which fields to index (if opted-in to the above): name, phone, email, etc...
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
* IAM roles for different permission levels
* IAM groups for friends and other allowed follows
  * Accepting a friend/follow request adds the identity to this group
  * Could allow for creation of multiple groups, would work similar to Google Plus’ circles
* SNS Topics
  * Post created/modified/deleted
  * Post activity created/modified/deleted
  * Follow request received
  * Follow acceptance received
  * Follow rejection/removal received
  * Profile modified
* Lambdas
  * Requesting a follow
    * Add the account ARN to an IAM Group for follows, would need to provide access to the "Follow accepted"
    SNS topic
    * Directly trigger a Lambda or publish to known SNS topic in the account you want to follow
      * Would require that this Lambda ARN is deterministic, should be achievable if we know the account
      ARN and the Lambda function name never changes
      * One of the parameters here might be the ARN to the Lambda that the other account should
      eventually call if the response is PENDING
        * Not entirely necessary if the Lambda ARN is deterministic as described above
  * Receiving a follow request
    * One of 3 return values: DENIED, PENDING, and ACCEPTED
      * DENIED if the requesting account is already blocked or this user account otherwise is set to
      auto-deny
      * ACCEPTED if no auto-deny conditions are met and this user account is completely public
        * Sort of a Twitter-style account, follow requests don't require acceptance
      * PENDING if neither of the above
        * Add this account ARN to a list somewhere for review on next log-in
  * Accepting a follow request
    * Adds Cognito identity to appropriate IAM group, granting subscribe permissions to SNS topics
    and read permissions to posts and comments
    * Publish to SNS topic in the requesting account
  * Denying a follow request
    * Publish to SNS topic in the requesting account
  * Follow accepted, SNS topic subscription
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
  * Probably something to monitor account costs and notify user account if certain thresholds are hit?
    
# Deployments
There needs to be a way for code changes to the infrastructure (federal or user) to get propagated out to all AWS accounts. 
This can probably be done by creating a Code pipeline within AWS accounts, CodeBuild can be hooked into the GitHub repo
and run the relevant CDK command, etc...

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
* Cross-region account communications, what's feasible?
  * Lambdas can subscribe to SNS topics in any region
* How does blocking someone work? If I comment on a friend's post, that comment (per current design) 
would be stored in that friend's AWS account, but would need to be kept apprised of who my account
is currently blocking (even if that changes after I make the comment). This needs further thought. A 
couple possible solutions:
  * "Comment at your own risk" - comments on someone else's post is visible to anyone that can see that 
  post, no other conditions applied
  * Instead of direct DynamoDB access for all followers/friends of an account, put this access behind
  an API with some thin compute layer (Lambda) that does some additional (not AWS out-of-the-box) 
  access control check. This could be as complex as referencing policies in other accounts, or as
  simple as comparing to a blacklist of account IDs that were snapshotted at the time of the comment
  (snapshotting in this case implies that the blacklist won't stay updated if more accounts are blocked).
* Any downside to directly triggering Lambda's across accounts? Is this less failure-proof than an publishing
to an SNS topic or SQS queue in that account?
* Can a "requester pays" bucket be used for images/video so that only the people consuming the media 
get charged? This may not be possible with our use of CloudFront.