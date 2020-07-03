/* eslint-disable max-lines-per-function */
import React from "react";
import { shallow, mount } from "enzyme";
import PouchDB from "pouchdb";
import waitForExpect from "wait-for-expect";
import { Authentication } from "./Authentication";
import { Login, SignUp } from "./components";
import fetch from "isomorphic-fetch";

// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require("pouchdb-adapter-memory"));

describe("<Authentication />", () => {
  const coudbUrl = process.env.COUCHDB_URL || "http://127.0.0.1:5984/";

  it("Throws an error when a database is not specified", () => {
    const t = (): void => {
      shallow(
        <Authentication
          adapter="memory"
          // An empty URL should yield an error
          url=""
          login={<Login />}
          signup={<SignUp />}
        />
      );
    };

    expect(t).toThrow(Error);
  });

  it("Component has <Loading /> when initialized", async () => {
    const component = shallow(
      <Authentication
        adapter="memory"
        url={coudbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // Initially the component shows a loading, it has to make a credentials call next
    expect(component.text()).toBe("Loading...");
  });

  it("Component renders <Login /> after loading", async () => {
    const component = shallow(
      <Authentication
        adapter="memory"
        url={coudbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // Now check for the loaded state to change, this happens after communication with the remote
    // couchdb instance, which we are currently mocking with the pouchdb-server
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    expect(component.containsMatchingElement(<Login />)).toBe(true);
  });

  it("Component renders <Signup /> when navigated to", async () => {
    const component = shallow(
      <Authentication
        adapter="memory"
        url={coudbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // Now check for the loaded state to change
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    // Login component should have gotten a navigation method from the <Authentication /> component,
    // and calling it should advance to the signup screen
    component.find(Login).props().navigateToSignUp();

    expect(component.containsMatchingElement(<SignUp />)).toBe(true);
  });

  it("Can submit <Signup />, but errors out with empty data", async () => {
    const component = mount(
      <Authentication
        adapter="memory"
        url={coudbUrl}
        login={<Login />}
        signup={<SignUp />}
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

    expect(component.find(".error").text().trim()).toBe(
      "Username, password and email are required fields."
    );
  });

  // This is a full end to end test
  it("Can submit <Signup />, create user doc, logout and then <Login />", async () => {
    const username = "test" + Date.now();
    const password = "password";
    const email = "email@example.com";

    const App = ({
      user,
      logout,
    }: {
      user?: { name: string };
      logout?: () => void;
    }): React.ReactElement => (
      <>
        <h1>Authenticated</h1>
        <h2>Hello {user.name}</h2>
        <a id="logout" href="#" onClick={logout}>
          Click to logout
        </a>
      </>
    );

    const component = mount(
      <Authentication
        debug={false}
        adapter="memory"
        url={coudbUrl}
        login={<Login />}
        signup={<SignUp />}
      >
        <App />
      </Authentication>
    );

    expect(component.state().internalRoute).toBe("login");

    // Now check for the loaded state to change
    await waitForExpect(() => {
      expect(component.state().loaded).toBe(true);
    });

    component.update();

    // Login component should have gotten a navigation method from the <Authentication /> component,
    // and calling it should advance to the signup screen
    component.find("#navigate-to-sign-up").simulate("click");

    await waitForExpect(() => {
      expect(component.state().internalRoute).toBe("signup");
    });

    component.update();

    // Fill in username
    component.find("#username").simulate("change", {
      target: {
        value: username,
      },
    });

    // Fill in email
    component.find("#email").simulate("change", {
      target: {
        value: email,
      },
    });

    // Fill in password
    component.find("#password").simulate("change", {
      target: {
        value: password,
      },
    });

    component.find("#sign-up-button").simulate("click");

    await waitForExpect(() => {
      component.update();

      console.log(component.debug());

      expect(component.find("h1").text()).toBe("Authenticated");
      expect(component.find("h2").text()).toBe("Hello " + username);
    });

    component.find("#logout").simulate("click");

    await waitForExpect(() => {
      expect(component.state().user).toBe(null);
      expect(component.state().authenticated).toBe(false);
    });

    component.update();

    // Fill in username
    component.find("#username").simulate("change", {
      target: {
        value: username,
      },
    });

    // Fill in password
    component.find("#password").simulate("change", {
      target: {
        value: password,
      },
    });

    component.find("#login-button").simulate("click");

    // User was able to login
    await waitForExpect(() => {
      expect(component.state().user.name).toBe(username);
    });

    await component.unmount();

    // Now we need to cleanup the user that we created
    const userUrl =
      coudbUrl.substring(0, 7) +
      username +
      ":" +
      password +
      "@" +
      coudbUrl.substring(7) +
      "_users/org.couchdb.user:" +
      username;

    const user = await fetch(userUrl).then((r) => r.json());

    const done = await fetch(userUrl + "?rev=" + user._rev, {
      method: "DELETE",
    }).then((r) => r.json());

    // We successfully delete the user that we created
    expect(done.ok).toBe(true);
  });
});
