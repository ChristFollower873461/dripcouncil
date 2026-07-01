# Drip Council Observability Bridge

Drip Council reports and traces are local text only. The site does not connect to Langfuse, Braintrust, OpenAI, OpenTelemetry, or any other service.

## Local Shapes

- `drip_council_observation_report_v2`
- `drip_trace_v1`
- `drip_policy_score_v1`
- `drip_council_span_timeline_v1`
- `langfuse_like_trace_export_v2`
- `braintrust_like_eval_export_v2`
- `openai_agents_sdk_like_run_export_v2`

## Trace Span Types

- `task`
- `navigation`
- `observation`
- `tool_choice`
- `policy_check`
- `recovery`
- `handoff`
- `final_report`

## Safety Rules

- No private data.
- No secrets or keys.
- No payment details.
- No hidden chain-of-thought.
- No claim that logging or submission happened.
- Humans decide what, if anything, gets copied into external tools.
