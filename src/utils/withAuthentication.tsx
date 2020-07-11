import * as React from "react";
import { Context } from "../";

type Props = {
  db: PouchDB.Database;
  remoteDb: PouchDB.Database;
  logout(): void;
  user: { name: string; email: string };
};

export function withAuthentication(component: React.ComponentType<Props>) {
  return (): React.ReactElement => (
    <Context.Consumer>
      {(props: Props) => React.createElement(component, props)}
    </Context.Consumer>
  );
}
