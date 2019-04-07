import * as React from "react";

export class LoginContainer extends React.Component {
  state = {
    username: "",
    password: ""
  };

  render() {
    const props = {
      error: this.props.error,
      login: this.login,
      navigateToSignup: this.props.navigateToSignup,
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

  setUsername = event => this.setState({ username: event.target.value });

  setPassword = event => this.setState({ password: event.target.value });

  login = () => {
    console.log("Clicked login");
    this.props.login(this.state.username, this.state.password);
  };
}
