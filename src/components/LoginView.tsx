import * as React from "react";

export interface LoginViewProps {
  error: string;
  username: string;
  setUsername: (event: React.FormEvent<HTMLInputElement>) => void;
  password: string;
  setPassword: (event: React.FormEvent<HTMLInputElement>) => void;
  login: () => void;
  navigateToSignUp: () => void;
}

export function LoginView(props: LoginViewProps): React.ReactElement {
  const clickToSignUp = (e: React.MouseEvent): void => {
    e.preventDefault();
    props.navigateToSignUp();
  };

  const hitEnter = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    // Submit the form if they hit enter
    if (e.key.toLowerCase() === "enter") {
      props.login();
    }
  };

  return (
    <div>
      {props.error && <p className="error">{props.error}</p>}
      <p>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          type="text"
          value={props.username}
          onChange={props.setUsername}
          onKeyPress={hitEnter}
        />
      </p>
      <p>
        <label htmlFor="password">Password</label>
        <input
          id="password"
          type="password"
          value={props.password}
          onChange={props.setPassword}
          onKeyPress={hitEnter}
        />
      </p>

      <button id="login-button" onClick={props.login}>
        Login
      </button>
      <p>
        <a href="#" data-testid="navigate-to-sign-up" onClick={clickToSignUp}>
          Or sign up for a new account.
        </a>
      </p>
    </div>
  );
}
