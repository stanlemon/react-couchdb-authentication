import * as React from "react";

interface Props {
  error: string;
  username: string;
  setUsername(event: React.FormEvent<HTMLInputElement>): void;
  password: string;
  setPassword(event: React.FormEvent<HTMLInputElement>): void;
  email: string;
  setEmail(event: React.FormEvent<HTMLInputElement>): void;
  signUp(): void;
  navigateToLogin(): void;
}

export function SignUp(props: Props): JSX.Element {
  return (
    <div>
      {props.error && <div id="error">{props.error}</div>}
      <label>Username</label>
      <input
        id="username"
        type="text"
        value={props.username}
        onChange={props.setUsername}
      />
      <label>Email</label>
      <input
        id="email"
        type="text"
        value={props.email}
        onChange={props.setEmail}
      />
      <label>Password</label>
      <input
        id="password"
        type="password"
        value={props.password}
        onChange={props.setPassword}
      />
      <button id="sign-up-button" onClick={props.signUp}>
        Sign Up
      </button>
      <button id="navigate-to-login" onClick={props.navigateToLogin}>
        Return to login
      </button>
    </div>
  );
}
