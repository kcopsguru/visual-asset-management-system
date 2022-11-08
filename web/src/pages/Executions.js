import React from "react";
import { useNavigate, useParams } from "react-router";
import { fetchWorkflows } from "../services/APIService";
import { WorkflowListDefinition } from "../components/list/list-definitions/WorkflowListDefinition";
import ListPage from "./ListPage";

export default function Workflows(props) {
  const { databaseId } = useParams();
  const navigate = useNavigate();
  const createNewWorkflow = () => {
    if (databaseId) {
      navigate(`/databases/${databaseId}/workflows/create`);
    } else {
      navigate(`/workflows/create`);
    }
  };

  return (
    <ListPage
      singularName={"workflow"}
      singularNameTitleCase={"Workflow"}
      pluralName={"workflows"}
      pluralNameTitleCase={"Workflows"}
      listDefinition={WorkflowListDefinition}
      fetchElements={fetchWorkflows}
      onCreateCallback={createNewWorkflow}
    />
  );
}
