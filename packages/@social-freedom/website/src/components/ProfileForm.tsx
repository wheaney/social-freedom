import {Component, default as React, ReactNode} from "react";
import {Form, Modal} from "semantic-ui-react";
import {Profile as ProfileType} from "@social-freedom/types";
import Profile from "../services/Profile";
import {SessionContext} from "../contexts/SessionContext";
import {InputOnChangeData} from "semantic-ui-react/dist/commonjs/elements/Input/Input";

type State = ProfileType & {
    nameError?: boolean
}
type Props = {
    trigger: ReactNode
}
export default class ProfileForm extends Component<Props, State> {
    static contextType = SessionContext
    context!: React.ContextType<typeof SessionContext>

    private focusInputRef: React.RefObject<any>

    constructor(props: any, state: any) {
        super(props, state)

        this.state = {
            name: '',
            photoUrl: ''
        }

        this.handleChange = this.handleChange.bind(this)
        this.submitRequest = this.submitRequest.bind(this)
        this.focusInputRef = React.createRef();
    }

    handleChange(e: any, {name, value}: InputOnChangeData) {
        this.setState({...this.state, [name]: value})
    }

    async submitRequest() {
        const stateUpdate = {
            nameError: !this.state.name
        }

        const internalApiOrigin = this.context.auth.accountIdentifiers?.apiOrigin
        if (!stateUpdate.nameError && internalApiOrigin) {
            const updatedProfile: ProfileType = {...this.state}
            await Promise.all([
                Profile.put(internalApiOrigin, updatedProfile),
                this.setState({
                    name: '',
                    photoUrl: '',
                    ...stateUpdate
                })
            ])

            // update profile in the cached users session context, this will make the change propagate
            // to anywhere the profile was being rendered
            let thisUserId = this.context.auth?.identity?.id ?? ''
            let cachedThisAccount = this.context.users?.[thisUserId]
            if (cachedThisAccount) {
                const thisAccount = {
                    ...cachedThisAccount,
                    ...updatedProfile
                }
                this.context.updateUsers?.({[thisUserId]: thisAccount})
            }
        } else {
            this.setState(stateUpdate)
        }
    }

    render() {
        return <Modal trigger={this.props.trigger}>
            <Modal.Header>Your Profile</Modal.Header>
            <Modal.Content>
                <Form>
                    <Form.Input fluid focus autoFocus label='Name' name='name' value={this.state.name}
                                error={this.state.nameError} onChange={this.handleChange}/>
                    <Form.Input fluid label='Photo URL' name='photoUrl' value={this.state.photoUrl}
                                onChange={this.handleChange}/>
                    <Form.Button onClick={this.submitRequest}>Save</Form.Button>
                </Form>
            </Modal.Content>
        </Modal>
    }
}