import Auth from "./Auth";


const Posts = {
    createPost: (apiOrigin: string, userId: string, body: string) => {
        return fetch(`${apiOrigin}/internal/posts`, {
            method: 'POST',
            body: JSON.stringify({
                userId: userId,
                type: 'Text',
                body: body
            }),
            headers: {
                'Authorization': Auth.getAuthToken()
            }
        })
    }
}

export default Posts