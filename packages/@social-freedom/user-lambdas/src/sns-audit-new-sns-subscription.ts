export const handler = async (event:any) => {
    /**
     * TODO - verify that:
     *  * event.detail.eventName is "Subscribe"
     *  * event.detail.requestParameters.protocol is "lambda"
     *  * event.detail.requestParameters.endpoint matches the anticipated lambda ARN
     *   * the lambda functionName contains the userId, parse this out and check that this userId is an approved follower
     *  * event.detail.requestParameters.topicArn is one of the anticipated follower topics
     *
     * If all the above are true, do nothing
     * Otherwise, remove the subscription
     **/

};