import React from "react";
import ReactDOM from "react-dom";
import { Authentication } from "../../src";
import {
  LoginContainer,
  SignUpContainer,
  Login,
  SignUp
} from "../../src/components";

// Visual components for use in tests
const LoginComponent = props => <LoginContainer {...props} component={Login} />;
const SignUpComponent = props => (
  <SignUpContainer {...props} component={SignUp} />
);
const App = ({ logout, user }) => (
  <>
    <h1>Hello!</h1>
    <h2>This is an authenticated page, belonging to user {user.name}.</h2>
    <p>
      <a onClick={logout}>Click here to logout.</a>
    </p>
  </>
);

class Example extends React.Component {
  render() {
    return (
      <>
        <h1>CouchDB Application</h1>
        <div>
          If you are currently logged into Fauxton, or you haven't disabled the{" "}
          <em>
            <a href="https://guide.couchdb.org/draft/security.html">
              admin party
            </a>
          </em>{" "}
          it's likely this application won't behave correctly.
        </div>
        <br />
        <Authentication
          debug={true}
          url="http://localhost:5984/"
          login={<LoginComponent />}
          signup={<SignUpComponent />}
          loading={<div>Loading...</div>}
        >
          <App />
        </Authentication>
      </>
    );
  }
}

ReactDOM.render(<Example />, document.getElementById("root"));

if (module.hot) {
  module.hot.accept();
}
