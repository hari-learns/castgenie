export type RewardSpec = {
  id: string
  projectId: string
  objectives: Array<{
    id: string
    label: string
    baseReward: number
    validityChecks: string[]
    clusterKey: "exact" | "concept_overlap" | "format_and_concept" | "llm_optional"
    divideRewardByValidClusterSize: boolean
  }>
  invalidOutputReward: 0
}
