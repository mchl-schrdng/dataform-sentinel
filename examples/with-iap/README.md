# Example: Cloud Run + HTTPS Load Balancer + IAP

This stacks a global HTTPS load balancer with Identity-Aware Proxy (IAP) in front of the Cloud Run service created by the root Terraform module.

## Apply order

1. Deploy the core service first from `../../terraform/`.
2. Point your DNS A record for `your.domain.example.com` at the LB IP outputted here.
3. `terraform apply` from this directory.

## Usage

```bash
cd examples/with-iap
terraform init
terraform apply \
  -var project_id=my-project \
  -var region=europe-west1 \
  -var service_name=dataform-sentinel \
  -var domain=sentinel.mycompany.example \
  -var iap_support_email=platform@mycompany.example \
  -var 'iap_members=["group:data-platform@mycompany.example"]'
```

> The managed SSL certificate needs DNS to resolve before it provisions. Expect a 10–40 minute wait after applying.

Important: when using IAP, keep the Cloud Run service's `ingress` set to `INGRESS_TRAFFIC_ALL` (or internal-and-cloud-load-balancing) so the LB can reach it. Either tweak the root module's `ingress` variable or use a separate revision for this example.
