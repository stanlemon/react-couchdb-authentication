import * as React from "react";

export interface SignUpViewProps {
  error: string;
  username: string;
  setUsername: (event: React.FormEvent<HTMLInputElement>) => void;
  password: string;
  setPassword: (event: React.FormEvent<HTMLInputElement>) => void;
  email: string;
  setEmail: (event: React.FormEvent<HTMLInputElement>) => void;
  signUp: () => void;
  navigateToLogin: () => void;
}

export function SignUpView(props: SignUpViewProps): React.ReactElement {
  const clickToLogin = (e: React.MouseEvent): void => {
    e.preventDefault();
    props.navigateToLogin();
  };

  return (
    <div>
      {props.error && <div className="error">{props.error}</div>}
      <p>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={props.username}
          onChange={props.setUsername}
        />
      </p>
      <p>
        <label htmlFor="email">Email</label>
        <input
          id="email"
          type="text"
          value={props.email}
          onChange={props.setEmail}
        />
      </p>
      <p>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={props.password}
          onChange={props.setPassword}
        />
      </p>
      <button id="sign-up-button" onClick={props.signUp}>
        Sign Up
      </button>
      <p>
        <a href="#" id="navigate-to-login" onClick={clickToLogin}>
          Return to login.
        </a>
      </p>
    </div>
  );
}
