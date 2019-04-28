# social-freedom
Open-source social networking framework where each user account owns their infrastructure, thus all of their data and costs of ownership. A thin "federal" account orchestrates this by providing identity sign-in/up functionality, and identity to infrastructure account mappings, as well as a search index so users can find other accounts based on metadata that account has chosen to make searchable.

Participation in the profile/account search index would be optional, making it so that accounts can essentially remain anonymous to the federal layer and central ownership is extremely minimal. Accounts not in the index would be able to exchange follows in-person via a scannable code.

# Insfrastructure Details
Here is what the Federal and User-owned infrastructure accounts would maintain. Current assumption is AWS is used for infrastructure of all accounts.

## Federal account
* ElasticSearch index to find accounts by email, phone, name, etc…
* Static website assets in S3/CloudFront
* Cognito identities for sign-in
  * Cognito Hosted UI can be used for sign-in/up
* DynamoDB "identity to account" table containing mapping of cognito identity (arn) to account id that owns their infrastructure
* Lambdas
  * Account creation, new account ID provided
    * Deploy CloudFormation template to account
    * Add identity to account id mapping in DynamoDB
    * Subscribe to SNS topic for profile updates
  * Account deletion
    * Reverse of account creation
  * Account profile updated, SNS topic subscription
    * Update account search index

## User accounts, 1 AWS account per user
User owns their AWS account, which includes all their posts and uploads, and they are responsible for providing their own payment information. Account usage should be designed to take advantage of AWS Free Tier to the extent possible, ideally costing users less than $1 per month.

Some costs to a user may be the result of someone else's actions, such as when a follower views their posts or media, or updates to a followed account results in updates to their news feed index. It would probably be encouraged that users set a spending cap on their account to limit any chance of unexpected runaway costs.

* ElasticSearch index of news feed entries (optional)
* ElasticSearch index of follows
  * Alternatively, DynamoDB table, scanning is slower
  * Could minimally just be account IDs, but may also cache some critical profile data (e.g. name)
* S3 bucket(s) for images/video
  * CloudFront (optional for images? Required for video)
  * Auto-publishes to SNS topics for object creation events
  * Could be one bucket with “directories” for images/video, could also combine with profile/preferences data (also different directories)
* S3 bucket for profile/preferences data
  * Profile auto-publishes to SNS topic (optional, depends on account prefs)
  * Could use DynamoDB for this but S3 will do the auto-publish to SNS
  * Might just use one bucket for this and the images/video, organized by directories within the bucket
* DynamoDB table of posts
  * Stores metadata for all text and media posts
  * All posts can contain tags of other users, tags for categorization (including albums for media), and location data
  * An entry may get created from another users’ post (user tags), so “origin account id” is an optional field
  * Links to S3 files, for media
    * Should only ever link to media within this account, if we copy tagged posts
* IAM roles for different permission levels
* IAM groups for friends and other allowed follows
  * Accepting a friend/follow request adds the identity to this group
  * Could allow for creation of multiple groups, would work similar to Google Plus’ circles
* Lambdas
  * Accepting a follow
    * Adds cognito identity to appropriate IAM group
    * Notifies following account of add (SNS publish)
  * Follow accepted, SNS topic subscription
    * Create subscription for news feed updates (optional, depends on account prefs)
    * Notify account owner (depending on account settings)
    * Persist relationship to ElasticSearch
  * Removing a follow
    * Removes identity from requested group
  * Follow removed, SNS topic subscription
    * Drop subscription
    * Remove relationship entry from ElasticSearch
  * Following account update, SNS topic subscription(s)
    * Append change data to news feed ElasticSearch index
    * Notify account owner (depending on preferences)
    * Update index of follows with new profile data
    * If post contains user tags referencing this account
      * Creates/updates/deletes a “post” DynamoDB entry within this account, referencing tagged content, flagged as unpublished (nobody else can view)
      * Notify user account, store only a reference to the tagged content in the "posts" table
  * Tagged content rejected
    * Remove unpublished content
  * Tagged content accepted
    * Copies any attached media to this account’s S3 bucket so now it’s subject to this account’s sharing preferences
    * Updates "post" entry to reference account-owned content, removes unpublished flag
  * Image/video uploaded
    * Listens to S3 bucket SNS topics and automatically does post-processing on uploaded images/videos (e.g. creating thumbnails)
      * AWS might provide some out-of-the-box solution for this
  * Create/update/delete post (listens to DynamoDB posts table changes)
    * Publishes to appropriate SNS topics (there may be different topics depending on whether post is text/image/video/etc…)
      * Only do this if unpublished flag isn't set, or it's being removed
