export type SourcePlan = {
  id: string
  projectId: string
  requiredSourceKinds: Array<
    | "synthetic_seed"
    | "wire_neurons_json"
    | "local_folder"
    | "uploaded_file"
    | "web_search"
    | "web_scrape"
    | "codebase"
  >
  permissionAssumptions: string[]
  strategy:
    | "mock_seed"
    | "fixture_import"
    | "upload_first"
    | "search_first"
    | "codebase_import"
  fallbackStrategy: string
}

export type TrainingPlan = {
  id: string
  projectId: string
  ragFirst: boolean
  datasetTypes: string[]
  evalObjectives: string[]
  rewardObjectives: string[]
  castformTarget: "workspace_export" | "training_run" | "hosted_model"
}
