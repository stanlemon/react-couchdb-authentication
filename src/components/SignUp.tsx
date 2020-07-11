import * as React from "react";
import { SignUpView, SignUpViewProps } from "./SignUpView";

export interface SignUpProps {
  component?: React.ComponentType<SignUpViewProps>;
  error?: string;
  signUp?(username: string, password: string, email: string): void;
  navigateToLogin?(): void;
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

  setUsername = (event: React.ChangeEvent<HTMLInputElement>): void => {
    this.setState({ username: event.target.value });
  };

  setEmail = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ email: event.target.value });

  setPassword = (event: React.ChangeEvent<HTMLInputElement>): void =>
    this.setState({ password: event.target.value });

  signUp = (): void => {
    this.props.signUp(
      this.state.username,
      this.state.password,
      this.state.email
    );
  };

  render(): React.ReactNode {
    const props = {
      error: this.props.error,
      signUp: this.signUp,
      navigateToLogin: this.props.navigateToLogin,
      email: this.state.email,
      setEmail: this.setEmail,
      username: this.state.username,
      setUsername: this.setUsername,
      password: this.state.password,
      setPassword: this.setPassword,
    };

    return React.createElement(this.props.component, props);
  }
}
