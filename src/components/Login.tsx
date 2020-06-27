import * as React from "react";
import { LoginView, LoginViewProps } from "./LoginView";

export interface LoginProps {
  component?: React.ComponentType<LoginViewProps>;
  error?: string;
  login?(username: string, password: string): void;
  navigateToSignUp?(): void;
}

export class Login extends React.Component<LoginProps> {
  static defaultProps = {
    component: LoginView,
  };

  state = {
    username: "",
    password: "",
  };

  setUsername = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ username: event.target.value });

  setPassword = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ password: event.target.value });

  login = (): void => {
    this.props.login(this.state.username, this.state.password);
  };

  render(): React.ReactNode {
    const props = {
      error: this.props.error,
      login: this.login,
      navigateToSignUp: this.props.navigateToSignUp,
      username: this.state.username,
      setUsername: this.setUsername,
      password: this.state.password,
      setPassword: this.setPassword,
    };

    if (!React.isValidElement(this.props.component)) {
      return React.createElement(this.props.component, props);
    } else {
      return React.cloneElement(this.props.component, props);
    }
  }
}
