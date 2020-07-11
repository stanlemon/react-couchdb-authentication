import React from "react";
import ReactDOM from "react-dom";
import { Authentication, withAuthentication } from "../src";

// Our application when a user is logged in.
const App = withAuthentication(
  ({
    user,
    logout,
  }: {
    user?: { name: string; email: string };
    logout?: () => void;
  }): React.ReactElement => (
    <>
      <h1>Hello!</h1>
      <h2>
        This is an authenticated page, belonging to user{" "}
        <a href={`mailto:${user.email}`}>{user.name}</a>.
      </h2>
      <p>
        <a onClick={logout}>Click here to logout.</a>
      </p>
    </>
  )
);

function Example() {
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
        // Logs additional information to the browser console
        debug={true}
        // Run everything a little faster, for testing
        sessionInterval={3000}
        // The example app is accessed on localhost, so this is helpful testing cross-origin shenanigans
        url="http://localhost:5984/"
      >
        <App />
      </Authentication>
    </>
  );
}

ReactDOM.render(<Example />, document.getElementById("root"));

if (module.hot) {
  module.hot.accept();
}
