/* eslint-disable max-lines-per-function */
import React from "react";
import PouchDB from "pouchdb";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import { Authentication, Login, SignUp, withAuthentication } from "../";
import fetch from "isomorphic-fetch";

// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require("pouchdb-adapter-node-websql"));

const couchDbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";

describe("<Authentication />", () => {
  it("Throws an error when a database is not specified", () => {
    const t = (): void => {
      render(
        <Authentication
          localDbName=":memory:"
          adapter="websql"
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
    render(
      <Authentication
        localDbName=":memory:"
        adapter="websql"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // Initially the component shows a loading, it has to make a credentials call next
    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("Component renders <Login /> after loading", async () => {
    render(
      <Authentication
        localDbName=":memory:"
        adapter="websql"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).toBeNull(); // it doesn't exist
    });

    // Check that our login form is on the page
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("Component renders <Signup /> when navigated to", async () => {
    render(
      <Authentication
        localDbName=":memory:"
        adapter="websql"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).toBeNull(); // it doesn't exist
    });

    // On login screen, navigate to signup
    fireEvent.click(screen.getByTestId("navigate-to-sign-up"));

    // Check that our signup form is on the page
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Email")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument();
  });

  it("Can submit <Signup />, but errors out with empty data", async () => {
    render(
      <Authentication
        localDbName=":memory:"
        adapter="websql"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).toBeNull(); // it doesn't exist
    });

    // On login screen, navigate to signup
    fireEvent.click(screen.getByTestId("navigate-to-sign-up"));

    // Check that our signup form is on the page
    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    expect(signUpButton).toBeInTheDocument();

    // Form is empty, submitting it should yield errors
    fireEvent.click(signUpButton);

    expect(
      screen.getByText("Username, password and email are required fields.")
    ).toBeInTheDocument();
  });
});

const checkCouchDb = async () => {
  try {
    await fetch(couchDbUrl);
    return true;
  } catch (e) {
    return false;
  }
};

describe("<Authentication /> with CouchDB instance", () => {
  // This is a full end to end test
  it("Can submit <Signup />, create user doc, logout and then <Login />", async () => {
    const isCouchDbUp = await checkCouchDb();
    if (!isCouchDbUp) {
      /* eslint-disable no-console */
      console.log(
        "Skipping the end to end test because I do not have a CouchDB instance to work with."
      );
      return;
    }

    const username = "test" + Date.now();
    const password = "password";
    const email = "email@example.com";

    const App = withAuthentication(
      ({ user, logout }): React.ReactElement => (
        <>
          <h1>Authenticated</h1>
          <h2>Hello {user.name}</h2>
          <a data-testid="logout" href="#" onClick={logout}>
            Click to logout
          </a>
        </>
      )
    );

    render(
      <Authentication
        debug={false}
        localDbName=":memory:"
        adapter="websql"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      >
        <App />
      </Authentication>
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).toBeNull(); // it doesn't exist
    });

    // On login screen, navigate to signup
    fireEvent.click(screen.getByTestId("navigate-to-sign-up"));

    // Check that our signup form is on the page
    const signUpButton = screen.getByRole("button", { name: "Sign Up" });
    expect(signUpButton).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Username"), {
      target: {
        value: username,
      },
    });

    // Fill in email
    fireEvent.change(screen.getByLabelText("Email"), {
      target: {
        value: email,
      },
    });

    // Fill in password
    fireEvent.change(screen.getByLabelText("Password"), {
      target: {
        value: password,
      },
    });

    // Submit the form
    fireEvent.click(signUpButton);

    await waitFor(() => {
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });

    expect(screen.getByText("Hello " + username)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId("logout"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Username"), {
      target: {
        value: username,
      },
    });

    // Fill in password
    fireEvent.change(screen.getByLabelText("Password"), {
      target: {
        value: password,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "Login" }));

    await waitFor(() => {
      expect(screen.getByText("Authenticated")).toBeInTheDocument();
    });

    // Now we need to cleanup the user that we created
    const userUrl =
      couchDbUrl.substring(0, 7) +
      username +
      ":" +
      password +
      "@" +
      couchDbUrl.substring(7) +
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
