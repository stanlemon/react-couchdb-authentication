import * as React from "react";

export function Login(props: { error: string }): JSX.Element {
  return (
    <div>
      {props.error && <div id="error">{props.error}</div>}
      <input
        id="username"
        type="text"
        value={props.username}
        onChange={props.setUsername}
      />
      <input
        id="password"
        type="password"
        value={props.password}
        onChange={props.setPassword}
      />
      <button id="login-button" onClick={props.login}>
        Login
      </button>
      <button id="navigate-to-sign-up" onClick={props.navigateToSignup}>
        Click here to sign up!
      </button>
    </div>
  );
}
