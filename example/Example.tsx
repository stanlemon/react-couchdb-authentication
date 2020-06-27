import React from "react";
import ReactDOM from "react-dom";
import PropTypes from "prop-types";
import { Authentication } from "../src";
import { Login, SignUp } from "../src/components";

// Our application when a user is logged in.
function App({ logout, user }) {
  return (
    <>
      <h1>Hello!</h1>
      <h2>This is an authenticated page, belonging to user {user.name}.</h2>
      <p>
        <a onClick={logout}>Click here to logout.</a>
      </p>
    </>
  );
}

App.propTypes = {
  logout: PropTypes.func,
  user: PropTypes.shape({
    name: PropTypes.string,
  }),
};

class Example extends React.Component {
  render() {
    return (
      <>
        <h1>CouchDB Application</h1>
        <div>
          If you are currently logged into Fauxton, or you have not disabled the{" "}
          <em>
            <a href="https://guide.couchdb.org/draft/security.html">
              admin party
            </a>
          </em>{" "}
          it is likely this application will not behave correctly.
        </div>
        <br />
        <Authentication
          debug={true}
          url="http://localhost:5984/"
          login={<Login />}
          signup={<SignUp />}
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
