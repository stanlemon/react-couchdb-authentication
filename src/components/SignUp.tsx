import * as React from "react";
import { Context } from "./Authentication";
import { SignUpView, SignUpViewProps } from "./SignUpView";

export interface SignUpProps {
  component?: React.ComponentType<SignUpViewProps>;
}

export class SignUp extends React.Component<SignUpProps> {
  static defaultProps = {
    component: SignUpView,
  };

  state = {
    username: "",
    email: "",
    password: "",
  };

  #setUsername = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ username: event.target.value });
  };

  #setEmail = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ email: event.target.value });

  #setPassword = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ password: event.target.value });

  render(): React.ReactNode {
    return (
      <Context.Consumer>
        {({
          error,
          signUp,
          navigateToLogin,
        }: {
          error: string;
          signUp(username: string, password: string, email: string): void;
          navigateToLogin(): void;
        }) => {
          const props = {
            error,
            signUp: (): void => {
              signUp(
                this.state.username,
                this.state.password,
                this.state.email
              );
            },
            navigateToLogin,
            email: this.state.email,
            setEmail: this.#setEmail,
            username: this.state.username,
            setUsername: this.#setUsername,
            password: this.state.password,
            setPassword: this.#setPassword,
          };
          return React.createElement(this.props.component, props);
        }}
      </Context.Consumer>
    );
  }
}
