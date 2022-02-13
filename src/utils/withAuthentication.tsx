import * as React from "react";
import { Context } from "../";

type Props = {
  db: PouchDB.Database;
  remoteDb: PouchDB.Database;
  logout(): void;
  user: { name: string; email: string };
};

//): React.FunctionComponent<Omit<P, "putDocument"> & PassThruDocumentProps> {

export function withAuthentication(component: React.ComponentType<Props>) {
  return () => (
    <Context.Consumer>
      {({ db, remoteDb, logout, user }) =>
        React.createElement(component, { db, remoteDb, logout, user } as Props)
      }
    </Context.Consumer>
  );
}
