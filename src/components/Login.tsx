import * as React from "react";

interface Props {
  error: string;
  username: string;
  setUsername(event: React.FormEvent<HTMLInputElement>): void;
  password: string;
  setPassword(event: React.FormEvent<HTMLInputElement>): void;
  login(): void;
  navigateToSignUp(): void;
}

export function Login(props: Props): JSX.Element {
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
        onKeyPress={(e): void => {
          // Submit the form if they hit enter
          if (e.key === "enter") {
            props.login();
          }
        }}
      />
      <button id="login-button" onClick={props.login}>
        Login
      </button>
      <button id="navigate-to-sign-up" onClick={props.navigateToSignUp}>
        Click here to sign up!
      </button>
    </div>
  );
}
