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
  * Account preferences updated
    * Update profile updated SNS topic subscription above, based on account prefs

## User accounts, 1 AWS account per user
User owns their AWS account, which includes all their posts and uploads, and they are responsible for providing their own payment information. Account usage should be designed to take advantage of AWS Free Tier to the extent possible, ideally costing users less than $1 per month. ElasticSearch is cost prohibitive after 12 months, so the ideal infrastructure won't rely on it; preferring Amazon Aurora for any storage that needs to support querying and returning multiple rows.

Aurora offers an interesting challenge if we choose to allow friend accounts direct read access to the database tables, and insert access for creating posts comments:
* What if I want to create a post that only some subset of my friends can see?
* We want friends to be able to edit their own posts on your page (if friend-created posts are a thing), but not any other posts.
* We want to be able to rate-limit insertions/updates from other users, so someone can't maliciously create a million DB entries and spike up your AWS costs.

Possible solutions:
* Utilize DB views to enforce read-permissions (different views for different groups)
* Disallow direct DB connections from friend accounts, instead create an API backed by Lambdas that can query the database. Lambda is an another cost in addition to DB queries so we'd want these functions to do simple SQL generation with qualifiers for filtering by permissions.
  * API Gateway usage plans would allow for throttling of write requests
* Don't allow direct posts to another account, instead users may "tag" their friends in posts and also update tagged posts. This allows for these posts/updates to propagate to another account via an existing mechanism from media posts. But it doesn't solve the need for throttling (the SNS subscription lambdas could enforce this themselves, though).


Some costs to a user may be the result of someone else's actions, such as when a follower views their posts or media, or updates to a followed account results in updates to their news feed index. It would probably be encouraged that users set a spending cap on their account to limit any chance of unexpected runaway costs.

* Aurora table of news feed entries
  * Entries are essentially updates from all subscription topics
  * Aurora is ~$0.11 per GB stored monthly, but someone with lots of follows/friends may accumulate a lot of data here, a couple options:
    * We periodically drop entries older then X days
    * Alternatively, archive them to S3
* Aurora table of follows/friends
  * Could minimally just be account IDs, but may also cache some critical profile data (e.g. name)
    * If it's as simple as just account IDs, could just be a file in S3, but since we'll already have Aurora tables, the data storage for this would be negligible -- no chance to increase costs, so we may as well put it here.
* S3 bucket(s) for images/video
  * CloudFront (optional for images? Required for video)
  * Auto-publishes to SNS topics for object creation events
  * Could be one bucket with “directories” for images/video, could also combine with profile/preferences data (also different directories)
* S3 bucket for profile/preferences data
  * Profile auto-publishes to SNS topic (optional, depends on account prefs)
  * Could use DynamoDB for this but S3 will do the auto-publish to SNS
  * Might just use one bucket for this and the images/video, organized by directories within the bucket
* Aurora table of posts
  * Stores metadata for all text and media posts
  * All posts can contain tags of other users, tags for categorization (including albums for media), and location data
  * An entry may get created from another users’ post (user tags), so “origin account id” is an optional field
  * Links to S3 files, for media
    * Should only ever link to media within this account, if we copy tagged posts
* Aurora table of activities on a post
  * Stores metadata regarding all reactions/comments to a post
  * Hash and range key, referencing post key and sort key of creation timestamp
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
    * Persist relationship to friends table
  * Removing a follow
    * Removes identity from requested group
    * Notifies following account of remove (SNS publish)
  * Follow removed, SNS topic subscription
    * Drop subscription
    * Remove relationship entry from friends table
  * Following account update, SNS topic subscription(s)
    * Append change data to news feed table
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
  * Create/update/delete post (listens to posts table changes)
    * Publishes to appropriate SNS topics (there may be different topics depending on whether post is text/image/video/etc…)
      * Only do this if unpublished flag isn't set, or it's being removed
  * Create/update/delete post activities (listens to DynamoDB post activities table changes)
    * Publishes to appropriate SNS topics (possibly same topics as for posts)
  * Clearing/archiving news feed entries based on account preferences
  * Probably something to monitor account costs and notify user account if certain thresholds are hit?
    
