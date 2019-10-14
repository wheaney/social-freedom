import {APIGatewayEvent} from "aws-lambda";

const Util = {
    apiGatewayProxyWrapper: async (proxyFunction: () => Promise<any>) => {
        try {
            return Util.apiGatewayLambdaResponse(200, await proxyFunction())
        } catch (err) {
            console.error(err)
            return Util.apiGatewayLambdaResponse(500)
        }
    },

    apiGatewayLambdaResponse: (httpStatus: number = 200, responseBody?: any) => {
        return {
            statusCode: httpStatus.toString(),
            body: responseBody ? JSON.stringify(responseBody) : '',
            isBase64Encoded: false,
            headers: {
                'Access-Control-Allow-Origin': process.env.CORS_ORIGIN
            }
        }
    },

    getUserId: (event: APIGatewayEvent) => {
        return event.requestContext.authorizer.claims.sub
    }
}

export default Util