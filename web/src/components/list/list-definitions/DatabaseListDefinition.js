import React from "react";
import ListDefinition from "./types/ListDefinition";
import { Link } from "@awsui/components-react";
import ColumnDefinition from "./types/ColumnDefinition";

export const DatabaseListDefinition = new ListDefinition({
  pluralName: "databases",
  pluralNameTitleCase: "Databases",
  visibleColumns: ["databaseId", "description", "assetCount"],
  filterColumns: [
    { name: "databaseId", placeholder: "Name" },
    { name: "assetCount", placeholder: "Asset Count" },
  ],
  elementId: "databaseId",
  deleteRoute: "databases/{databaseId}",
  columnDefinitions: [
    new ColumnDefinition({
      id: "databaseId",
      header: "Name",
      cellWrapper: (props) => {
        const { item } = props;
        return (
          <Link href={`/databases/${item.databaseId}/assets/`}>
            {props.children}
          </Link>
        );
      },
      sortingField: "databaseId",
    }),
    new ColumnDefinition({
      id: "description",
      header: "Description",
      cellWrapper: (props) => <>{props.children}</>,
      sortingField: "description",
    }),
    new ColumnDefinition({
      id: "assetCount",
      header: "Asset Count",
      cellWrapper: (props) => <>{props.children}</>,
      sortingField: "assetCount",
    }),
  ],
});
