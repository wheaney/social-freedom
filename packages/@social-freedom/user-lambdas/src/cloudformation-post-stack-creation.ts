import {
    CloudFormationCustomResourceCreateEvent,
    CloudFormationCustomResourceEvent, CloudFormationCustomResourceFailedResponse,
    CloudFormationCustomResourceResponse,
    CloudFormationCustomResourceSuccessResponse, CloudFormationCustomResourceUpdateEvent
} from "aws-lambda";
import * as AWS from "aws-sdk";
import fetch from 'node-fetch';
import {EnvironmentVariables} from "aws-sdk/clients/lambda";

export const handler = async (event:CloudFormationCustomResourceEvent): Promise<any> => {
    const baseResponse = {
        PhysicalResourceId: isUpdateEvent(event) ? event.PhysicalResourceId : event.StackId + '-PostCreation',
        StackId: event.StackId,
        RequestId: event.RequestId,
        LogicalResourceId: event.LogicalResourceId
    }
    const successResponse:CloudFormationCustomResourceSuccessResponse = {
        Status: 'SUCCESS',
        ...baseResponse
    }
    let response:CloudFormationCustomResourceResponse = successResponse
    if (isCreateEvent(event) || isUpdateEvent(event)) {
        try {
            const Lambda = new AWS.Lambda()
            await Promise.all(event.ResourceProperties.FunctionArns.map((functionArn: string) => {
                return Lambda.updateFunctionConfiguration({
                    FunctionName: functionArn,
                    Environment: {
                        Variables: event.ResourceProperties.EnvironmentVariables as EnvironmentVariables
                    }
                }).promise()
            }))
        } catch (err) {
            console.error(err)

            const failedResponse:CloudFormationCustomResourceFailedResponse = {
                Status: 'FAILED',
                Reason: JSON.stringify(err),
                ...baseResponse
            }
            response = failedResponse
        }
    }
    await sendResponse(event.ResponseURL, response)
}

const sendResponse = async (responseUrl: string, responseBody:CloudFormationCustomResourceResponse) => {
    const responseBodyString = JSON.stringify(responseBody)
    await fetch(responseUrl, {
        method: 'PUT',
        headers: {
            "content-type": "",
            "content-length": responseBodyString.length.toString()
        },
        body: responseBodyString
    })
}

const isCreateEvent = (event:CloudFormationCustomResourceEvent):event is CloudFormationCustomResourceCreateEvent => {
    return event.RequestType === 'Create'
}

const isUpdateEvent = (event:CloudFormationCustomResourceEvent):event is CloudFormationCustomResourceUpdateEvent => {
    return event.RequestType === 'Update'
}