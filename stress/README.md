# BookingTrack Stress Testing Suite & Performance Verification Primitives

Production-grade stress testing primitives built on **k6**, **k6-operator**, and **Prometheus/Grafana** for validating BookingTrack's multi-tenant architecture under high-concurrency loads (Phase A: 1,000 VUs, Phase B: 3,000 VUs, Phase C: 5,000 VUs).

---

## 1. Directory Structure

```text
stress/
├── seed-stress-data.mjs        # Database seeder for 1,000–5,000 VU benchmark partitions
├── suite-orchestrator.js       # Master sequential runner (Phase A -> Phase B -> Phase C)
├── k6-operator-crds.yaml       # Kubernetes distributed k6 Custom Resources & HPA manifests
├── prometheus-alerts-abort.yaml# Prometheus alerting tripwires for automatic test abort
└── scenarios/
    ├── 01-concurrent-login.js     # Scenario 1: Concurrent login & bcrypt CPU stress
    ├── 02-dashboard-load.js       # Scenario 2: High-rate business portal queries
    ├── 03-sse-connection-stress.js# Scenario 3: 5,000 persistent SSE streams (/api/events)
    ├── 04-database-query-stress.js# Scenario 4: Atomic transactions & double-booking races
    └── 05-api-health-check.js     # Scenario 5: K8s probes & Prometheus scraping under load
```

---

## 2. Quick Execution Guide

### Step 1: Seed Test Data Partition
```bash
# Seed 5,000 Virtual Users, 100 benchmark providers, and 8,000 time slots
node stress/seed-stress-data.mjs 5000
```

### Step 2: Execute Scenarios Locally with k6
```bash
# Run individual scenarios
k6 run -e TARGET_URL=http://localhost:4005 stress/scenarios/01-concurrent-login.js
k6 run -e TARGET_URL=http://localhost:4005 stress/scenarios/02-dashboard-load.js
k6 run -e TARGET_URL=http://localhost:4005 stress/scenarios/03-sse-connection-stress.js
k6 run -e TARGET_URL=http://localhost:4005 stress/scenarios/04-database-query-stress.js
k6 run -e TARGET_URL=http://localhost:4005 stress/scenarios/05-api-health-check.js

# Or run the full sequential multi-phase suite
k6 run -e TARGET_URL=http://localhost:4005 stress/suite-orchestrator.js
```

### Step 3: Distributed Execution on Kubernetes via k6-operator
```bash
# 1. Apply k6 ConfigMap
kubectl create configmap k6-orchestrator-script \
  --from-file=suite-orchestrator.js=stress/suite-orchestrator.js \
  -n load-testing

# 2. Deploy HPA and Phase C Distributed Runners (2 worker pods, 2,500 VUs each)
kubectl apply -f stress/k6-operator-crds.yaml
```

---

## 3. Immediate Abort Kill-Switches (Fail-Fast Tripwires)

The suite will immediately terminate if any of the following boundaries are breached:
1. **Memory (RAM)**: Host/Pod memory > 90% or Swap/Page File usage active.
2. **Disk (I/O)**: Queue length > 2 or disk active time reaches 100%.
3. **CPU Utilization**: CPU > 95% combined with elevated wait time (`%iowait > 15%`).
4. **Error Rate**: Failed requests (`http_req_failed`) exceed 5% (aborts after 10s evaluation window).
5. **Latency Degradation**: 99th percentile response time (`p99`) exceeds 3,000ms.
