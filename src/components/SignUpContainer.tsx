import * as React from "react";

export class SignUpContainer extends React.Component {
  state = {
    username: "",
    email: "",
    password: ""
  };

  render() {
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

  setUsername = event => this.setState({ username: event.target.value });

  setEmail = event => this.setState({ email: event.target.value });

  setPassword = event => this.setState({ password: event.target.value });

  signUp = () => {
    console.log("Clicked sign up");
    this.props.signUp(
      this.state.username,
      this.state.password,
      this.state.email
    );
  };
}
