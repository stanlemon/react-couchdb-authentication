/* eslint-disable max-lines-per-function */
import React from "react";
import { shallow, mount } from "enzyme";
import express from "express";
import PouchDB from "pouchdb";
import nano from "nano";
import ExpressPouchDB from "express-pouchdb";
import waitForExpect from "wait-for-expect";
import _ from "lodash";
import { Authentication } from "./Authentication";
import { LoginContainer, Login, SignUpContainer, SignUp } from "./components";

const TestPouchDB = PouchDB.defaults({
  adapter: "memory"
});

PouchDB.plugin(require("pouchdb-adapter-memory"));

// Visual components for use in tests
const LoginComponent = props => <LoginContainer {...props} component={Login} />;
const SignUpComponent = props => (
  <SignUpContainer {...props} component={SignUp} />
);
const LoadingComponent = () => <div>Loading...</div>;

describe("<Authentication />", () => {
  const app = express();
  let server;

  beforeAll(async done => {
    app.use(
      "/db",
      ExpressPouchDB(TestPouchDB, {
        logPath: "/tmp/pouchdb.log"
      })
    );

    server = app.listen(3131, () => {
      // Create the main database that we'll use for our connection
      const mainDB = new TestPouchDB("main");

      done();
    });
  });

  afterAll(done => {
    server.close(() => {
      setTimeout(() => done(), 10000);
    });
  });

  it("Throws an error when a database is not specified", () => {
    const t = () => {
      shallow(
        <Authentication
          localDatabase="test"
          localAdapter="memory"
          // An empty URL should yield an error
          url=""
          loading={<LoadingComponent />}
          login={<LoginComponent />}
          signup={<SignUpComponent />}
        />
      );
    };

    expect(t).toThrow(Error);
  });

  it("Component has <Loading /> when initialized", async done => {
    const component = shallow(
      <Authentication
        localDatabase="test"
        localAdapter="memory"
        url="http://localhost:3131/db/main"
        loading={<LoadingComponent />}
        login={<LoginComponent />}
        signup={<SignUpComponent />}
      />
    );

    // Initially the component shows a loading, it has to make a credentials call next
    expect(component.containsMatchingElement(<LoadingComponent />)).toBe(true);

    done();
  });

  it("Component renders <Login /> after loading", async done => {
    const component = shallow(
      <Authentication
        localDatabase="test"
        localAdapter="memory"
        url="http://localhost:3131/db/main"
        loading={<LoadingComponent />}
        login={<LoginComponent />}
        signup={<SignUpComponent />}
      />
    );

    // Now check for the loaded state to change, this happens after communication with the remote
    // couchdb instance, which we are currently mocking with the pouchdb-server
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    expect(component.containsMatchingElement(<LoginComponent />)).toBe(true);

    done();
  });

  it("Component renders <Signup /> when navigated to", async done => {
    const component = shallow(
      <Authentication
        localDatabase="test"
        localAdapter="memory"
        url="http://localhost:3131/db/main"
        loading={<LoadingComponent />}
        login={<LoginComponent />}
        signup={<SignUpComponent />}
      />
    );

    // Now check for the loaded state to change
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    // Login component should have gotten a navigation method from the <Authentication /> component,
    // and calling it should advance to the signup screen
    component
      .find(LoginComponent)
      .props()
      .navigateToSignup();

    expect(component.containsMatchingElement(<SignUpComponent />)).toBe(true);

    done();
  });

  it("Can submit <Signup />, but errors out with empty data", async done => {
    const url = "http://localhost:3131/db/main";

    const component = mount(
      <Authentication
        localDatabase="test"
        localAdapter="memory"
        url={url}
        loading={<LoadingComponent />}
        login={<LoginComponent />}
        signup={<SignUpComponent />}
      />
    );

    // Now check for the loaded state to change
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    component.update();

    // Login component should have gotten a navigation method from the <Authentication /> component,
    // and calling it should advance to the signup screen
    component.find("#navigate-to-sign-up").simulate("click");

    component.find("#sign-up-button").simulate("click");

    // Check for our error state to get passed in
    await waitForExpect(() => {
      expect(component.state().error).not.toBe(null);
    });

    // Update the component
    component.update();

    expect(
      component
        .find("#error")
        .text()
        .trim()
    ).toBe("You must provide a username");

    done();
  });

  it("Can submit <Signup /> and creates user doc", async done => {
    const url = "http://localhost:3131/db/main";

    const username = "test";
    const password = "password";
    const email = "email@example.com";

    const component = mount(
      <Authentication
        maxUserDbRetries={2}
        userDbRetryInterval={100}
        localDatabase="test"
        localAdapter="memory"
        url={url}
        loading={<LoadingComponent />}
        login={<LoginComponent />}
        signup={<SignUpComponent />}
      />
    );

    // Now check for the loaded state to change
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    component.update();

    // Login component should have gotten a navigation method from the <Authentication /> component,
    // and calling it should advance to the signup screen
    component.find("#navigate-to-sign-up").simulate("click");

    component.update();

    // Fill in username
    component.find("#username").simulate("change", {
      target: {
        value: username
      }
    });

    // Fill in email
    component.find("#email").simulate("change", {
      target: {
        value: email
      }
    });

    // Fill in password
    component.find("#password").simulate("change", {
      target: {
        value: password
      }
    });

    component.find("#sign-up-button").simulate("click");

    // Now check for the loaded state to change
    // TODO: There needs to be a better way to do this
    await waitForExpect(() => {
      expect(component.state().internalRoute).toBe("login");
      expect(component.state().error).not.toBe(null);
    });

    // This should render the Login screen because the database doesn't exist yet
    component.update();

    expect(component.containsMatchingElement(<LoginComponent />)).toBe(true);

    const userDb = nano("http://127.0.0.1:3131/db/_users");

    const userDocs = await userDb.list({
      include_docs: true
    });
    // Get just the non-internal user docs
    const users = userDocs.rows
      .filter(d => d.id.substr(0, 1) !== "_")
      .map(d => d.doc);

    // Our user doc exists in the database!
    expect(_.find(users, _.matchesProperty("name", username))).not.toBe(null);

    done();
  });

  it("Can submit <Login />, but errors out with an invalid login", async done => {
    const component = mount(
      <Authentication
        localDatabase="test"
        localAdapter="memory"
        url="http://localhost:3131/db/main"
        loading={<LoadingComponent />}
        login={<LoginComponent />}
        signup={<SignUpComponent />}
      />
    );

    // Now check for the loaded state to change
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    // Login screen should appear now
    component.update();

    // Fill in a non-existent username
    component.find("#username").simulate("change", {
      target: {
        value: "foobar"
      }
    });

    component.find("#password").simulate("change", {
      target: {
        value: "password"
      }
    });

    // Click the login button
    component.find("#login-button").simulate("click");

    // PouchDB will talk to the server, but not be able to read the database
    // and thus return an error
    await waitForExpect(() => {
      expect(component.state().error).not.toBe(null);
    });

    // Update the component, we should have an error at this point
    component.update();

    expect(
      component
        .find("#error")
        .text()
        .trim()
    ).toBe("Invalid login");

    // Navigate to the sign up screen, this should clear out the error
    component.find("#navigate-to-sign-up").simulate("click");

    // Update the component
    component.update();

    // Switching to the login screen there should be no errors
    expect(component.find("#error").length).toBe(0);

    // Switch back to the login screen
    component.find("#navigate-to-login").simulate("click");

    // Update the component
    component.update();

    // There shouldn't be any errors on the login screen after navigating away and coming back
    expect(component.find("#error").length).toBe(0);

    done();
  });
});
