import type { SentinelConfig } from "./schema";

export const mockConfig: SentinelConfig = {
  refresh_interval_seconds: 30,
  targets: [
    {
      key: "analytics-prod",
      display_name: "Analytics Production",
      project_id: "my-gcp-project",
      location: "europe-west1",
      repository: "analytics-prod",
    },
    {
      key: "marketing-attribution",
      display_name: "Marketing Attribution",
      project_id: "my-gcp-project",
      location: "us-central1",
      repository: "marketing-attribution",
    },
    {
      key: "finance-reporting",
      display_name: "Finance Reporting",
      project_id: "finance-gcp",
      location: "europe-west1",
      repository: "finance-reporting",
    },
    {
      key: "product-events",
      display_name: "Product Events",
      project_id: "my-gcp-project",
      location: "us-east4",
      repository: "product-events",
    },
    {
      key: "growth-experiments",
      display_name: "Growth Experiments",
      project_id: "growth-gcp",
      location: "europe-west4",
      repository: "growth-experiments",
    },
    {
      key: "ml-feature-store",
      display_name: "ML Feature Store",
      project_id: "ml-gcp",
      location: "us-central1",
      repository: "ml-feature-store",
    },
  ],
};
