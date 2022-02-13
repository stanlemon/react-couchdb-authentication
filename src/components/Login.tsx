import * as React from "react";
import { Context } from "./Authentication";
import { LoginView, LoginViewProps } from "./LoginView";

export interface LoginProps {
  component: React.ComponentType<LoginViewProps>;
}

export class Login extends React.Component<LoginProps> {
  static defaultProps = {
    component: LoginView,
  };

  state = {
    username: "",
    password: "",
  };

  #setUsername = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ username: event.target.value });

  #setPassword = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ password: event.target.value });

  render(): React.ReactNode {
    return (
      <Context.Consumer>
        {({ error, login, navigateToSignUp }) => {
          const props = {
            error,
            login: (): void => {
              login(this.state.username, this.state.password);
            },
            navigateToSignUp,
            username: this.state.username,
            setUsername: this.#setUsername,
            password: this.state.password,
            setPassword: this.#setPassword,
          };
          return React.createElement(
            this.props.component,
            props as LoginViewProps
          );
        }}
      </Context.Consumer>
    );
  }
}
