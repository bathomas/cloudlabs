const aws = require("aws-sdk");

const dynamoClient = new aws.DynamoDB.DocumentClient({
    region: "eu-west-2",
});
const tableName = "cloudlabs-basic-userMedia-db";

exports.handler = async (event, context) => {
    const username = event.requestContext.authorizer.lambda.username;
    const mediaItemId = event.pathParameters.mediaItemId;

    if (event.body == null) {
        const response = {
            statusCode: 422,
            body: JSON.stringify({
                message: "Invalid inputs passed. Please check your data.",
            }),
        };
        return response;
    }

    const body = JSON.parse(event.body);

    const title = body.title;
    const description = body.description;

    let userMediaItem;
    try {
        userMediaItem = await findExistingMedia(username, mediaItemId);
    } catch (err) {
        const response = {
            statusCode: 500,
            body: JSON.stringify({
                message: "Something went wrong. Could not fetch media item",
            }),
        };
        return response;
    }

    if (userMediaItem.Count === 0 || userMediaItem.Items.length === 0) {
        const response = {
            statusCode: 404,
            body: JSON.stringify({
                message: "Could not find media item with this ID.",
            }),
        };
        return response;
    }

    // remove these bits if not needed
    //userMediaItem = userMedia.Items[0];

    // update the found media item with the new title and description
    // userMediaItem.MediaTitle = title;
    // userMediaItem.MediaDescription = description;

    const params = {
        TableName: tableName,
        Key: {
            pk: username,
            sk: mediaItemId,
        },
        UpdateExpression:
            "set MediaTitle = :title, MediaDescription = :description",
        ExpressionAttributeValues: {
            ":title": title,
            ":description": description,
        },
    };

    let updatedMediaItem;
    try {
        updatedMediaItem = await dynamoClient.update(params).promise();
    } catch (error) {
        const response = {
            statusCode: 500,
            body: JSON.stringify({
                message: "Something went wrong. Could not update media item.",
            }),
        };
        return response;
    }

    return updatedMediaItem;
};

const findExistingMedia = async (username, mediaItemId) => {
    const params = {
        TableName: tableName,
        KeyConditionExpression: "#pk = :pk and #sk = :sk",
        ExpressionAttributeNames: {
            "#pk": "pk",
            "#sk": "sk",
        },
        ExpressionAttributeValues: {
            ":pk": username,
            ":sk": mediaItemId,
        },
    };

    let userMediaItem;
    try {
        userMediaItem = await dynamoClient.query(params).promise();
    } catch (err) {
        throw err;
    }

    return userMediaItem;
};