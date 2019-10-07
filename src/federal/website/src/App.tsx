import React, {Component} from 'react'
import {Button, Container, Grid, Image, Loader, Menu, Placeholder, Segment, Visibility} from 'semantic-ui-react'
import Auth from "./services/auth";
import {GetIdentityResponse} from "../../../shared/auth-types";
import Feed from "./components/Feed";
import HomepageHeading from "./components/HomepageHeading";
import HomepageContent from "./components/HomepageContent";
import Footer from "./components/Footer";
import AccountRegistration from "./components/AccountRegistration";

type AppState = {
  menuFixed: boolean,
  identityLoading: boolean
} & GetIdentityResponse
class App extends Component<{}, AppState> {
  constructor(props: {}, state: AppState) {
    super(props, state)

    const isAuthenticated = Auth.isAuthenticated()
    this.state = {
      menuFixed: false,
      isAuthenticated: isAuthenticated,
      identityLoading: isAuthenticated
    }
  }

  async componentDidMount(): Promise<void> {
    if (this.state.isAuthenticated) {
      try {
        const identity:GetIdentityResponse = await Auth.getIdentity()
        this.setState({
          identityLoading: false,
            ...identity
        })
      } catch (err) {
        this.setState({
          isAuthenticated: false,
          identityLoading: false
        })
      }
    }
  }

  hideFixedMenu = () => this.setState({ menuFixed: false })
  showFixedMenu = () => this.setState({ menuFixed: true })

  render() {
    const {isRegistered, isAuthenticated, identityLoading, identity, menuFixed} = this.state

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
            <Button as='a' inverted={!menuFixed} onClick={() => window.location.href = Auth.getAuthUrl('login')}>
              Log in
            </Button>
            <Button as='a' inverted={!menuFixed} primary={menuFixed} style={{marginLeft: '0.5em'}} onClick={() => window.location.href = Auth.getAuthUrl('signup')}>
              Sign Up
            </Button>
          </React.Fragment> ||
          identityLoading &&
          <Placeholder inverted>
            <Placeholder.Line length={'long'} />
          </Placeholder> ||
          <Grid columns={2} divided>
            <Grid.Row>
              <Grid.Column verticalAlign="middle">
                Welcome {identity && identity.username}!
              </Grid.Column>
              <Grid.Column>
                <Button as='a' secondary onClick={() => window.location.href = Auth.getAuthUrl('logout')}>
                  Logout
                </Button>
              </Grid.Column>
            </Grid.Row>
          </Grid>}
        </Menu.Item>
      </Container>
    </Menu>

    if (!isAuthenticated) {
      if (!identityLoading) {
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
        return <Loader active />
      }
    } else {
      return <React.Fragment>
        {menu}
        {isRegistered && <Feed /> || <AccountRegistration identityId={identity && identity.id || ''} />}
      </React.Fragment>
    }
  }
}

export default App

