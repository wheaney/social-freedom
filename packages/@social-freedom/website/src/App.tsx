import React, {Component} from 'react'
import {Button, Container, Dropdown, Item, Loader, Menu, Placeholder, Segment, Visibility} from 'semantic-ui-react'
import Auth from "./services/Auth";
import {AuthDetails} from "@social-freedom/types";
import NewsFeed from "./components/NewsFeed";
import HomepageHeading from "./components/HomepageHeading";
import HomepageContent from "./components/HomepageContent";
import Footer from "./components/Footer";
import AccountRegistration from "./components/AccountRegistration";
import {UserDetails} from "../../types/src";
import {SessionContext} from './contexts/SessionContext';
import FollowRequestForm from "./components/FollowRequestForm";
import IncomingFollowRequests from "./components/IncomingFollowRequests";
import ProfileForm from "./components/ProfileForm";

type AppState = {
    menuFixed: boolean,
    identityLoading: boolean,
    authDetails: AuthDetails,
    userDetails: UserDetails
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
            },
            userDetails: {}
        }

        this.refreshIdentity = this.refreshIdentity.bind(this)
        this.updateUserDetails = this.updateUserDetails.bind(this)
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

    updateUserDetails(updatedDetails: UserDetails) {
        this.setState({
            userDetails: {
                ...this.state.userDetails,
                ...updatedDetails
            }
        })
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
                    <Dropdown text={authDetails.identity?.username}>
                        <Dropdown.Menu>
                            <ProfileForm trigger={<Dropdown.Item text='Profile'/>}/>
                            <Dropdown.Divider/>
                            <Dropdown.Item text='Log out'
                                           onClick={() => window.location.href = Auth.getAuthUrl('logout')}/>
                        </Dropdown.Menu>
                    </Dropdown>}
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
                return <SessionContext.Provider value={{
                    auth: this.state.authDetails,
                    users: this.state.userDetails,
                    updateUsers: this.updateUserDetails
                }}>
                    {menu}
                    {authDetails.isRegistered && <Container>
                        <Item.Group>
                            <Item content={<NewsFeed/>}/>
                            <Item content={<IncomingFollowRequests/>}/>
                            <Item content={<FollowRequestForm/>}/>
                        </Item.Group>
                    </Container> ||
                    <AccountRegistration submitSuccess={this.refreshIdentity}/>}
                </SessionContext.Provider>
            } else {
                return <Loader active/>
            }
        }
    }
}

export default App

