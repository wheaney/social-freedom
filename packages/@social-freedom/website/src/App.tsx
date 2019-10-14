import React, {Component} from 'react'
import {Button, Container, Grid, Loader, Menu, Placeholder, Segment, Visibility} from 'semantic-ui-react'
import Auth from "./services/auth";
import {AuthDetails} from "@social-freedom/types";
import NewsFeed from "./components/NewsFeed";
import HomepageHeading from "./components/HomepageHeading";
import HomepageContent from "./components/HomepageContent";
import Footer from "./components/Footer";
import AccountRegistration from "./components/AccountRegistration";
import { AuthContext } from './components/AuthContext';

type AppState = {
    menuFixed: boolean,
    identityLoading: boolean,
    authDetails: AuthDetails
}

class App extends Component<{}, AppState> {

    constructor(props: {}, state: AppState) {
        super(props, state)

        const isAuthenticated = Auth.isAuthenticated()
        this.state = {
            menuFixed: false,
            identityLoading: isAuthenticated,
            authDetails: {
                isAuthenticated: isAuthenticated
            }
        }

        this.refreshIdentity = this.refreshIdentity.bind(this)
    }

    async componentDidMount(): Promise<void> {
        if (this.state.authDetails.isAuthenticated) {
            await this.refreshIdentity()
        }
    }

    async refreshIdentity() {
        try {
            const auth: AuthDetails = await Auth.getIdentity()
            this.setState({
                identityLoading: false,
                authDetails: auth
            })
        } catch (err) {
            this.setState({
                authDetails: {
                    isAuthenticated: false
                },
                identityLoading: false
            })
        }
    }

    hideFixedMenu = () => this.setState({menuFixed: false})
    showFixedMenu = () => this.setState({menuFixed: true})
    render() {
        const {identityLoading, authDetails, menuFixed} = this.state
        const isAuthenticated = authDetails.isAuthenticated

        const menu = <Menu
            fixed={!isAuthenticated && menuFixed ? 'top' : undefined}
            inverted={!isAuthenticated && !menuFixed}
            pointing={!isAuthenticated && !menuFixed}
            secondary={!isAuthenticated && !menuFixed}
            size='large'
        >
            <Container>
                <Menu.Item header>
                    Social Freedom
                </Menu.Item>
                <Menu.Item position='right'>
                    {!isAuthenticated &&
                    <React.Fragment>
                        <Button as='a' inverted={!menuFixed}
                                onClick={() => window.location.href = Auth.getAuthUrl('login')}>
                            Log in
                        </Button>
                        <Button as='a' inverted={!menuFixed} primary={menuFixed} style={{marginLeft: '0.5em'}}
                                onClick={() => window.location.href = Auth.getAuthUrl('signup')}>
                            Sign Up
                        </Button>
                    </React.Fragment> ||
                    identityLoading &&
                    <Placeholder inverted>
                        <Placeholder.Line length={'long'}/>
                    </Placeholder> ||
                    <Grid columns={2} divided>
                        <Grid.Row>
                            <Grid.Column verticalAlign="middle">
                                Welcome {authDetails.identity && authDetails.identity.username}!
                            </Grid.Column>
                            <Grid.Column>
                                <Button as='a' secondary
                                        onClick={() => window.location.href = Auth.getAuthUrl('logout')}>
                                    Logout
                                </Button>
                            </Grid.Column>
                        </Grid.Row>
                    </Grid>}
                </Menu.Item>
            </Container>
        </Menu>

        if (!isAuthenticated) {
            return <React.Fragment>
                <Visibility
                    once={false}
                    onBottomPassed={this.showFixedMenu}
                    onBottomPassedReverse={this.hideFixedMenu}
                >
                    <Segment
                        inverted
                        textAlign='center'
                        style={{minHeight: 700, padding: '1em 0em'}}
                        vertical
                    >
                        {menu}
                        <HomepageHeading/>
                    </Segment>
                </Visibility>

                <HomepageContent/>
                <Footer/>
            </React.Fragment>
        } else {
            if (!identityLoading) {
                return <AuthContext.Provider value={authDetails}>
                    {menu}
                    {authDetails.isRegistered && <NewsFeed/> ||
                    <AccountRegistration submitSuccess={this.refreshIdentity}/>}
                </AuthContext.Provider>
            } else {
                return <Loader active/>
            }
        }
    }
}

export default App

