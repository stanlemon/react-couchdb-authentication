import * as React from "react";

interface Props {
  component: React.ReactElement<{}>;
  error: string;
  login(username: string, password: string): void;
  navigateToSignUp(): void;
}

export class LoginContainer extends React.Component<Props> {
  state = {
    username: "",
    password: ""
  };

  render(): React.ReactNode {
    const props = {
      error: this.props.error,
      login: this.login,
      navigateToSignUp: this.props.navigateToSignUp,
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

  setPassword = (event: React.FormEvent<HTMLInputElement>): void =>
    this.setState({ password: event.currentTarget.value });

  login = (): void => {
    console.log("Clicked login");
    this.props.login(this.state.username, this.state.password);
  };
}
