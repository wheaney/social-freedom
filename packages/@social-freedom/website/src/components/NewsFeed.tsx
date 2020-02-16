import * as React from 'react'
import {Component} from 'react'
import {FeedEntry} from "@social-freedom/types";
import {Feed, Form, Image, Loader, TextAreaProps} from "semantic-ui-react";
import {SessionContext} from "../contexts/SessionContext";
import Posts from "../services/Posts";
import {default as FeedService} from "../services/Feed";

type State = {
    loading: boolean,
    entries: FeedEntry[],
    postBody: string,
    postBodyError?: boolean,
    postSuccess?: boolean,
    postError?: boolean,
}
export default class NewsFeed extends Component<any, State> {
    static contextType = SessionContext
    context!: React.ContextType<typeof SessionContext>

    constructor(props: any, state: State) {
        super(props, state)
        this.state = {
            loading: true,
            entries: [],
            postBody: ''
        }

        this.handleChange = this.handleChange.bind(this)
        this.submitPost = this.submitPost.bind(this)
        this.refreshFeed = this.refreshFeed.bind(this)
    }

    async componentDidMount() {
        await this.refreshFeed()
    }

    async refreshFeed() {
        this.setState({
            loading: true
        })

        const internalApiOrigin = this.context.auth.accountIdentifiers?.apiOrigin
        if (internalApiOrigin) {
            const cachedUsers = Object.keys(this.context.users)
            const result = await FeedService.getFeed(internalApiOrigin, cachedUsers)
            this.setState({
                loading: false,
                entries: result.entries
            })
            this.context.updateUsers && this.context.updateUsers(result.users)
        }
    }

    handleChange(e: any, {name, value}: TextAreaProps) {
        this.setState({
            ...this.state,
            [name]: value
        })
    }

    async submitPost() {
        const stateUpdate: any = {
            postSuccess: false,
            postError: false
        }
        stateUpdate.postBodyError = !this.state.postBody
        this.setState(stateUpdate)

        const internalApiOrigin = this.context.auth.accountIdentifiers?.apiOrigin;
        const userId = this.context.auth.identity?.id
        if (!stateUpdate.postBodyError && internalApiOrigin && userId) {
            try {
                await Posts.createPost(internalApiOrigin, userId, this.state.postBody)
                this.setState({
                    postSuccess: true,
                    postBody: ''
                })
                await this.refreshFeed()
            } catch (err) {
                console.error(err)

                this.setState({
                    postError: true
                })
            }
        }
    }

    render() {
        return <React.Fragment>
            <Form>
                <Form.TextArea label="Create a post" name='postBody' value={this.state.postBody}
                               onChange={this.handleChange}
                               error={this.state.postBodyError}/>
                <Form.Button onClick={this.submitPost}>Post</Form.Button>
            </Form>
            {this.state.loading && <Loader active /> ||
            <Feed>
                {this.state.entries.map(entry => {
                    const user = this.context.users[entry.userId]
                    return user && <Feed.Event key={entry.id}>
                        {user.photoUrl && <Feed.Label>
                            <Image src={user.photoUrl} />
                        </Feed.Label>}
                        <Feed.Content>
                            <Feed.Summary>
                                <Feed.User>{user.name}</Feed.User> posted
                                <Feed.Date>{new Date(entry.timestamp).toDateString()}</Feed.Date>
                            </Feed.Summary>
                            {entry.body.body}
                        </Feed.Content>
                    </Feed.Event>
                })}
            </Feed>}
        </React.Fragment>
    }
}