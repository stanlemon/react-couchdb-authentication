/**
 * @jest-environment jsdom
 */
/* eslint-disable max-lines-per-function */
import React from "react";
import PouchDB from "pouchdb";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
} from "@testing-library/react";
import "@testing-library/jest-dom";
import { Authentication, Login, SignUp } from "../";

if (!window.setImmediate) {
  // This is as gross as it looks. It's a workaround for using PouchDB in tests.
  window.setImmediate = window.setTimeout as unknown as typeof setImmediate;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
PouchDB.plugin(require("pouchdb-adapter-memory"));

const couchDbUrl = process.env.COUCHDB_URL || "http://localhost:5984/";

describe("<Authentication />", () => {
  it("Throws an error when a database is not specified", () => {
    const t = (): void => {
      render(
        <Authentication
          adapter="memory"
          // An empty URL should yield an error
          url=""
          login={<Login />}
          signup={<SignUp />}
        />
      );
    };

    expect(t).toThrow("A url to a couchdb instance is required");
  });

  it("Component has <Loading /> when initialized", async () => {
    render(
      <Authentication
        adapter="memory"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // Initially the component shows a loading, it has to make a credentials call next
    expect(screen.getByText("Loading...")).toBeInTheDocument();

    // After the page is loaded it should disappear.
    await waitForElementToBeRemoved(() => screen.queryByText("Loading..."));
  });

  it("Component renders <Login /> after loading", async () => {
    render(
      <Authentication
        adapter="memory"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).not.toBeInTheDocument(); // it doesn't exist
    });

    // Check that our login form is on the page
    expect(screen.getByLabelText("Username")).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Login" })).toBeInTheDocument();
  });

  it("Component renders <Signup /> when navigated to", async () => {
    render(
      <Authentication
        adapter="memory"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).not.toBeInTheDocument(); // it doesn't exist
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
        adapter="memory"
        url={couchDbUrl}
        login={<Login />}
        signup={<SignUp />}
      />
    );

    // This element is present before connecting to CouchDB and then should be removed.
    await waitFor(() => {
      const loading = screen.queryByText("Loading...");
      expect(loading).not.toBeInTheDocument(); // it doesn't exist
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
