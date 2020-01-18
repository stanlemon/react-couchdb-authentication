import * as React from "react";

interface Props {
  component: React.ReactElement<{}>;
  error: string;
  signUp(username: string, password: string, email: string): void;
  navigateToLogin(): void;
}

export class SignUpContainer extends React.Component<Props> {
  state = {
    username: "",
    email: "",
    password: ""
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
      setPassword: this.setPassword
    };

    if (!React.isValidElement(this.props.component)) {
      return React.createElement(this.props.component, props);
    } else {
      return React.cloneElement(this.props.component, props);
    }
  }

  setUsername = (event: React.FormEvent<HTMLInputElement>): void =>
    this.setState({ username: event.currentTarget.value });

  setEmail = (event: React.FormEvent<HTMLInputElement>): void =>
    this.setState({ email: event.currentTarget.value });

  setPassword = (event: React.FormEvent<HTMLInputElement>): void =>
    this.setState({ password: event.currentTarget.value });

  signUp = (): void => {
    this.props.signUp(
      this.state.username,
      this.state.password,
      this.state.email
    );
  };
}
